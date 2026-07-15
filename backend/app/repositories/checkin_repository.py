from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.enums import BookingStatus, CheckType
from app.models.entities import Booking, BookingRoom, BookingRoomUnit, CheckInOut, RoomStatusLog


# Ghi log thay doi trang thai phong (audit trail).
def create_room_status_log(
    db: Session,
    *,
    room_id: int,
    previous_status: str | None,
    new_status: str,
    changed_by: int,
    reason: str | None,
) -> RoomStatusLog:
    log = RoomStatusLog(
        room_id=room_id,
        previous_status=previous_status,
        new_status=new_status,
        changed_by=changed_by,
        reason=reason,
    )
    db.add(log)
    db.flush()
    return log


# Ghi nhan 1 thao tac check-in/check-out.
def create_check_in_out_record(
    db: Session,
    *,
    booking_id: int,
    staff_id: int,
    check_type: CheckType,
    notes: str | None,
) -> CheckInOut:
    record = CheckInOut(
        booking_id=booking_id,
        staff_id=staff_id,
        type=check_type,
        performed_at=datetime.now(timezone.utc),
        notes=notes,
    )
    db.add(record)
    db.flush()
    return record


# Tim booking dang checked_in gan voi 1 phong vat ly cu the (de hien thong tin
# khach dang o trong so do phong).
def get_active_booking_for_room(db: Session, room_id: int) -> Booking | None:
    return (
        db.query(Booking)
        .join(BookingRoom, BookingRoom.booking_id == Booking.id)
        .join(BookingRoomUnit, BookingRoomUnit.booking_room_id == BookingRoom.id)
        .filter(BookingRoomUnit.room_id == room_id, Booking.status == BookingStatus.CHECKED_IN)
        .first()
    )
