from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.services.revenue_service import get_hotel_revenue_dashboard as get_hotel_revenue_dashboard_action

router = APIRouter(prefix="/revenue", tags=["revenue"])


# Admin xem bao cao doanh thu (kinh doanh/tai chinh) cua khach san minh.
@router.get("/hotel")
def get_hotel_revenue_dashboard(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = get_hotel_revenue_dashboard_action(db, current_user, from_date, to_date)
    return ok(data, "Bao cao doanh thu")
