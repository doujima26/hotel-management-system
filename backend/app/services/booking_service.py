import secrets
from datetime import date, datetime, time, timedelta, timezone
from decimal import ROUND_CEILING, Decimal
from urllib.parse import parse_qs, urlencode, urlparse

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import BookingStatus, DiscountType, HotelStatus, PaymentMethod, PaymentStatus, UserRole
from app.core.timeutils import business_today
from app.models.entities import Booking, BookingRoom, BookingService, Payment, Promotion, User
from app.repositories.booking_repository import (
    create_booking_record,
    create_booking_room_record,
    create_booking_service_record,
    get_booked_quantity_for_room_type,
    get_booking_by_id,
    get_booking_by_id_for_update,
    list_booking_rooms,
    list_booking_services,
    list_bookings_by_hotel,
    list_bookings_by_user,
    list_expired_unpaid_bookings,
)
from app.repositories.hotel_repository import get_hotel_by_id, get_hotel_service_by_id, get_promotion_by_id_for_update
from app.repositories.payment_repository import get_invoice_by_booking_id, get_payment_by_booking_id
from app.repositories.room_repository import (
    count_sellable_rooms_for_dates,
    get_room_type_by_id,
    get_room_type_by_id_for_update,
)
from app.repositories.user_repository import get_user_by_id
from app.schemas.bookings import (
    BankTransferResponse,
    BookingResponse,
    BookingRoomItem,
    BookingRoomResponse,
    BookingServiceResponse,
    CancelBookingRequest,
    CheckoutRequest,
    CheckoutResponse,
    CreateBookingRequest,
)
from app.schemas.payments import InvoiceResponse, PaymentResponse
from app.services.email_service import queue_email, send_booking_confirmed
from app.services.hotel_service import get_operating_admin_hotel, get_operational_hotel
from app.services.payment_service import build_payment_with_invoice
from app.services.pricing_service import resolve_stay_total

# So gio toi thieu truoc gio nhan phong (00:00 ngay check_in_date) de duoc huy mien phi.
_MIN_HOURS_BEFORE_CHECKIN_TO_CANCEL = 24

# Cac trang thai booking con duoc phep huy.
_CANCELLABLE_STATUSES = (BookingStatus.PENDING, BookingStatus.CONFIRMED)




# Bang chu cai sinh ma booking: bo 0/O va 1/I vi khach doi khi phai tu go lai ma
# vao noi dung chuyen khoan thay vi quet QR.
_BOOKING_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
_BOOKING_CODE_LENGTH = 8


# Sinh ma booking dang BK + 8 ky tu ngau nhien (vi du BKA3F92C7K). Ma nay dong
# thoi la ma thanh toan dat trong noi dung chuyen khoan de SePay boc tach ra,
# nen phai dung dinh dang da cau hinh ben SePay: tien to chu + hau to chu/so,
# khong dau gach ngang. Dung ky tu ngau nhien thay vi ngay thang + so tang dan
# de khong ai doan duoc ma don cua nguoi khac.
def _generate_booking_code() -> str:
    suffix = "".join(secrets.choice(_BOOKING_CODE_ALPHABET) for _ in range(_BOOKING_CODE_LENGTH))
    return f"BK{suffix}"


