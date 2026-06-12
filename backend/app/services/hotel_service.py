from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.enums import HotelStatus
from app.models.entities import Hotel, HotelService, Promotion, User
from app.repositories.hotel_repository import (
    create_hotel_record,
    create_hotel_service_record,
    create_promotion_record,
    get_hotel_by_owner,
    get_hotel_service_by_id,
    get_hotel_service_by_name,
    get_promotion_by_id,
    list_hotel_service_records,
    list_promotion_records,
    save_hotel_service,
    save_promotion,
)
from app.schemas.hotels import (
    CreateHotelRequest,
    CreateHotelServiceRequest,
    CreatePromotionRequest,
    UpdateHotelServiceRequest,
    UpdatePromotionRequest,
)


# Chuyen khach san thanh du lieu tra ve.
def serialize_hotel(hotel: Hotel) -> dict:
    return {
        "id": hotel.id,
        "owner_id": hotel.owner_id,
        "name": hotel.name,
        "city": hotel.city,
        "status": hotel.status,
        "rejection_reason": hotel.rejection_reason,
    }


# Chuyen dich vu khach san thanh du lieu tra ve.
def serialize_hotel_service(service: HotelService) -> dict:
    return {
        "id": service.id,
        "hotel_id": service.hotel_id,
        "name": service.name,
        "description": service.description,
        "price": float(service.price),
        "unit": service.unit,
        "is_active": service.is_active,
    }


# Chuyen khuyen mai thanh du lieu tra ve.
def serialize_promotion(promotion: Promotion) -> dict:
    return {
        "id": promotion.id,
        "hotel_id": promotion.hotel_id,
        "name": promotion.name,
        "description": promotion.description,
        "discount_type": promotion.discount_type,
        "discount_value": float(promotion.discount_value),
        "min_booking_amount": float(promotion.min_booking_amount) if promotion.min_booking_amount is not None else None,
        "max_discount_amount": float(promotion.max_discount_amount) if promotion.max_discount_amount is not None else None,
        "start_date": promotion.start_date,
        "end_date": promotion.end_date,
        "usage_limit": promotion.usage_limit,
        "used_count": promotion.used_count,
        "is_active": promotion.is_active,
    }


# Lay khach san da duoc duyet cua admin hien tai.
def get_approved_admin_hotel(db: Session, current_user: User) -> Hotel:
    hotel = get_hotel_by_owner(db, current_user.id)
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin chua dang ky khach san",
        )
    if hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khach san chua duoc duyet de van hanh",
        )
    return hotel


# Kiem tra khuyen mai co du lieu hop le.
def validate_promotion_data(discount_type: str, discount_value: float, start_date, end_date):
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngay ket thuc phai lon hon hoac bang ngay bat dau",
        )
    if discount_type == "percentage" and discount_value > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gia tri giam theo phan tram khong duoc vuot qua 100",
        )


# Xu ly admin dang ky khach san moi.
def create_hotel(db: Session, current_user: User, payload: CreateHotelRequest) -> dict:
    existing_hotel = get_hotel_by_owner(db, current_user.id)
    if existing_hotel:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Admin nay da dang ky khach san",
        )

    hotel = create_hotel_record(db, current_user.id, payload)
    return serialize_hotel(hotel)


# Xu ly tao dich vu khach san.
def create_hotel_service(db: Session, current_user: User, payload: CreateHotelServiceRequest) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    existing_service = get_hotel_service_by_name(db, hotel.id, payload.name)
    if existing_service:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Dich vu da ton tai trong khach san",
        )

    service = create_hotel_service_record(db, hotel.id, payload)
    return serialize_hotel_service(service)


# Xu ly lay danh sach dich vu khach san.
def list_hotel_services(db: Session, current_user: User) -> list[dict]:
    hotel = get_approved_admin_hotel(db, current_user)
    services = list_hotel_service_records(db, hotel.id)
    return [serialize_hotel_service(item) for item in services]


# Xu ly cap nhat dich vu khach san.
def update_hotel_service(
    db: Session,
    current_user: User,
    service_id: int,
    payload: UpdateHotelServiceRequest,
) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    service = get_hotel_service_by_id(db, service_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dich vu khong ton tai",
        )
    if service.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly dich vu cua khach san minh",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)

    service = save_hotel_service(db, service)
    return serialize_hotel_service(service)


# Xu ly tao khuyen mai.
def create_promotion(db: Session, current_user: User, payload: CreatePromotionRequest) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    validate_promotion_data(payload.discount_type, payload.discount_value, payload.start_date, payload.end_date)
    promotion = create_promotion_record(db, hotel.id, payload)
    return serialize_promotion(promotion)


# Xu ly lay danh sach khuyen mai.
def list_promotions(db: Session, current_user: User) -> list[dict]:
    hotel = get_approved_admin_hotel(db, current_user)
    promotions = list_promotion_records(db, hotel.id)
    return [serialize_promotion(item) for item in promotions]


# Xu ly cap nhat khuyen mai.
def update_promotion(
    db: Session,
    current_user: User,
    promotion_id: int,
    payload: UpdatePromotionRequest,
) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    promotion = get_promotion_by_id(db, promotion_id)
    if not promotion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khuyen mai khong ton tai",
        )
    if promotion.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly khuyen mai cua khach san minh",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(promotion, field, value)

    validate_promotion_data(
        promotion.discount_type,
        float(promotion.discount_value),
        promotion.start_date,
        promotion.end_date,
    )

    promotion = save_promotion(db, promotion)
    return serialize_promotion(promotion)
