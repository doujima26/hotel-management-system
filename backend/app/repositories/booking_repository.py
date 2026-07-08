from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.enums import BookingStatus
from app.models.entities import Booking, BookingRoom

# Cac trang thai booking khong con chiem giu phong.
_INACTIVE_BOOKING_STATUSES = (BookingStatus.CANCELLED, BookingStatus.NO_SHOW)


# Subquery tong so phong da dat theo loai phong trong khoang ngay, loai tru booking da huy/no-show.
def booked_quantity_subquery(db: Session, check_in: date, check_out: date):
    return (
        db.query(
            BookingRoom.room_type_id.label("room_type_id"),
            func.coalesce(func.sum(BookingRoom.quantity), 0).label("booked_quantity"),
        )
        .join(Booking, Booking.id == BookingRoom.booking_id)
        .filter(
            Booking.status.notin_(_INACTIVE_BOOKING_STATUSES),
            Booking.check_in_date < check_out,
            Booking.check_out_date > check_in,
        )
        .group_by(BookingRoom.room_type_id)
        .subquery()
    )


# Lay tong so phong da dat cua 1 loai phong trong khoang ngay.
def get_booked_quantity_for_room_type(db: Session, room_type_id: int, check_in: date, check_out: date) -> int:
    subquery = booked_quantity_subquery(db, check_in, check_out)
    result = db.query(subquery.c.booked_quantity).filter(subquery.c.room_type_id == room_type_id).scalar()
    return int(result or 0)


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
) -> Booking:
    booking = Booking(
        booking_code=booking_code,
        user_id=user_id,
        hotel_id=hotel_id,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        num_guests=num_guests,
        total_room_price=total_room_price,
        total_service_price=0,
        discount_amount=0,
        total_amount=total_amount,
        status=BookingStatus.PENDING,
        special_requests=special_requests,
    )
    db.add(booking)
    db.flush()
    return booking


# Tao dong phong cho booking. Khong commit ngay, xem create_booking_record.
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
    return booking_room


# Lay booking theo id.
def get_booking_by_id(db: Session, booking_id: int) -> Booking | None:
    return db.query(Booking).filter(Booking.id == booking_id).first()


# Lay danh sach dong phong theo booking.
def list_booking_rooms(db: Session, booking_id: int) -> list[BookingRoom]:
    return db.query(BookingRoom).filter(BookingRoom.booking_id == booking_id).all()


# Lay danh sach booking cua nguoi dung, moi nhat truoc.
def list_bookings_by_user(db: Session, user_id: int) -> list[Booking]:
    return db.query(Booking).filter(Booking.user_id == user_id).order_by(Booking.created_at.desc()).all()
