from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.enums import DiscountType, HotelStatus
from app.models.entities import Hotel, HotelImage, HotelService, Promotion, RoomType
from app.repositories.booking_repository import booked_quantity_subquery
from app.schemas.hotels import (
    CreateHotelImageRequest,
    CreateHotelRequest,
    CreateHotelServiceRequest,
    CreatePromotionRequest,
)


# Lay khach san theo chu so huu.
def get_hotel_by_owner(db: Session, owner_id: int) -> Hotel | None:
    return db.query(Hotel).filter(Hotel.owner_id == owner_id).first()


# Lay khach san theo id.
def get_hotel_by_id(db: Session, hotel_id: int) -> Hotel | None:
    return db.query(Hotel).filter(Hotel.id == hotel_id).first()


# Tao khach san moi.
def create_hotel_record(db: Session, owner_id: int, payload: CreateHotelRequest) -> Hotel:
    hotel = Hotel(
        owner_id=owner_id,
        name=payload.name,
        description=payload.description,
        address=payload.address,
        city=payload.city,
        district=payload.district,
        phone=payload.phone,
        email=payload.email,
        star_rating=payload.star_rating,
        status=HotelStatus.PENDING,
    )
    db.add(hotel)
    db.commit()
    db.refresh(hotel)
    return hotel


# Luu thay doi khach san.
def save_hotel(db: Session, hotel: Hotel) -> Hotel:
    db.add(hotel)
    db.commit()
    db.refresh(hotel)
    return hotel


# Tim kiem khach san da duyet theo thanh pho va tinh trang phong trong trong khoang ngay.
def search_hotel_records(
    db: Session,
    *,
    city: str | None,
    check_in: date | None,
    check_out: date | None,
    num_guests: int | None,
    page: int,
    page_size: int,
) -> tuple[list[Hotel], int]:
    query = db.query(Hotel).filter(Hotel.status == HotelStatus.APPROVED)

    if city:
        query = query.filter(Hotel.city.ilike(f"%{city}%"))

    if check_in and check_out:
        booked_subquery = booked_quantity_subquery(db, check_in, check_out)
        available_hotel_ids = (
            db.query(RoomType.hotel_id)
            .outerjoin(booked_subquery, booked_subquery.c.room_type_id == RoomType.id)
            .filter(
                RoomType.is_active.is_(True),
                (RoomType.total_rooms - func.coalesce(booked_subquery.c.booked_quantity, 0)) > 0,
            )
        )
        if num_guests:
            available_hotel_ids = available_hotel_ids.filter(RoomType.max_guests >= num_guests)
        query = query.filter(Hotel.id.in_(available_hotel_ids.distinct().scalar_subquery()))

    total = query.count()
    hotels = (
        query.order_by(Hotel.avg_rating.desc(), Hotel.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return hotels, total


# Lay danh sach khach san cho super admin duyet, loc theo trang thai (khong loc neu None).
def list_hotel_records_for_admin(
    db: Session,
    *,
    status_filter: HotelStatus | None,
    page: int,
    page_size: int,
) -> tuple[list[Hotel], int]:
    query = db.query(Hotel)
    if status_filter:
        query = query.filter(Hotel.status == status_filter)

    total = query.count()
    hotels = (
        query.order_by(Hotel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return hotels, total


# Lay dich vu theo ten trong khach san.
def get_hotel_service_by_name(db: Session, hotel_id: int, name: str) -> HotelService | None:
    return db.query(HotelService).filter(HotelService.hotel_id == hotel_id, HotelService.name == name).first()


# Lay dich vu theo id.
def get_hotel_service_by_id(db: Session, service_id: int) -> HotelService | None:
    return db.query(HotelService).filter(HotelService.id == service_id).first()


# Tao dich vu khach san.
def create_hotel_service_record(db: Session, hotel_id: int, payload: CreateHotelServiceRequest) -> HotelService:
    service = HotelService(
        hotel_id=hotel_id,
        name=payload.name,
        description=payload.description,
        price=payload.price,
        unit=payload.unit,
        is_active=True,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


# Lay danh sach dich vu theo khach san.
def list_hotel_service_records(db: Session, hotel_id: int) -> list[HotelService]:
    return db.query(HotelService).filter(HotelService.hotel_id == hotel_id).order_by(HotelService.name.asc()).all()


# Luu thay doi dich vu khach san.
def save_hotel_service(db: Session, service: HotelService) -> HotelService:
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


# Lay khuyen mai theo id.
def get_promotion_by_id(db: Session, promotion_id: int) -> Promotion | None:
    return db.query(Promotion).filter(Promotion.id == promotion_id).first()


# Tao khuyen mai.
def create_promotion_record(db: Session, hotel_id: int, payload: CreatePromotionRequest) -> Promotion:
    promotion = Promotion(
        hotel_id=hotel_id,
        name=payload.name,
        description=payload.description,
        discount_type=DiscountType(payload.discount_type),
        discount_value=payload.discount_value,
        min_booking_amount=payload.min_booking_amount,
        max_discount_amount=payload.max_discount_amount,
        start_date=payload.start_date,
        end_date=payload.end_date,
        usage_limit=payload.usage_limit,
        used_count=0,
        is_active=True,
    )
    db.add(promotion)
    db.commit()
    db.refresh(promotion)
    return promotion


# Lay danh sach khuyen mai theo khach san.
def list_promotion_records(db: Session, hotel_id: int) -> list[Promotion]:
    return db.query(Promotion).filter(Promotion.hotel_id == hotel_id).order_by(Promotion.start_date.desc()).all()


# Luu thay doi khuyen mai.
def save_promotion(db: Session, promotion: Promotion) -> Promotion:
    db.add(promotion)
    db.commit()
    db.refresh(promotion)
    return promotion


# Tao anh moi cho khach san.
def create_hotel_image_record(db: Session, hotel_id: int, payload: CreateHotelImageRequest) -> HotelImage:
    if payload.is_primary:
        db.query(HotelImage).filter(
            HotelImage.hotel_id == hotel_id,
            HotelImage.is_primary.is_(True),
        ).update({"is_primary": False})

    max_sort_order = db.query(func.max(HotelImage.sort_order)).filter(HotelImage.hotel_id == hotel_id).scalar()
    image = HotelImage(
        hotel_id=hotel_id,
        image_url=payload.image_url,
        is_primary=payload.is_primary,
        sort_order=(max_sort_order or 0) + 1,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


# Lay danh sach anh theo khach san.
def list_hotel_image_records(db: Session, hotel_id: int) -> list[HotelImage]:
    return db.query(HotelImage).filter(HotelImage.hotel_id == hotel_id).order_by(HotelImage.sort_order.asc()).all()


# Lay anh khach san theo id.
def get_hotel_image_by_id(db: Session, image_id: int) -> HotelImage | None:
    return db.query(HotelImage).filter(HotelImage.id == image_id).first()


# Xoa anh khach san.
def delete_hotel_image_record(db: Session, image: HotelImage) -> None:
    db.delete(image)
    db.commit()


# Dat mot anh lam anh dai dien va bo dai dien cac anh con lai.
def set_hotel_image_primary(db: Session, hotel_id: int, image: HotelImage) -> HotelImage:
    db.query(HotelImage).filter(
        HotelImage.hotel_id == hotel_id,
        HotelImage.id != image.id,
    ).update({"is_primary": False})
    image.is_primary = True
    db.add(image)
    db.commit()
    db.refresh(image)
    return image
