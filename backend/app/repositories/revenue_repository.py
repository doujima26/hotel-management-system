from datetime import date, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.enums import BookingStatus, PaymentStatus
from app.core.timeutils import day_range_to_instants
from app.models.entities import Booking, BookingRoom, Payment, RoomType

# Cac trang thai booking khong tinh vao doanh thu/ty le lap day (doc lap voi
# dashboard_repository - domain revenue khong dung chung code voi dashboard).
_INACTIVE_BOOKING_STATUSES = (BookingStatus.CANCELLED, BookingStatus.NO_SHOW)


# Tong so phong (theo cong suat room_types.total_rooms) cua 1 khach san.
def get_total_room_capacity(db: Session, hotel_id: int) -> int:
    return int(db.query(func.coalesce(func.sum(RoomType.total_rooms), 0)).filter(RoomType.hotel_id == hotel_id).scalar() or 0)


# Lay danh sach (check_in_date, check_out_date, quantity) cua cac booking con hieu luc,
# giao voi khoang ngay, dung de tinh so dem-phong da ban (ty le lap day + ADR).
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


# Dem so booking duoc tao trong khoang ngay cua 1 khach san.
def count_bookings_created(db: Session, hotel_id: int, from_date: date, to_date: date) -> int:
    start, end = day_range_to_instants(from_date, to_date)
    return int(
        db.query(func.count(Booking.id))
        .filter(Booking.hotel_id == hotel_id, Booking.created_at >= start, Booking.created_at < end)
        .scalar()
        or 0
    )


# Lay (paid_at, total_room_price, total_service_price, discount_amount) cua moi
# payment da thanh toan xong (completed) trong khoang ngay, join sang booking -
# dung 1 lan fetch duy nhat cho: tong doanh thu, xu huong theo ngay, tach
# doanh thu phong/dich vu.
def list_completed_payments_in_range(
    db: Session, hotel_id: int, from_date: date, to_date: date
) -> list[tuple[datetime, float, float, float]]:
    start, end = day_range_to_instants(from_date, to_date)
    rows = (
        db.query(Payment.paid_at, Booking.total_room_price, Booking.total_service_price, Booking.discount_amount)
        .join(Booking, Booking.id == Payment.booking_id)
        .filter(
            Booking.hotel_id == hotel_id,
            Payment.payment_status == PaymentStatus.COMPLETED,
            Payment.paid_at >= start,
            Payment.paid_at < end,
        )
        .all()
    )
    return [(paid_at, float(room_price), float(service_price), float(discount)) for paid_at, room_price, service_price, discount in rows]


# Xep hang loai phong theo tong doanh thu phong (subtotal) trong khoang ngay,
# chi tinh cac booking da thanh toan xong (completed).
def list_revenue_by_room_type(
    db: Session, hotel_id: int, from_date: date, to_date: date, limit: int = 5
) -> list[tuple[int, str, float]]:
    start, end = day_range_to_instants(from_date, to_date)
    rows = (
        db.query(
            RoomType.id,
            RoomType.name,
            func.coalesce(func.sum(BookingRoom.subtotal), 0),
        )
        .join(BookingRoom, BookingRoom.room_type_id == RoomType.id)
        .join(Booking, Booking.id == BookingRoom.booking_id)
        .join(Payment, Payment.booking_id == Booking.id)
        .filter(
            Booking.hotel_id == hotel_id,
            Payment.payment_status == PaymentStatus.COMPLETED,
            Payment.paid_at >= start,
            Payment.paid_at < end,
        )
        .group_by(RoomType.id, RoomType.name)
        .order_by(func.sum(BookingRoom.subtotal).desc())
        .limit(limit)
        .all()
    )
    return [(room_type_id, name, float(revenue)) for room_type_id, name, revenue in rows]
