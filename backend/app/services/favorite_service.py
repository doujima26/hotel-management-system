from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.enums import HotelStatus
from app.models.entities import Favorite, Hotel, User
from app.repositories.favorite_repository import (
    create_favorite_record,
    delete_favorite_record,
    get_favorite_by_user_and_hotel,
    list_favorites_with_hotel_by_user,
)
from app.repositories.hotel_repository import (
    get_hotel_by_id,
    get_min_active_room_price_by_hotel_ids,
    get_primary_image_url_by_hotel_ids,
)
from app.schemas.favorites import FavoriteResponse
from app.services.hotel_service import SeasonalDeal, get_seasonal_deals_for_hotels


# Chuyen Favorite + Hotel thanh du lieu tra ve. Cac tham so bo sung duoc nap
# theo lo o list_my_favorites de tranh N+1; khi them/bo yeu thich thi khong can
# nen de trong.
def _serialize_favorite(
    favorite: Favorite,
    hotel: Hotel,
    *,
    image_url: str | None = None,
    from_price: float | None = None,
    deal: SeasonalDeal | None = None,
) -> dict:
    return FavoriteResponse(
        id=favorite.id,
        hotel_id=favorite.hotel_id,
        hotel_name=hotel.name,
        city=hotel.city,
        district=hotel.district,
        address=hotel.address,
        star_rating=hotel.star_rating,
        avg_rating=float(hotel.avg_rating),
        total_reviews=hotel.total_reviews,
        primary_image_url=image_url,
        from_price=from_price,
        is_bookable=hotel.status == HotelStatus.APPROVED,
        deal_label=deal.label if deal else None,
        deal_discount_percent=round(deal.discount_percent, 1) if deal else None,
        deal_starts_on=deal.starts_on if deal else None,
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


# Xu ly lay danh sach khach san yeu thich cua nguoi dung hien tai. Nap anh, gia
# re nhat va uu dai theo mua theo lo cho ca danh sach thay vi tung khach san.
def list_my_favorites(db: Session, current_user: User) -> list[dict]:
    rows = list_favorites_with_hotel_by_user(db, current_user.id)
    if not rows:
        return []

    hotel_ids = [hotel.id for _favorite, hotel in rows]
    image_urls = get_primary_image_url_by_hotel_ids(db, hotel_ids)
    min_prices = get_min_active_room_price_by_hotel_ids(db, hotel_ids)
    # Chi gioi thieu uu dai cua khach san con nhan dat phong.
    bookable_ids = [hotel.id for _favorite, hotel in rows if hotel.status == HotelStatus.APPROVED]
    deals = get_seasonal_deals_for_hotels(db, bookable_ids)

    return [
        _serialize_favorite(
            favorite,
            hotel,
            image_url=image_urls.get(hotel.id),
            from_price=min_prices.get(hotel.id),
            deal=deals.get(hotel.id),
        )
        for favorite, hotel in rows
    ]