# Chuyen booking va cac dong phong thanh du lieu tra ve - tu lay them thong tin
# khach hang, ten loai phong va trang thai thanh toan (khong co san tren cac
# entity duoc truyen vao) de FE hien day du thong tin tren 1 booking.
def serialize_booking(
    db: Session,
    booking: Booking,
    rooms: list[BookingRoom],
    services: list[tuple[BookingService, str]] | None = None,
) -> dict:
    customer = get_user_by_id(db, booking.user_id)
    payment = get_payment_by_booking_id(db, booking.id)
    hotel = get_hotel_by_id(db, booking.hotel_id)

    room_responses = []
    for room in rooms:
        room_type = get_room_type_by_id(db, room.room_type_id)
        room_responses.append(
            BookingRoomResponse(
                id=room.id,
                room_type_id=room.room_type_id,
                room_type_name=room_type.name if room_type else "",
                quantity=room.quantity,
                price_per_night=float(room.price_per_night),
                num_nights=room.num_nights,
                subtotal=float(room.subtotal),
            )
        )

    return BookingResponse(
        id=booking.id,
        booking_code=booking.booking_code,
        hotel_id=booking.hotel_id,
        hotel_name=hotel.name if hotel else "",
        hotel_address=hotel.address if hotel else "",
        hotel_city=hotel.city if hotel else "",
        hotel_phone=hotel.phone if hotel else None,
        customer_name=customer.full_name if customer else "",
        customer_email=customer.email if customer else "",
        customer_phone=customer.phone if customer else None,
        check_in_date=booking.check_in_date,
        check_out_date=booking.check_out_date,
        num_guests=booking.num_guests,
        total_room_price=float(booking.total_room_price),
        total_service_price=float(booking.total_service_price),
        discount_amount=float(booking.discount_amount),
        promotion_id=booking.promotion_id,
        total_amount=float(booking.total_amount),
        status=booking.status,
        payment_status=payment.payment_status if payment else None,
        payment_method=payment.payment_method if payment else None,
        special_requests=booking.special_requests,
        cancellation_reason=booking.cancellation_reason,
        cancelled_at=booking.cancelled_at,
        rooms=room_responses,
        services=[
            BookingServiceResponse(
                service_id=service.service_id,
                name=name,
                quantity=service.quantity,
                unit_price=float(service.unit_price),
                subtotal=float(service.subtotal),
            )
            for service, name in (services or [])
        ],
    ).model_dump(mode="json")


# Kiem tra va tinh muc giam gia tu 1 khuyen mai, khoa row de tranh vuot
# usage_limit khi nhieu booking dung chung khuyen mai cung luc.
def _apply_promotion(
    db: Session, hotel_id: int, promotion_id: int, total_room_price: float, today: date
) -> tuple[Promotion, float]:
    promotion = get_promotion_by_id_for_update(db, promotion_id)
    if not promotion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khuyen mai khong ton tai")
    if promotion.hotel_id != hotel_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khuyen mai khong thuoc khach san nay")
    if not promotion.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Khuyen mai da bi tat")
    if today < promotion.start_date or today > promotion.end_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Khuyen mai khong con hieu luc")
    if promotion.usage_limit is not None and promotion.used_count >= promotion.usage_limit:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Khuyen mai da het luot su dung")
    if promotion.min_booking_amount is not None and total_room_price < float(promotion.min_booking_amount):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Don hang toi thieu {float(promotion.min_booking_amount)} moi duoc ap dung khuyen mai nay",
        )

    if promotion.discount_type == DiscountType.PERCENTAGE:
        discount_amount = total_room_price * float(promotion.discount_value) / 100
    else:
        discount_amount = float(promotion.discount_value)

    if promotion.max_discount_amount is not None:
        discount_amount = min(discount_amount, float(promotion.max_discount_amount))
    discount_amount = min(discount_amount, total_room_price)

    return promotion, discount_amount


# Gop cac dong cung 1 loai phong thanh 1 dong va sap xep theo room_type_id.
#
# Gop: hai dong cung loai phong duoc kiem tra ton kho rieng le nen moi dong deu
# thay con du phong, cong lai co the vuot so phong that.
#
# Sap xep: moi giao dich deu khoa loai phong theo cung mot thu tu, tranh 2 don
# dat nguoc thu tu nhau giu khoa cheo roi ket khoa chet.
def _gop_va_sap_xep_phong(rooms: list[BookingRoomItem]) -> list[BookingRoomItem]:
    gop: dict[int, int] = {}
    for item in rooms:
        gop[item.room_type_id] = gop.get(item.room_type_id, 0) + item.quantity
    return [
        BookingRoomItem(room_type_id=room_type_id, quantity=quantity)
        for room_type_id, quantity in sorted(gop.items())
    ]


