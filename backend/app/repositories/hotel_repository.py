from sqlalchemy.orm import Session

from app.core.enums import HotelStatus
from app.models.entities import Hotel, HotelService, Promotion
from app.schemas.hotels import (
    CreateHotelRequest,
    CreateHotelServiceRequest,
    CreatePromotionRequest,
)


# Lay khach san theo chu so huu.
def get_hotel_by_owner(db: Session, owner_id: int) -> Hotel | None:
    return db.query(Hotel).filter(Hotel.owner_id == owner_id).first()


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
        discount_type=payload.discount_type,
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
