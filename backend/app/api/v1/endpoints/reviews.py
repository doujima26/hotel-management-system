from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.schemas.reviews import CreateReviewRequest, UpdateReviewRequest
from app.services.review_service import (
    create_review as create_review_action,
    delete_review as delete_review_action,
    get_room_type_review_breakdown_for_admin as get_room_type_review_breakdown_action,
    list_hotel_reviews as list_hotel_reviews_action,
    list_hotel_reviews_for_admin as list_hotel_reviews_for_admin_action,
    update_review as update_review_action,
)

router = APIRouter(prefix="/reviews", tags=["reviews"])


# Khach danh gia 1 booking da tra phong.
@router.post("")
def create_review(
    payload: CreateReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = create_review_action(db, current_user, payload)
    return ok(data, "Danh gia thanh cong")


# Admin xem toan bo danh gia cua khach san minh.
@router.get("/hotel")
def list_hotel_reviews_for_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = list_hotel_reviews_for_admin_action(db, current_user)
    return ok(data, "Danh sach danh gia khach san")


# Admin xem phan bo danh gia theo loai phong cua khach san minh.
@router.get("/hotel/room-type-breakdown")
def get_room_type_review_breakdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = get_room_type_review_breakdown_action(db, current_user)
    return ok(data, "Phan bo danh gia theo loai phong")


# Xem danh sach danh gia cong khai cua 1 khach san.
@router.get("")
def list_hotel_reviews(
    hotel_id: int = Query(gt=0),
    db: Session = Depends(get_db),
):
    data = list_hotel_reviews_action(db, hotel_id)
    return ok(data, "Danh sach danh gia")


# Khach tu sua danh gia cua chinh minh.
@router.patch("/{review_id}")
def update_review(
    review_id: int,
    payload: UpdateReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = update_review_action(db, current_user, review_id, payload)
    return ok(data, "Cap nhat danh gia thanh cong")


# Khach tu xoa danh gia cua minh, hoac Admin go danh gia vi pham cua khach san minh.
@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER, UserRole.ADMIN)),
):
    data = delete_review_action(db, current_user, review_id)
    return ok(data, "Xoa danh gia thanh cong")
