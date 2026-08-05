from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.enums import BookingStatus, PaymentStatus
from app.models.entities import (
    Booking,
    BookingRoom,
    BookingRoomUnit,
    BookingService,
    HotelService,
    Payment,
    RoomType,
)

# Cac trang thai booking khong con chiem giu phong. Checked_out cung tinh la
# khong con chiem giu du check_out_date goc chua toi - khach da check-out (ke
# ca check-out som) nghia la phong da duoc tra that, khong con ly do giu cho.
_INACTIVE_BOOKING_STATUSES = (BookingStatus.CANCELLED, BookingStatus.NO_SHOW, BookingStatus.CHECKED_OUT)

# So phut giu phong cho khach hoan tat thanh toan. Phong van bi giu ngay tu luc
# tao booking de hai khach khong cung mua duoc phong cuoi cung, nhung qua moc
# nay ma chua thanh toan thi phong duoc nha ra ban lai.
UNPAID_HOLD_MINUTES = 30


# Moc thoi gian tao booking: don pending chua thanh toan tao truoc moc nay coi
# nhu het han giu cho.
def unpaid_hold_cutoff() -> datetime:
    return datetime.now(timezone.utc) - timedelta(minutes=UNPAID_HOLD_MINUTES)


# Kiem tra 1 don da het han giu cho chua. Dat canh dieu kien SQL ben duoi vi ca
# hai cung dien dat mot luat, sua mot ben ma quen ben kia se lam ton kho lech
# voi thong tin hien cho nguoi dung.
def is_hold_expired(booking: Booking, payment: Payment | None) -> bool:
    if booking.status != BookingStatus.PENDING:
        return False
    if payment and payment.payment_status == PaymentStatus.COMPLETED:
        return False
    return booking.created_at < unpaid_hold_cutoff()


# Dieu kien SQL cho 1 don van con trong han giu cho: khong phai don cho thanh
# toan, hoac con trong moc thoi gian, hoac da thanh toan xong. Ban SQL cua
# is_hold_expired o tren.
def hold_con_hieu_luc():
    da_thanh_toan = (
        select(Payment.id)
        .where(Payment.booking_id == Booking.id, Payment.payment_status == PaymentStatus.COMPLETED)
        .exists()
    )
    return or_(
        Booking.status != BookingStatus.PENDING,
        Booking.created_at >= unpaid_hold_cutoff(),
        da_thanh_toan,
    )


# Dieu kien 1 booking con chiem giu phong: chua o trang thai nha phong, va neu
# dang cho thanh toan thi phai con trong han giu cho hoac da thanh toan xong.
def _still_holding_rooms():
    return (
        Booking.status.notin_(_INACTIVE_BOOKING_STATUSES),
        hold_con_hieu_luc(),
    )


# Subquery tong so phong da dat theo loai phong trong khoang ngay, loai tru
# booking da huy/no-show va don cho thanh toan da het han giu cho.
def booked_quantity_subquery(db: Session, check_in: date, check_out: date):
    return (
        db.query(
            BookingRoom.room_type_id.label("room_type_id"),
            func.coalesce(func.sum(BookingRoom.quantity), 0).label("booked_quantity"),
        )
        .join(Booking, Booking.id == BookingRoom.booking_id)
        .filter(
            *_still_holding_rooms(),
            Booking.check_in_date < check_out,
            Booking.check_out_date > check_in,
        )
        .group_by(BookingRoom.room_type_id)
        .subquery()
    )


# Lay cac khach san 1 khach da tung dat kem ngay nhan phong gan nhat, moi khach
# san 1 dong, sap theo lan dat gan nhat. Bo don da huy va khong den vi khong
# phai tin hieu khach muon quay lai.
def list_booked_hotels_by_user(db: Session, user_id: int) -> list[tuple[int, date]]:
    lan_gan_nhat = func.max(Booking.check_in_date)
    return (
        db.query(Booking.hotel_id, lan_gan_nhat)
        .filter(
            Booking.user_id == user_id,
            Booking.status.notin_((BookingStatus.CANCELLED, BookingStatus.NO_SHOW)),
        )
        .group_by(Booking.hotel_id)
        .order_by(lan_gan_nhat.desc())
        .all()
    )


# Lay tong so phong da dat cua 1 loai phong trong khoang ngay.
def get_booked_quantity_for_room_type(db: Session, room_type_id: int, check_in: date, check_out: date) -> int:
    subquery = booked_quantity_subquery(db, check_in, check_out)
    result = db.query(subquery.c.booked_quantity).filter(subquery.c.room_type_id == room_type_id).scalar()
    return int(result or 0)


# Dem TAT CA booking (moi trang thai, ke ca da huy) da tung dung khuyen mai
# nay - dung de kiem tra co an toan xoa cung khuyen mai khong (FK khong co
# ON DELETE CASCADE tren bookings.promotion_id nen con row la bi chan).
def count_bookings_by_promotion_id(db: Session, promotion_id: int) -> int:
    return db.query(func.count(Booking.id)).filter(Booking.promotion_id == promotion_id).scalar() or 0


# Tao booking moi. Khong commit ngay de giu khoa row cua room_type toi khi tao xong het booking_rooms.
def create_booking_record(
    db: Session,
    *,
    user_id: int,
    hotel_id: int,
    booking_code: str,
    check_in_date: date,
    check_out_date: date,
    num_guests: int,
    total_room_price: float,
    total_amount: float,
    special_requests: str | None,
    total_service_price: float = 0,
    discount_amount: float = 0,
    promotion_id: int | None = None,
) -> Booking:
    booking = Booking(
        booking_code=booking_code,
        user_id=user_id,
        hotel_id=hotel_id,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        num_guests=num_guests,
        total_room_price=total_room_price,
        total_service_price=total_service_price,
        discount_amount=discount_amount,
        promotion_id=promotion_id,
        total_amount=total_amount,
        status=BookingStatus.PENDING,
        special_requests=special_requests,
    )
    db.add(booking)
    db.flush()
    return booking


