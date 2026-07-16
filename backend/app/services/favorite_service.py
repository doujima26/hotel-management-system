from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.entities import Favorite, Hotel, User
from app.repositories.favorite_repository import (
    create_favorite_record,
    delete_favorite_record,
    get_favorite_by_user_and_hotel,
    list_favorites_with_hotel_by_user,
)
from app.repositories.hotel_repository import get_hotel_by_id
from app.schemas.favorites import FavoriteResponse


# Chuyen Favorite + Hotel thanh du lieu tra ve.
def _serialize_favorite(favorite: Favorite, hotel: Hotel) -> dict:
    return FavoriteResponse(
        id=favorite.id,
        hotel_id=favorite.hotel_id,
        hotel_name=hotel.name,
        city=hotel.city,
        created_at=favorite.created_at,
    ).model_dump(mode="json")


# Xu ly them 1 khach san vao danh sach yeu thich.
def add_favorite(db: Session, current_user: User, hotel_id: int) -> dict:
    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khach san khong ton tai")
    if get_favorite_by_user_and_hotel(db, current_user.id, hotel_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Khach san da co trong danh sach yeu thich")

    try:
        favorite = create_favorite_record(db, user_id=current_user.id, hotel_id=hotel_id)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Khach san da co trong danh sach yeu thich") from exc

    return _serialize_favorite(favorite, hotel)


# Xu ly bo 1 khach san khoi danh sach yeu thich.
def remove_favorite(db: Session, current_user: User, hotel_id: int) -> dict:
    favorite = get_favorite_by_user_and_hotel(db, current_user.id, hotel_id)
    if not favorite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khach san khong co trong danh sach yeu thich")

    delete_favorite_record(db, favorite)
    return {"hotel_id": hotel_id}


# Xu ly lay danh sach khach san yeu thich cua nguoi dung hien tai.
def list_my_favorites(db: Session, current_user: User) -> list[dict]:
    rows = list_favorites_with_hotel_by_user(db, current_user.id)
    return [_serialize_favorite(favorite, hotel) for favorite, hotel in rows]
