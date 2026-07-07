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
