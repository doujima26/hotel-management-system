from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.schemas.staff import (
    CreateStaffRequest,
    CreateStaffScheduleRequest,
    UpdateStaffRequest,
    UpdateStaffScheduleRequest,
)
from app.services.staff_service import (
    create_staff as create_staff_action,
    create_staff_schedule as create_staff_schedule_action,
    delete_staff_schedule as delete_staff_schedule_action,
    get_staff_schedule_calendar as get_staff_schedule_calendar_action,
    list_my_schedules as list_my_schedules_action,
    list_staff as list_staff_action,
    list_staff_schedules_for_admin as list_staff_schedules_for_admin_action,
    update_staff as update_staff_action,
    update_staff_schedule as update_staff_schedule_action,
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


# Admin xep ca lam viec moi cho 1 nhan vien cua khach san minh.
@router.post("/{staff_id}/schedules")
def create_staff_schedule(
    staff_id: int,
    payload: CreateStaffScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = create_staff_schedule_action(db, current_user, staff_id, payload)
    return ok(data, "Xep ca lam viec thanh cong")


# Admin xem lich lam viec cua 1 nhan vien cu the.
@router.get("/{staff_id}/schedules")
def list_staff_schedules_for_admin(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = list_staff_schedules_for_admin_action(db, current_user, staff_id)
    return ok(data, "Lich lam viec cua nhan vien")


# Staff xem lich lam viec cua chinh minh.
@router.get("/schedules/me")
def list_my_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STAFF)),
):
    data = list_my_schedules_action(db, current_user)
    return ok(data, "Lich lam viec cua toi")


# Admin va Staff xem khung lich ca lam viec cua ca khach san theo khoang ngay.
# Dat truoc route "/schedules/{schedule_id}" de khong bi nuot duong dan.
@router.get("/schedules/calendar")
def staff_schedule_calendar(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
):
    data = get_staff_schedule_calendar_action(db, current_user, from_date, to_date)
    return ok(data, "Khung lich ca lam viec")


# Admin cap nhat 1 ca lam viec.
@router.patch("/schedules/{schedule_id}")
def update_staff_schedule(
    schedule_id: int,
    payload: UpdateStaffScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = update_staff_schedule_action(db, current_user, schedule_id, payload)
    return ok(data, "Cap nhat ca lam viec thanh cong")


# Admin xoa 1 ca lam viec da xep nham.
@router.delete("/schedules/{schedule_id}")
def delete_staff_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = delete_staff_schedule_action(db, current_user, schedule_id)
    return ok(data, "Xoa ca lam viec thanh cong")
