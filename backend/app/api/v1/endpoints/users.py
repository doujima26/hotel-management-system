from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.schemas.users import UpdateUserRequest
from app.services.user_service import update_my_profile

router = APIRouter(prefix="/users", tags=["users"])


# Endpoint tam de kiem tra module users.
@router.get("")
def users_ping():
    return ok({"module": "users"}, "Users module ready")


# Nguoi dung dang dang nhap tu cap nhat ho so cua minh.
@router.patch("/me")
def update_me(
    payload: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = update_my_profile(db, current_user, payload)
    return ok(data, "Cap nhat ho so thanh cong")
