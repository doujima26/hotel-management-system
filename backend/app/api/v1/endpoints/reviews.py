from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.schemas.reviews import CreateReviewRequest
from app.services.review_service import create_review as create_review_action, list_hotel_reviews as list_hotel_reviews_action

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


# Xem danh sach danh gia cong khai cua 1 khach san.
@router.get("")
def list_hotel_reviews(
    hotel_id: int = Query(gt=0),
    db: Session = Depends(get_db),
):
    data = list_hotel_reviews_action(db, hotel_id)
    return ok(data, "Danh sach danh gia")
