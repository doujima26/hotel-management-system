from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.services.payment_service import get_payment_detail as get_payment_detail_action

router = APIRouter(prefix="/payments", tags=["payments"])


# Khach xem chi tiet 1 thanh toan cua minh.
@router.get("/{payment_id}")
def get_payment_detail(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = get_payment_detail_action(db, current_user, payment_id)
    return ok(data, "Chi tiet thanh toan")
