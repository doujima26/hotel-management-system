from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.schemas.staff import CreateStaffRequest, UpdateStaffRequest
from app.services.staff_service import (
    create_staff as create_staff_action,
    list_staff as list_staff_action,
    update_staff as update_staff_action,
)

router = APIRouter(prefix="/staff", tags=["staff"])


# Admin tao nhan vien moi cho khach san cua minh.
@router.post("")
def create_staff(
    payload: CreateStaffRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = create_staff_action(db, current_user, payload)
    return ok(data, "Tao nhan vien thanh cong")


# Admin xem danh sach nhan vien cua khach san minh.
@router.get("")
def list_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = list_staff_action(db, current_user)
    return ok(data, "Danh sach nhan vien")


# Admin cap nhat chuc vu/trang thai lam viec/ngay vao lam cua nhan vien.
@router.patch("/{staff_id}")
def update_staff(
    staff_id: int,
    payload: UpdateStaffRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = update_staff_action(db, current_user, staff_id, payload)
    return ok(data, "Cap nhat nhan vien thanh cong")
