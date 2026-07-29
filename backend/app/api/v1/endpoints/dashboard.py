from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.services.dashboard_service import (
    get_hotel_dashboard as get_hotel_dashboard_action,
    get_hotel_operations_overview as get_hotel_operations_overview_action,
    get_platform_dashboard as get_platform_dashboard_action,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# Admin xem dashboard doanh thu/ty le lap day/dich vu cua khach san minh.
@router.get("/hotel")
def get_hotel_dashboard(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = get_hotel_dashboard_action(db, current_user, from_date, to_date)
    return ok(data, "Dashboard khach san")


# Admin xem Dashboard tong quan van hanh (hom nay) cua khach san minh.
@router.get("/hotel/operations")
def get_hotel_operations_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = get_hotel_operations_overview_action(db, current_user)
    return ok(data, "Tong quan van hanh")


# Super Admin xem dashboard tong quan toan nen tang, co the xem chi tiet 1 khach san.
@router.get("/platform")
def get_platform_dashboard(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    hotel_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    data = get_platform_dashboard_action(db, from_date, to_date, hotel_id)
    return ok(data, "Dashboard nen tang")