# Dung booking va cac dong phong/dich vu trong session hien tai nhung KHONG
# commit - de nguoi goi quyet dinh chot giao dich luc nao. Tra ve booking kem
# danh sach dong phong.
def _build_booking(
    db: Session, current_user: User, payload: CreateBookingRequest
) -> tuple[Booking, list[BookingRoom]]:
    if payload.check_out_date <= payload.check_in_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngay tra phong phai sau ngay nhan phong",
        )
    if payload.check_in_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngay nhan phong khong duoc o qua khu",
        )

    hotel = get_hotel_by_id(db, payload.hotel_id)
    if not hotel or hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khach san khong ton tai hoac chua duoc duyet",
        )

    num_nights = (payload.check_out_date - payload.check_in_date).days

    # Khoa tung room_type va kiem tra phong trong truoc khi tao booking, tranh dat trung phong.
    booking_room_plans = []
    total_room_price = 0.0
    for item in _gop_va_sap_xep_phong(payload.rooms):
        room_type = get_room_type_by_id_for_update(db, item.room_type_id)
        if not room_type or room_type.hotel_id != hotel.id or not room_type.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Loai phong {item.room_type_id} khong thuoc khach san nay",
            )

        booked = get_booked_quantity_for_room_type(db, item.room_type_id, payload.check_in_date, payload.check_out_date)
        # Dung so phong vat ly CO THE BAN DUOC (loai phong dang bao tri hoac
        # dang bi khoa lich dung khoang ngay nay deu bi loai) that su da tao
        # (bang rooms), khong dung room_type.total_rooms (chi la con so Admin
        # tu khai bao, co the chua co phong vat ly nao tuong ung).
        actual_room_count = count_sellable_rooms_for_dates(
            db, item.room_type_id, payload.check_in_date, payload.check_out_date
        )
        available = actual_room_count - booked
        if item.quantity > available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Loai phong {room_type.name} chi con {available} phong trong",
            )

        # Gia co the khac nhau tung dem (gia sua tay trong room_type_rates hoac
        # quy tac gia theo mua) - cong don gia tung dem thay vi nhan 1 gia phang.
        base_price = float(room_type.base_price)
        nights_total, _ = resolve_stay_total(db, room_type, payload.check_in_date, payload.check_out_date)

        subtotal = nights_total * item.quantity
        # price_per_night luu gia BINH QUAN/dem de hien thi (tong tien thuc luon
        # tinh tu nights_total, khong bi anh huong boi lam tron o day).
        price_per_night = nights_total / num_nights if num_nights else base_price
        total_room_price += subtotal
        booking_room_plans.append(
            {
                "room_type_id": room_type.id,
                "quantity": item.quantity,
                "price_per_night": price_per_night,
                "num_nights": num_nights,
                "subtotal": subtotal,
            }
        )

    # Kiem tra va tinh tien cac dich vu them (neu co) - dich vu phai thuoc khach
    # san nay va dang bat (is_active).
    booking_service_plans = []
    total_service_price = 0.0
    for service_item in payload.services:
        service = get_hotel_service_by_id(db, service_item.service_id)
        if not service or service.hotel_id != hotel.id or not service.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dich vu {service_item.service_id} khong thuoc khach san nay",
            )
        unit_price = float(service.price)
        service_subtotal = unit_price * service_item.quantity
        total_service_price += service_subtotal
        booking_service_plans.append(
            {
                "service_id": service.id,
                "quantity": service_item.quantity,
                "unit_price": unit_price,
                "subtotal": service_subtotal,
            }
        )

    promotion = None
    discount_amount = 0.0
    if payload.promotion_id is not None:
        promotion, discount_amount = _apply_promotion(
            db, hotel.id, payload.promotion_id, total_room_price, date.today()
        )

    # Khuyen mai chi ap len tien phong; dich vu cong them nguyen gia.
    total_amount = total_room_price + total_service_price - discount_amount

    booking = create_booking_record(
        db,
        user_id=current_user.id,
        hotel_id=hotel.id,
        booking_code=_generate_booking_code(),
        check_in_date=payload.check_in_date,
        check_out_date=payload.check_out_date,
        num_guests=payload.num_guests,
        total_room_price=total_room_price,
        total_service_price=total_service_price,
        total_amount=total_amount,
        special_requests=payload.special_requests,
        discount_amount=discount_amount,
        promotion_id=promotion.id if promotion else None,
    )

    rooms = [create_booking_room_record(db, booking_id=booking.id, **plan) for plan in booking_room_plans]
    for plan in booking_service_plans:
        create_booking_service_record(db, booking_id=booking.id, **plan)

    if promotion:
        promotion.used_count += 1
        db.add(promotion)

    return booking, rooms


