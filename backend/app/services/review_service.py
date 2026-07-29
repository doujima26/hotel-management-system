from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.enums import BookingStatus, UserRole
from app.models.entities import Review, User
from app.repositories.booking_repository import get_booking_by_id
from app.repositories.hotel_repository import get_hotel_by_id
from app.repositories.review_repository import (
    create_review_record,
    delete_review_record,
    get_review_by_id,
    get_review_by_user_and_booking,
    list_reviews_with_user_by_hotel,
    save_review,
)
from app.schemas.reviews import CreateReviewRequest, DeleteReviewResponse, ReviewResponse, UpdateReviewRequest
from app.services.hotel_service import get_approved_admin_hotel


# Chuyen Review + User thanh du lieu tra ve.
def _serialize_review(review: Review, user: User) -> dict:
    return ReviewResponse(
        id=review.id,
        user_id=review.user_id,
        reviewer_name=user.full_name,
        hotel_id=review.hotel_id,
        booking_id=review.booking_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
    ).model_dump(mode="json")


# Xu ly khach danh gia 1 booking da checked_out. Cap nhat avg_rating/total_reviews
# cua khach san do trigger DB (fn_update_hotel_rating) tu dong xu ly, khong can code them.
def create_review(db: Session, current_user: User, payload: CreateReviewRequest) -> dict:
    booking = get_booking_by_id(db, payload.booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking khong ton tai")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ban chi duoc danh gia booking cua minh")
    if booking.status != BookingStatus.CHECKED_OUT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chi duoc danh gia sau khi da tra phong")
    if get_review_by_user_and_booking(db, current_user.id, booking.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ban da danh gia booking nay roi")

    try:
        review = create_review_record(
            db,
            user_id=current_user.id,
            hotel_id=booking.hotel_id,
            booking_id=booking.id,
            rating=payload.rating,
            comment=payload.comment,
        )
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ban da danh gia booking nay roi") from exc

    return _serialize_review(review, current_user)


# Xu ly lay danh sach danh gia cong khai cua 1 khach san.
def list_hotel_reviews(db: Session, hotel_id: int) -> list[dict]:
    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khach san khong ton tai")

    rows = list_reviews_with_user_by_hotel(db, hotel_id)
    return [_serialize_review(review, user) for review, user in rows]


# Xu ly Admin xem toan bo danh gia cua khach san minh - khac ham cong khai o
# tren, hotel duoc server tu suy ra tu current_user (khong nhan hotel_id tu
# client) giong quy uoc chung cua cac endpoint Admin khac.
def list_hotel_reviews_for_admin(db: Session, current_user: User) -> list[dict]:
    hotel = get_approved_admin_hotel(db, current_user)
    rows = list_reviews_with_user_by_hotel(db, hotel.id)
    return [_serialize_review(review, user) for review, user in rows]


# Xu ly khach tu sua danh gia cua chinh minh. Trigger DB tu cap nhat lai
# avg_rating cua khach san khi rating doi.
def update_review(db: Session, current_user: User, review_id: int, payload: UpdateReviewRequest) -> dict:
    review = get_review_by_id(db, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Danh gia khong ton tai")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ban chi duoc sua danh gia cua minh")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(review, field, value)

    review = save_review(db, review)
    return _serialize_review(review, current_user)


# Xu ly xoa danh gia - tac gia tu xoa, hoac Admin cua khach san go danh gia vi pham.
def delete_review(db: Session, current_user: User, review_id: int) -> dict:
    review = get_review_by_id(db, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Danh gia khong ton tai")

    is_author = review.user_id == current_user.id
    is_hotel_admin = False
    if current_user.role == UserRole.ADMIN:
        hotel = get_hotel_by_id(db, review.hotel_id)
        is_hotel_admin = bool(hotel and hotel.owner_id == current_user.id)

    if not is_author and not is_hotel_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc xoa danh gia cua minh hoac cua khach san minh quan ly",
        )

    delete_review_record(db, review)
    return DeleteReviewResponse(id=review_id).model_dump(mode="json")
