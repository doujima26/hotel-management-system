from datetime import date, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.enums import BookingStatus, HotelStatus, PaymentStatus
from app.core.timeutils import day_range_to_instants
from app.models.entities import Booking, BookingRoom, BookingService, Hotel, HotelService, Payment, RoomType, User
from app.repositories.booking_repository import da_thanh_toan_xong

# Cac trang thai booking khong tinh vao doanh thu/ty le lap day.
_INACTIVE_BOOKING_STATUSES = (BookingStatus.CANCELLED, BookingStatus.NO_SHOW)


# Tong tien da thu (payment completed) trong khoang ngay, loc theo khach san neu co.
def get_revenue(db: Session, from_date: date, to_date: date, hotel_id: int | None = None) -> float:
    start, end = day_range_to_instants(from_date, to_date)
    query = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.payment_status == PaymentStatus.COMPLETED,
        Payment.paid_at >= start,
        Payment.paid_at < end,
    )
    if hotel_id is not None:
        query = query.join(Booking, Booking.id == Payment.booking_id).filter(Booking.hotel_id == hotel_id)
    return float(query.scalar() or 0)


# Tong tien 1 khach da thanh toan thanh cong, khong gioi han khoang ngay.
# Dung dieu kien payment completed giong get_revenue de cung mot dinh nghia tien thu.
def get_total_paid_by_user(db: Session, user_id: int) -> float:
    amount = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .join(Booking, Booking.id == Payment.booking_id)
        .filter(Payment.payment_status == PaymentStatus.COMPLETED, Booking.user_id == user_id)
        .scalar()
    )
    return float(amount or 0)


# Doanh thu cua NHIEU khach san trong 1 truy van, tra ve map hotel_id -> tien.
#
# Dat canh get_revenue va dung y nguyen dieu kien cua no (payment completed +
# moc thoi gian theo mui gio nghiep vu) de chi co MOT dinh nghia "doanh thu"
# trong he thong - tach ra noi khac rat de tro thanh 2 con so lech nhau.
def get_revenue_by_hotel_ids(db: Session, from_date: date, to_date: date, hotel_ids: list[int]) -> dict[int, float]:
    if not hotel_ids:
        return {}
    start, end = day_range_to_instants(from_date, to_date)
    rows = (
        db.query(Booking.hotel_id, func.coalesce(func.sum(Payment.amount), 0))
        .join(Payment, Payment.booking_id == Booking.id)
        .filter(
            Payment.payment_status == PaymentStatus.COMPLETED,
            Payment.paid_at >= start,
            Payment.paid_at < end,
            Booking.hotel_id.in_(hotel_ids),
        )
        .group_by(Booking.hotel_id)
        .all()
    )
    return {hotel_id: float(amount) for hotel_id, amount in rows}


# Dem tong so booking va so booking bi huy cua NHIEU khach san, tinh theo ngay
# TAO don. Dung chung mot mau so nen ty le huy tinh ra khong bi lech ky.
def count_bookings_and_cancelled_by_hotel_ids(
    db: Session, from_date: date, to_date: date, hotel_ids: list[int]
) -> dict[int, tuple[int, int]]:
    if not hotel_ids:
        return {}
    start, end = day_range_to_instants(from_date, to_date)
    rows = (
        db.query(
            Booking.hotel_id,
            func.count(Booking.id),
            func.count(Booking.id).filter(Booking.status == BookingStatus.CANCELLED),
        )
        .filter(
            Booking.created_at >= start,
            Booking.created_at < end,
            Booking.hotel_id.in_(hotel_ids),
        )
        .group_by(Booking.hotel_id)
        .all()
    )
    return {hotel_id: (int(total), int(cancelled)) for hotel_id, total, cancelled in rows}


# Tong so phong (theo cong suat room_types.total_rooms) cua 1 khach san.
def get_total_room_capacity(db: Session, hotel_id: int) -> int:
    return int(db.query(func.coalesce(func.sum(RoomType.total_rooms), 0)).filter(RoomType.hotel_id == hotel_id).scalar() or 0)


# Lay danh sach (check_in_date, check_out_date, quantity) cua cac booking con hieu luc,
# giao voi khoang ngay, dung de tinh ty le lap day.
def list_active_booking_rooms_in_range(db: Session, hotel_id: int, from_date: date, to_date: date) -> list[tuple[date, date, int]]:
    return (
        db.query(Booking.check_in_date, Booking.check_out_date, BookingRoom.quantity)
        .join(BookingRoom, BookingRoom.booking_id == Booking.id)
        .filter(
            Booking.hotel_id == hotel_id,
            Booking.status.notin_(_INACTIVE_BOOKING_STATUSES),
            Booking.check_in_date <= to_date,
            Booking.check_out_date > from_date,
        )
        .all()
    )


# Dem so booking duoc tao trong khoang ngay, loc theo khach san neu co.
def count_bookings_created(db: Session, from_date: date, to_date: date, hotel_id: int | None = None) -> int:
    start, end = day_range_to_instants(from_date, to_date)
    query = db.query(func.count(Booking.id)).filter(Booking.created_at >= start, Booking.created_at < end)
    if hotel_id is not None:
        query = query.filter(Booking.hotel_id == hotel_id)
    return int(query.scalar() or 0)


