from datetime import date

from sqlalchemy.orm import Session

from app.models.entities import StaffMember, User


# Lay nhan vien theo id.
def get_staff_member_by_id(db: Session, staff_id: int) -> StaffMember | None:
    return db.query(StaffMember).filter(StaffMember.id == staff_id).first()


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
