from sqlalchemy.orm import Session

from app.models.entities import Favorite, Hotel


# Lay 1 yeu thich theo nguoi dung va khach san.
def get_favorite_by_user_and_hotel(db: Session, user_id: int, hotel_id: int) -> Favorite | None:
    return db.query(Favorite).filter(Favorite.user_id == user_id, Favorite.hotel_id == hotel_id).first()


# Them khach san vao danh sach yeu thich.
def create_favorite_record(db: Session, *, user_id: int, hotel_id: int) -> Favorite:
    favorite = Favorite(user_id=user_id, hotel_id=hotel_id)
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


# Xoa 1 yeu thich.
def delete_favorite_record(db: Session, favorite: Favorite) -> None:
    db.delete(favorite)
    db.commit()


# Lay danh sach yeu thich kem thong tin khach san cua 1 nguoi dung, moi nhat truoc.
def list_favorites_with_hotel_by_user(db: Session, user_id: int) -> list[tuple[Favorite, Hotel]]:
    return (
        db.query(Favorite, Hotel)
        .join(Hotel, Hotel.id == Favorite.hotel_id)
        .filter(Favorite.user_id == user_id)
        .order_by(Favorite.created_at.desc())
        .all()
    )
