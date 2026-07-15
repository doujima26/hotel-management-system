from datetime import date, time

from sqlalchemy.orm import Session

from app.core.enums import ShiftType
from app.models.entities import StaffMember, StaffSchedule, User


# Lay nhan vien theo id.
def get_staff_member_by_id(db: Session, staff_id: int) -> StaffMember | None:
    return db.query(StaffMember).filter(StaffMember.id == staff_id).first()


# Lay nhan vien theo user_id (1 tai khoan Staff chi gan voi dung 1 khach san).
def get_staff_member_by_user_id(db: Session, user_id: int) -> StaffMember | None:
    return db.query(StaffMember).filter(StaffMember.user_id == user_id).first()


# Lay danh sach nhan vien kem thong tin User theo khach san.
def list_staff_with_user_by_hotel(db: Session, hotel_id: int) -> list[tuple[StaffMember, User]]:
    return (
        db.query(StaffMember, User)
        .join(User, User.id == StaffMember.user_id)
        .filter(StaffMember.hotel_id == hotel_id)
        .order_by(StaffMember.created_at.desc())
        .all()
    )


# Tao nhan vien moi cho khach san.
def create_staff_member_record(db: Session, *, user_id: int, hotel_id: int, position: str, hired_at: date | None) -> StaffMember:
    staff = StaffMember(
        user_id=user_id,
        hotel_id=hotel_id,
        position=position,
        hired_at=hired_at,
        is_active=True,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


# Luu thay doi thong tin nhan vien.
def save_staff_member(db: Session, staff: StaffMember) -> StaffMember:
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


# Lay 1 ca lam viec theo id.
def get_staff_schedule_by_id(db: Session, schedule_id: int) -> StaffSchedule | None:
    return db.query(StaffSchedule).filter(StaffSchedule.id == schedule_id).first()


# Lay danh sach ca lam viec cua 1 nhan vien, sap xep theo ngay.
def list_staff_schedules(db: Session, staff_id: int) -> list[StaffSchedule]:
    return db.query(StaffSchedule).filter(StaffSchedule.staff_id == staff_id).order_by(StaffSchedule.shift_date.asc()).all()


# Tao ca lam viec moi cho nhan vien.
def create_staff_schedule_record(
    db: Session,
    *,
    staff_id: int,
    shift_date: date,
    shift_type: ShiftType,
    start_time: time,
    end_time: time,
    notes: str | None,
) -> StaffSchedule:
    schedule = StaffSchedule(
        staff_id=staff_id,
        shift_date=shift_date,
        shift_type=shift_type,
        start_time=start_time,
        end_time=end_time,
        notes=notes,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


# Luu thay doi ca lam viec.
def save_staff_schedule(db: Session, schedule: StaffSchedule) -> StaffSchedule:
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


# Xoa ca lam viec.
def delete_staff_schedule_record(db: Session, schedule: StaffSchedule) -> None:
    db.delete(schedule)
    db.commit()