# Tao dong phong cho booking kem du so suat phong (booking_room_units, room_id
# de trong, gan luc check-in). Khong commit ngay, xem create_booking_record.
def create_booking_room_record(
    db: Session,
    *,
    booking_id: int,
    room_type_id: int,
    quantity: int,
    price_per_night: float,
    num_nights: int,
    subtotal: float,
) -> BookingRoom:
    booking_room = BookingRoom(
        booking_id=booking_id,
        room_type_id=room_type_id,
        quantity=quantity,
        price_per_night=price_per_night,
        num_nights=num_nights,
        subtotal=subtotal,
    )
    db.add(booking_room)
    db.flush()

    for _ in range(quantity):
        db.add(BookingRoomUnit(booking_room_id=booking_room.id, room_id=None))
    db.flush()

    return booking_room


# Lay danh sach suat phong (booking_room_units) theo booking, kem thong tin dong booking_room.
def list_booking_room_units(db: Session, booking_id: int) -> list[BookingRoomUnit]:
    return (
        db.query(BookingRoomUnit)
        .join(BookingRoom, BookingRoom.id == BookingRoomUnit.booking_room_id)
        .filter(BookingRoom.booking_id == booking_id)
        .all()
    )


# Lay booking theo id.
def get_booking_by_id(db: Session, booking_id: int) -> Booking | None:
    return db.query(Booking).filter(Booking.id == booking_id).first()


# Lay booking theo id va khoa row de thanh toan an toan, tranh thanh toan trung.
def get_booking_by_id_for_update(db: Session, booking_id: int) -> Booking | None:
    return db.query(Booking).filter(Booking.id == booking_id).with_for_update().first()


# Lay danh sach dong phong theo booking.
def list_booking_rooms(db: Session, booking_id: int) -> list[BookingRoom]:
    return db.query(BookingRoom).filter(BookingRoom.booking_id == booking_id).all()


# Tao 1 dong dich vu them cho booking (chua commit, dung chung transaction tao booking).
def create_booking_service_record(
    db: Session,
    *,
    booking_id: int,
    service_id: int,
    quantity: int,
    unit_price: float,
    subtotal: float,
) -> BookingService:
    booking_service = BookingService(
        booking_id=booking_id,
        service_id=service_id,
        quantity=quantity,
        unit_price=unit_price,
        subtotal=subtotal,
    )
    db.add(booking_service)
    db.flush()
    return booking_service


# Lay danh sach dich vu them cua booking, kem ten dich vu (join hotel_services).
def list_booking_services(db: Session, booking_id: int) -> list[tuple[BookingService, str]]:
    return (
        db.query(BookingService, HotelService.name)
        .join(HotelService, HotelService.id == BookingService.service_id)
        .filter(BookingService.booking_id == booking_id)
        .all()
    )


# Lay ten loai phong cua NHIEU booking trong 1 query (tranh N+1 khi liet ke
# danh gia can hien khach da o loai phong nao).
def list_room_type_names_by_booking_ids(db: Session, booking_ids: list[int]) -> dict[int, list[str]]:
    if not booking_ids:
        return {}
    rows = (
        db.query(BookingRoom.booking_id, RoomType.name)
        .join(RoomType, RoomType.id == BookingRoom.room_type_id)
        .filter(BookingRoom.booking_id.in_(booking_ids))
        .order_by(RoomType.name.asc())
        .all()
    )
    grouped: dict[int, list[str]] = {}
    for booking_id, name in rows:
        grouped.setdefault(booking_id, []).append(name)
    return grouped


# Dem so booking va so booking bi huy cua 1 nguoi dung, kem ngay nhan phong gan nhat.
def get_booking_stats_by_user(db: Session, user_id: int) -> tuple[int, int, date | None]:
    total, cancelled, last_check_in = (
        db.query(
            func.count(Booking.id),
            func.count(Booking.id).filter(Booking.status == BookingStatus.CANCELLED),
            func.max(Booking.check_in_date),
        )
        .filter(Booking.user_id == user_id)
        .one()
    )
    return int(total), int(cancelled), last_check_in


# Lay danh sach booking cua nguoi dung, moi nhat truoc.
def list_bookings_by_user(db: Session, user_id: int) -> list[Booking]:
    return db.query(Booking).filter(Booking.user_id == user_id).order_by(Booking.created_at.desc()).all()


# Cac trang thai booking duoc tinh la chua tra phong.
_OUTSTANDING_STATUSES = (BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN)


# Dem so booking chua tra phong theo tung khach san.
def count_outstanding_bookings_by_hotel_ids(db: Session, hotel_ids: list[int], today: date) -> dict[int, int]:
    if not hotel_ids:
        return {}
    rows = (
        db.query(Booking.hotel_id, func.count(Booking.id))
        .filter(
            Booking.hotel_id.in_(hotel_ids),
            Booking.status.in_(_OUTSTANDING_STATUSES),
            Booking.check_out_date >= today,
        )
        .group_by(Booking.hotel_id)
        .all()
    )
    return {hotel_id: int(count) for hotel_id, count in rows}


# Lay danh sach booking theo khach san, loc theo trang thai neu co, moi nhat truoc.
def list_bookings_by_hotel(db: Session, hotel_id: int, status_filter: BookingStatus | None) -> list[Booking]:
    query = db.query(Booking).filter(Booking.hotel_id == hotel_id)
    if status_filter:
        query = query.filter(Booking.status == status_filter)
    return query.order_by(Booking.created_at.desc()).all()