# Ghep tham so vao dia chi sinh anh QR. Dia chi cau hinh co the da kem san tham
# so (vi du chon mau anh, hien ten chu tai khoan) nen phai tron vao query dang
# co, khong noi them dau "?" thu hai - noi them se lam moi tham so phia sau bi
# nuot vao gia tri cua tham so cuoi cung.
#
# Tham so da co san trong dia chi cau hinh duoc giu nguyen, khong ghi de: chinh
# dia chi do moi biet dich vu sinh QR dang dung ten tham so kieu gi.
def _dia_chi_anh_qr(so_tien: int, noi_dung: str) -> str:
    phan_tich = urlparse(settings.sepay_qr_base_url)
    tham_so = {ten: gia_tri[0] for ten, gia_tri in parse_qs(phan_tich.query).items()}
    tham_so.setdefault("acc", settings.sepay_account_number)
    tham_so.setdefault("bank", settings.sepay_bank)
    tham_so["amount"] = str(so_tien)
    tham_so["des"] = noi_dung
    return phan_tich._replace(query=urlencode(tham_so)).geturl()


# Dung thong tin de khach quet ma QR chuyen khoan cho 1 don.
def _thong_tin_chuyen_khoan(booking: Booking) -> BankTransferResponse:
    so_tien = int(Decimal(booking.total_amount).quantize(Decimal(1), rounding=ROUND_CEILING))
    return BankTransferResponse(
        payment_code=booking.booking_code,
        amount=so_tien,
        account_number=settings.sepay_account_number,
        bank=settings.sepay_bank,
        qr_url=_dia_chi_anh_qr(so_tien, booking.booking_code),
        expires_at=booking.created_at + timedelta(minutes=settings.sepay_hold_minutes),
    )


# Xu ly dat phong. Hai nhanh khac han nhau tuy phuong thuc thanh toan:
#
# - Thanh toan mock (momo/zalopay/credit_card): tien coi nhu tra ngay, nen don,
#   thanh toan va hoa don duoc tao trong CUNG 1 giao dich - hoac co ca ba, hoac
#   khong ghi gi.
#
# - Chuyen khoan (bank_transfer): chi tao don va giu phong, vi tien chi that su
#   ve sau khi khach mo app ngan hang, viec do keo dai bao lau khong biet truoc.
#   Thanh toan va hoa don sinh ra khi webhook SePay bao tien da ve. Don khong
#   duoc tra tien trong han giu cho se tu huy.
def checkout(db: Session, current_user: User, payload: CheckoutRequest) -> dict:
    cho_chuyen_khoan = payload.payment_method == PaymentMethod.BANK_TRANSFER
    payment = invoice = None
    try:
        booking, rooms = _build_booking(db, current_user, payload)
        if not cho_chuyen_khoan:
            # Can id cua booking de gan vao thanh toan va hoa don.
            db.flush()
            payment, invoice = build_payment_with_invoice(db, booking, current_user, payload.payment_method)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Khong the hoan tat dat phong, vui long thu lai",
        ) from exc

    db.refresh(booking)
    if payment is not None:
        db.refresh(payment)
        db.refresh(invoice)

    return CheckoutResponse(
        booking=serialize_booking(db, booking, rooms, list_booking_services(db, booking.id)),
        payment=PaymentResponse.model_validate(payment) if payment else None,
        invoice=InvoiceResponse.model_validate(invoice) if invoice else None,
        bank_transfer=_thong_tin_chuyen_khoan(booking) if cho_chuyen_khoan else None,
    ).model_dump(mode="json")


# Ly do ghi vao don bi he thong tu huy khi khach khong chuyen khoan kip.
_LY_DO_QUA_HAN = "Qua han chuyen khoan, he thong tu huy don"


