import secrets

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.enums import UserRole
from app.core.security import hash_password
from app.models.entities import StaffMember, User
from app.repositories.staff_repository import (
    create_staff_member_record,
    get_staff_member_by_id,
    list_staff_with_user_by_hotel,
    save_staff_member,
)
from app.repositories.user_repository import create_user, get_user_by_email, get_user_by_id
from app.schemas.staff import CreateStaffRequest, CreateStaffResponse, StaffMemberResponse, UpdateStaffRequest
from app.services.hotel_service import get_approved_admin_hotel


# Sinh mat khau tam thoi (mock) cho tai khoan nhan vien moi tao.
def _generate_temp_password() -> str:
    return secrets.token_urlsafe(9)


# Chuyen StaffMember + User thanh du lieu tra ve.
def _serialize_staff(staff: StaffMember, user: User) -> dict:
    return StaffMemberResponse(
        id=staff.id,
        user_id=staff.user_id,
        hotel_id=staff.hotel_id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        position=staff.position,
        is_active=staff.is_active,
        hired_at=staff.hired_at,
    ).model_dump(mode="json")


# Xu ly Admin tao nhan vien moi: tao tai khoan User (role staff) va gan vao khach
# san minh. Mat khau tam duoc mock tra ve thang trong response, chua gui email
# that (Gmail SMTP that se lam o Phase 8).
def create_staff(db: Session, current_user: User, payload: CreateStaffRequest) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)

    existing_user = get_user_by_email(db, payload.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email da ton tai",
        )

    temp_password = _generate_temp_password()
    user = create_user(
        db,
        email=payload.email,
        password_hash=hash_password(temp_password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=UserRole.STAFF,
        is_active=True,
        is_verified=True,
    )

    staff = create_staff_member_record(
        db,
        user_id=user.id,
        hotel_id=hotel.id,
        position=payload.position,
        hired_at=payload.hired_at,
    )

    data = _serialize_staff(staff, user)
    return CreateStaffResponse(**data, temp_password_mock=temp_password).model_dump(mode="json")


# Xu ly lay danh sach nhan vien cua khach san Admin dang quan ly.
def list_staff(db: Session, current_user: User) -> list[dict]:
    hotel = get_approved_admin_hotel(db, current_user)
    rows = list_staff_with_user_by_hotel(db, hotel.id)
    return [_serialize_staff(staff, user) for staff, user in rows]


# Xu ly Admin cap nhat chuc vu/trang thai lam viec/ngay vao lam cua nhan vien.
def update_staff(db: Session, current_user: User, staff_id: int, payload: UpdateStaffRequest) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    staff = get_staff_member_by_id(db, staff_id)
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nhan vien khong ton tai",
        )
    if staff.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly nhan vien cua khach san minh",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(staff, field, value)

    staff = save_staff_member(db, staff)
    user = get_user_by_id(db, staff.user_id)
    return _serialize_staff(staff, user)
