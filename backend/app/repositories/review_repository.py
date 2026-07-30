from sqlalchemy.orm import Session

from app.models.entities import Booking, Review, User


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


# Lay danh sach danh gia kem nguoi danh gia va don booking theo khach san, moi
# nhat truoc. Join booking ngay tai day de khong phai truy van lai theo tung
# danh gia khi can hien ma don va ngay luu tru.
def list_reviews_with_user_and_booking_by_hotel(db: Session, hotel_id: int) -> list[tuple[Review, User, Booking]]:
    return (
        db.query(Review, User, Booking)
        .join(User, User.id == Review.user_id)
        .join(Booking, Booking.id == Review.booking_id)
        .filter(Review.hotel_id == hotel_id)
        .order_by(Review.created_at.desc())
        .all()
    )


# Lay danh gia theo id.
def get_review_by_id(db: Session, review_id: int) -> Review | None:
    return db.query(Review).filter(Review.id == review_id).first()


# Luu thay doi danh gia (sua rating/comment).
def save_review(db: Session, review: Review) -> Review:
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


# Xoa danh gia. Trigger DB (fn_update_hotel_rating) tu dong cap nhat lai
# avg_rating/total_reviews cua khach san, khong can code them.
def delete_review_record(db: Session, review: Review) -> None:
    db.delete(review)
    db.commit()
