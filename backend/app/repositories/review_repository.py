from sqlalchemy.orm import Session

from app.models.entities import Review, User


# Lay danh gia theo nguoi dung va booking, dung de kiem tra da danh gia chua.
def get_review_by_user_and_booking(db: Session, user_id: int, booking_id: int) -> Review | None:
    return db.query(Review).filter(Review.user_id == user_id, Review.booking_id == booking_id).first()


# Tao danh gia moi.
def create_review_record(db: Session, *, user_id: int, hotel_id: int, booking_id: int, rating: int, comment: str | None) -> Review:
    review = Review(
        user_id=user_id,
        hotel_id=hotel_id,
        booking_id=booking_id,
        rating=rating,
        comment=comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


# Lay danh sach danh gia kem thong tin nguoi danh gia theo khach san, moi nhat truoc.
def list_reviews_with_user_by_hotel(db: Session, hotel_id: int) -> list[tuple[Review, User]]:
    return (
        db.query(Review, User)
        .join(User, User.id == Review.user_id)
        .filter(Review.hotel_id == hotel_id)
        .order_by(Review.created_at.desc())
        .all()
    )
