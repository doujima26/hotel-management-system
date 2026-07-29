from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.enums import BookingStatus, PaymentStatus
from app.core.timeutils import day_range_to_instants
from app.models.entities import Booking, BookingRoom, BookingService, HotelService, Payment, RoomType, User

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


# Dem so booking dang cho xac nhan (Dashboard - can xu ly ngay).
def count_pending_bookings(db: Session, hotel_id: int) -> int:
    return int(
        db.query(func.count(Booking.id))
        .filter(Booking.hotel_id == hotel_id, Booking.status == BookingStatus.PENDING)
        .scalar()
        or 0
    )


# Dem so booking da xac nhan nhung qua ngay nhan phong van chua check-in
# (Dashboard - can xu ly ngay).
def count_overdue_confirmed_bookings(db: Session, hotel_id: int, today: date) -> int:
    return int(
        db.query(func.count(Booking.id))
        .filter(Booking.hotel_id == hotel_id, Booking.status == BookingStatus.CONFIRMED, Booking.check_in_date <= today)
        .scalar()
        or 0
    )


# Dem so khach nhan phong hom nay, tra phong hom nay, va dang luu tru - dung
# 1 lan truy van cho ca 3 chi so (Dashboard - van hanh hom nay).
def count_arrivals_and_departures_today(db: Session, hotel_id: int, today: date) -> tuple[int, int, int]:
    arrivals = int(
        db.query(func.count(Booking.id))
        .filter(
            Booking.hotel_id == hotel_id,
            Booking.check_in_date == today,
            Booking.status.in_((BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN)),
        )
        .scalar()
        or 0
    )
    departures = int(
        db.query(func.count(Booking.id))
        .filter(Booking.hotel_id == hotel_id, Booking.check_out_date == today, Booking.status == BookingStatus.CHECKED_IN)
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