# Huy cac don cho chuyen khoan da qua han giu cho.
#
# He thong khong chay tac vu nen, nen viec don dep lam ngay truoc khi liet ke
# don: phong da duoc nha ra tu truoc (dieu kien tinh trong SQL), day chi la buoc
# dua trang thai don ve dung thuc te de khach khong thay don treo mai o "cho
# thanh toan". Trang thai cancelled la dut khoat, nho vay webhook toi muon biet
# duoc minh roi vao nhanh khong khop.
#
# cancelled_by de trong: don do he thong huy, khong phai nguoi nao huy.
def huy_don_qua_han(db: Session) -> int:
    bookings = list_expired_unpaid_bookings(db)
    if not bookings:
        return 0

    for booking in bookings:
        booking.status = BookingStatus.CANCELLED
        booking.cancellation_reason = _LY_DO_QUA_HAN
        booking.cancelled_at = datetime.now(timezone.utc)
        db.add(booking)
        # Tra lai luot dung khuyen mai, giong het luong huy don thong thuong.
        if booking.promotion_id is not None:
            promotion = get_promotion_by_id_for_update(db, booking.promotion_id)
            if promotion and promotion.used_count > 0:
                promotion.used_count -= 1
                db.add(promotion)

    db.commit()
    return len(bookings)


# Xu ly lay danh sach booking cua nguoi dung hien tai.
def list_my_bookings(db: Session, current_user: User) -> list[dict]:
    huy_don_qua_han(db)
    bookings = list_bookings_by_user(db, current_user.id)
    return [
        serialize_booking(db, booking, list_booking_rooms(db, booking.id), list_booking_services(db, booking.id))
        for booking in bookings
    ]


# Xu ly lay chi tiet 1 booking - chinh chu (User) hoac Admin/Staff cua khach san
# so huu booking do (can cho man hinh check-in/check-out) moi duoc xem.
def get_booking_detail(db: Session, current_user: User, booking_id: int) -> dict:
    booking = get_booking_by_id(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking khong ton tai",
        )

    if current_user.role == UserRole.USER:
        if booking.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ban chi duoc xem booking cua minh",
            )
    else:
        hotel = get_operational_hotel(db, current_user)
        if booking.hotel_id != hotel.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ban chi duoc xem booking cua khach san minh",
            )

    rooms = list_booking_rooms(db, booking.id)
    return serialize_booking(db, booking, rooms, list_booking_services(db, booking.id))


# Xu ly Admin/Staff xem danh sach booking cua khach san minh, co the loc theo trang thai.
def list_hotel_bookings(db: Session, current_user: User, status_filter: BookingStatus | None) -> list[dict]:
    huy_don_qua_han(db)
    hotel = get_operational_hotel(db, current_user)
    bookings = list_bookings_by_hotel(db, hotel.id, status_filter)
    return [
        serialize_booking(db, booking, list_booking_rooms(db, booking.id), list_booking_services(db, booking.id))
        for booking in bookings
    ]


# Xu ly Admin xac nhan hoa don: booking phai da thanh toan va dang cho xac nhan.
# Sau khi xac nhan, he thong (mock) tu dong gui email thong bao cho khach.
def confirm_booking(
    db: Session, current_user: User, booking_id: int, background_tasks: BackgroundTasks | None = None
) -> dict:
    hotel = get_operating_admin_hotel(db, current_user)
    booking = get_booking_by_id_for_update(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking khong ton tai",
        )
    if booking.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc xac nhan booking cua khach san minh",
        )
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking khong o trang thai cho xac nhan",
        )
    if not get_invoice_by_booking_id(db, booking.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking chua thanh toan, khong the xac nhan",
        )

    booking.status = BookingStatus.CONFIRMED
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Bao cho khach sau khi da chot trang thai, khong phai truoc.
    customer = get_user_by_id(db, booking.user_id)
    if customer:
        queue_email(
            background_tasks,
            send_booking_confirmed,
            customer.email,
            customer.full_name,
            booking.booking_code,
            hotel.name,
            booking.check_in_date.strftime("%d/%m/%Y"),
            booking.check_out_date.strftime("%d/%m/%Y"),
            float(booking.total_amount),
        )

    rooms = list_booking_rooms(db, booking.id)
    return serialize_booking(db, booking, rooms, list_booking_services(db, booking.id))


