from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.schemas.auth import SetUserActiveRequest
from app.services.auth_service import set_user_active

router = APIRouter(prefix="/admin", tags=["admin"])


# Endpoint tam de kiem tra module admin.
@router.get("")
def admin_ping():
    return ok({"module": "admin"}, "Admin module ready")


# Super admin khoa hoac mo tai khoan nguoi dung.
@router.patch("/users/{user_id}/active")
def set_user_active_endpoint(
    user_id: int,
    payload: SetUserActiveRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    data = set_user_active(db, user_id, payload)
    return ok(data, "Cap nhat trang thai tai khoan thanh cong")