# Thoi diem dang ky cua ho so khach san CHO DUYET lau nhat - dung de bao "ho so
# cho lau nhat da X ngay", bien hang doi duyet thanh mot con so co suc thuc giuc.
def get_oldest_pending_hotel_created_at(db: Session) -> datetime | None:
    return (
        db.query(func.min(Hotel.created_at))
        .filter(Hotel.status == HotelStatus.PENDING)
        .scalar()
    )


# Tong so phong (theo cong suat khai bao) cua cac khach san DANG HOAT DONG -
# quy mo thuc su ban duoc cua nen tang, khong tinh khach san cho duyet/tam dung.
def count_declared_rooms_of_approved_hotels(db: Session) -> int:
    return int(
        db.query(func.coalesce(func.sum(RoomType.total_rooms), 0))
        .join(Hotel, Hotel.id == RoomType.hotel_id)
        .filter(Hotel.status == HotelStatus.APPROVED)
        .scalar()
        or 0
    )


# Dem tai khoan theo tung vai tro - cho khoi quy mo nen tang.
def count_users_by_role(db: Session) -> dict[str, int]:
    rows = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    return {role.value: count for role, count in rows}


# Top khach san theo doanh thu trong khoang ngay, kem so booking da tao trong
# cung ky. Dung dung dinh nghia doanh thu cua get_revenue.
def list_top_hotels_by_revenue(
    db: Session, from_date: date, to_date: date, limit: int
) -> list[tuple[int, str, float]]:
    start, end = day_range_to_instants(from_date, to_date)
    return (
        db.query(Hotel.id, Hotel.name, func.coalesce(func.sum(Payment.amount), 0).label("revenue"))
        .join(Booking, Booking.hotel_id == Hotel.id)
        .join(Payment, Payment.booking_id == Booking.id)
        .filter(
            Payment.payment_status == PaymentStatus.COMPLETED,
            Payment.paid_at >= start,
            Payment.paid_at < end,
        )
        .group_by(Hotel.id, Hotel.name)
        .order_by(func.sum(Payment.amount).desc())
        .limit(limit)
        .all()
    )


# Dem so tai khoan moi dang ky trong khoang ngay.
def count_new_users(db: Session, from_date: date, to_date: date) -> int:
    start, end = day_range_to_instants(from_date, to_date)
    return int(db.query(func.count(User.id)).filter(User.created_at >= start, User.created_at < end).scalar() or 0)


# Xep hang dich vu duoc su dung nhieu nhat cua 1 khach san trong khoang ngay.
def get_top_services(db: Session, hotel_id: int, from_date: date, to_date: date, limit: int = 5) -> list[tuple[int, str, int, float]]:
    start, end = day_range_to_instants(from_date, to_date)
    return (
        db.query(
            HotelService.id,
            HotelService.name,
            func.coalesce(func.sum(BookingService.quantity), 0),
            func.coalesce(func.sum(BookingService.subtotal), 0),
        )
        .join(BookingService, BookingService.service_id == HotelService.id)
        .filter(
            HotelService.hotel_id == hotel_id,
            BookingService.used_at >= start,
            BookingService.used_at < end,
        )
        .group_by(HotelService.id, HotelService.name)
        .order_by(func.sum(BookingService.quantity).desc())
        .limit(limit)
        .all()
    )


# Dem so booking dang cho Admin xac nhan (Dashboard - can xu ly ngay). Chi tinh
# don da tra tien: don chua tra tien thi Admin khong bam xac nhan duoc, va don
# da tra tien thi khong bao gio het han giu cho. Cung dinh nghia voi muc loc
# "Cho xac nhan" o trang Booking.
def count_pending_bookings(db: Session, hotel_id: int) -> int:
    return int(
        db.query(func.count(Booking.id))
        .filter(Booking.hotel_id == hotel_id, Booking.status == BookingStatus.PENDING, da_thanh_toan_xong())
        .scalar()
        or 0
    )


# Dem so booking da xac nhan nhung qua ngay nhan phong van chua check-in
# (Dashboard - can xu ly ngay). Khach nhan phong dung hom nay chua tinh la tre,
# ho da co o "Nhan phong hom nay" rieng.
def count_overdue_confirmed_bookings(db: Session, hotel_id: int, today: date) -> int:
    return int(
        db.query(func.count(Booking.id))
        .filter(Booking.hotel_id == hotel_id, Booking.status == BookingStatus.CONFIRMED, Booking.check_in_date < today)
        .scalar()
        or 0
    )


# Dem so khach nhan phong hom nay, tra phong hom nay, va dang luu tru
# (Dashboard - van hanh hom nay). Ca hai o "hom nay" deu dem tong viec cua ca
# ngay, ke ca phan da lam xong, nen con so khong tut dan trong ngay.
def count_arrivals_and_departures_today(db: Session, hotel_id: int, today: date) -> tuple[int, int, int]:
    arrivals = int(
        db.query(func.count(Booking.id))
        .filter(
            Booking.hotel_id == hotel_id,
            Booking.check_in_date == today,
            Booking.status.in_((BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT)),
        )
        .scalar()
        or 0
    )
    departures = int(
        db.query(func.count(Booking.id))
        .filter(
            Booking.hotel_id == hotel_id,
            Booking.check_out_date == today,
            Booking.status.in_((BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT)),
        )
        .scalar()
        or 0
    )
    in_house = int(
        db.query(func.count(Booking.id))
        .filter(Booking.hotel_id == hotel_id, Booking.status == BookingStatus.CHECKED_IN)
        .scalar()
        or 0
    )
    return arrivals, departures, in_house
