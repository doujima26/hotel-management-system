from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.services.favorite_service import (
    add_favorite as add_favorite_action,
    list_my_favorites as list_my_favorites_action,
    remove_favorite as remove_favorite_action,
)

router = APIRouter(prefix="/favorites", tags=["favorites"])


# Khach xem danh sach khach san yeu thich cua minh.
@router.get("")
def list_my_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = list_my_favorites_action(db, current_user)
    return ok(data, "Danh sach yeu thich")


# Khach them 1 khach san vao danh sach yeu thich.
@router.post("/{hotel_id}")
def add_favorite(
    hotel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = add_favorite_action(db, current_user, hotel_id)
    return ok(data, "Them yeu thich thanh cong")


# Khach bo 1 khach san khoi danh sach yeu thich.
@router.delete("/{hotel_id}")
def remove_favorite(
    hotel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = remove_favorite_action(db, current_user, hotel_id)
    return ok(data, "Bo yeu thich thanh cong")