# Chuyen booking sang cancelled va hoan tien (mock) neu da thanh toan. Dung chung
# cho ca khach tu huy va Admin huy ho, sau khi moi ben da tu kiem tra quyen/chinh
# sach rieng. Phong tu dong duoc nha lai vi booked_quantity_subquery da loai tru
# booking cancelled.
def _apply_cancellation(db: Session, booking: Booking, current_user: User, cancellation_reason: str | None) -> dict:
    booking.status = BookingStatus.CANCELLED
    booking.cancellation_reason = cancellation_reason
    booking.cancelled_at = datetime.now(timezone.utc)
    booking.cancelled_by = current_user.id
    db.add(booking)

    payment = get_payment_by_booking_id(db, booking.id)
    if payment and payment.payment_status == PaymentStatus.COMPLETED:
        payment.payment_status = PaymentStatus.REFUNDED
        db.add(payment)

    # Huy booking thi tra lai luot dung khuyen mai (neu co ap dung), tranh mat oan
    # luot khi khach/Admin huy.
    if booking.promotion_id is not None:
        promotion = get_promotion_by_id_for_update(db, booking.promotion_id)
        if promotion and promotion.used_count > 0:
            promotion.used_count -= 1
            db.add(promotion)

    db.commit()
    db.refresh(booking)

    rooms = list_booking_rooms(db, booking.id)
    return serialize_booking(db, booking, rooms, list_booking_services(db, booking.id))


# Xu ly khach tu huy booking cua minh (UC 4.8). Chi huy duoc khi con cach gio nhan
# phong toi thieu 24h va booking dang pending/confirmed.
def cancel_booking(db: Session, current_user: User, booking_id: int, payload: CancelBookingRequest) -> dict:
    booking = get_booking_by_id_for_update(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking khong ton tai",
        )
    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc huy booking cua minh",
        )
    if booking.status not in _CANCELLABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking khong o trang thai co the huy",
        )

    checkin_start = datetime.combine(booking.check_in_date, time.min)
    hours_until_checkin = (checkin_start - datetime.now()).total_seconds() / 3600
    if hours_until_checkin < _MIN_HOURS_BEFORE_CHECKIN_TO_CANCEL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Da qua han huy mien phi, phai huy truoc it nhat 24 gio so voi ngay nhan phong",
        )

    return _apply_cancellation(db, booking, current_user, payload.cancellation_reason)


# Xu ly Admin huy booking thay khach (UC 6.2 - "xu ly huy phong tu phia khach
# san"), vd overbooking. Khong ap chinh sach 24h nhu khach tu huy, ap dung cho
# ca booking dang cho xac nhan lan da xac nhan. Rieng truong hop khach khong
# den (no-show) dung mark_booking_no_show ben duoi, khong dung ham nay.
def admin_cancel_booking(db: Session, current_user: User, booking_id: int, payload: CancelBookingRequest) -> dict:
    hotel = get_operating_admin_hotel(db, current_user)
    booking = get_booking_by_id_for_update(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking khong ton tai",
        )
    if booking.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc huy booking cua khach san minh",
        )
    if booking.status not in _CANCELLABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking khong o trang thai co the huy",
        )

    return _apply_cancellation(db, booking, current_user, payload.cancellation_reason)


# Xu ly Admin/Staff danh dau booking la khach khong den (no-show): booking phai
# dang confirmed va da qua ngay nhan phong ma chua check-in. Khac voi huy -
# KHONG hoan tien du payment da completed (loi cua khach khong den, khach san
# giu tien theo chinh sach no-show pho bien), nhung van tra lai luot dung
# khuyen mai vi phong chua thuc su duoc su dung.
def mark_booking_no_show(db: Session, current_user: User, booking_id: int) -> dict:
    hotel = get_operational_hotel(db, current_user)
    booking = get_booking_by_id_for_update(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking khong ton tai",
        )
    if booking.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc thao tac booking cua khach san minh",
        )
    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chi danh dau khong den cho booking da xac nhan",
        )
    if business_today() <= booking.check_in_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chua qua ngay nhan phong, chua the danh dau khong den",
        )

    booking.status = BookingStatus.NO_SHOW
    db.add(booking)

    if booking.promotion_id is not None:
        promotion = get_promotion_by_id_for_update(db, booking.promotion_id)
        if promotion and promotion.used_count > 0:
            promotion.used_count -= 1
            db.add(promotion)

    db.commit()
    db.refresh(booking)

    rooms = list_booking_rooms(db, booking.id)
    return serialize_booking(db, booking, rooms, list_booking_services(db, booking.id))
