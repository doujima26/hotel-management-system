from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.enums import BookingStatus
from app.models.entities import Booking, BookingRoom, BookingRoomUnit

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
        total_service_price=0,
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


# Lay danh sach booking cua nguoi dung, moi nhat truoc.
def list_bookings_by_user(db: Session, user_id: int) -> list[Booking]:
    return db.query(Booking).filter(Booking.user_id == user_id).order_by(Booking.created_at.desc()).all()


# Lay danh sach booking theo khach san, loc theo trang thai neu co, moi nhat truoc.
def list_bookings_by_hotel(db: Session, hotel_id: int, status_filter: BookingStatus | None) -> list[Booking]:
    query = db.query(Booking).filter(Booking.hotel_id == hotel_id)
    if status_filter:
        query = query.filter(Booking.status == status_filter)
    return query.order_by(Booking.created_at.desc()).all()
