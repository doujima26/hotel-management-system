from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import HotelStatus, UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import Hotel, HotelService, Promotion, User
from app.schemas.auth import (
    CreateHotelRequest,
    CreateHotelServiceRequest,
    CreatePromotionRequest,
    UpdateHotelServiceRequest,
    UpdatePromotionRequest,
)

router = APIRouter(prefix="/hotels", tags=["hotels"])


# Lay khach san da duoc duyet cua admin hien tai.
def get_approved_admin_hotel(db: Session, current_user: User) -> Hotel:
    hotel = db.query(Hotel).filter(Hotel.owner_id == current_user.id).first()
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
def validate_promotion_data(
    discount_type: str,
    discount_value: float,
    start_date,
    end_date,
):
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


# Endpoint tam de kiem tra module hotels.
@router.get("")
def hotels_ping():
    return ok({"module": "hotels"}, "Hotels module ready")


# Admin dang ky khach san moi de cho super admin duyet.
@router.post("")
def create_hotel(
    payload: CreateHotelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    existing_hotel = db.query(Hotel).filter(Hotel.owner_id == current_user.id).first()
    if existing_hotel:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Admin nay da dang ky khach san",
        )

    hotel = Hotel(
        owner_id=current_user.id,
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

    return ok(
        {
            "id": hotel.id,
            "owner_id": hotel.owner_id,
            "name": hotel.name,
            "city": hotel.city,
            "status": hotel.status,
            "rejection_reason": hotel.rejection_reason,
        },
        "Dang ky khach san thanh cong, cho duyet",
    )


# Admin tao dich vu cho khach san cua minh.
@router.post("/services")
def create_hotel_service(
    payload: CreateHotelServiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    hotel = get_approved_admin_hotel(db, current_user)

    existing_service = (
        db.query(HotelService)
        .filter(HotelService.hotel_id == hotel.id, HotelService.name == payload.name)
        .first()
    )
    if existing_service:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Dich vu da ton tai trong khach san",
        )

    service = HotelService(
        hotel_id=hotel.id,
        name=payload.name,
        description=payload.description,
        price=payload.price,
        unit=payload.unit,
        is_active=True,
    )
    db.add(service)
    db.commit()
    db.refresh(service)

    return ok(
        {
            "id": service.id,
            "hotel_id": service.hotel_id,
            "name": service.name,
            "description": service.description,
            "price": float(service.price),
            "unit": service.unit,
            "is_active": service.is_active,
        },
        "Tao dich vu khach san thanh cong",
    )


# Admin xem danh sach dich vu cua khach san minh.
@router.get("/services")
def list_hotel_services(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    hotel = get_approved_admin_hotel(db, current_user)
    services = db.query(HotelService).filter(HotelService.hotel_id == hotel.id).order_by(HotelService.name.asc()).all()

    data = [
        {
            "id": item.id,
            "hotel_id": item.hotel_id,
            "name": item.name,
            "description": item.description,
            "price": float(item.price),
            "unit": item.unit,
            "is_active": item.is_active,
        }
        for item in services
    ]
    return ok(data, "Danh sach dich vu khach san")


# Admin cap nhat dich vu cua khach san minh.
@router.patch("/services/{service_id}")
def update_hotel_service(
    service_id: int,
    payload: UpdateHotelServiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    hotel = get_approved_admin_hotel(db, current_user)
    service = db.query(HotelService).filter(HotelService.id == service_id).first()
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

    db.add(service)
    db.commit()
    db.refresh(service)

    return ok(
        {
            "id": service.id,
            "hotel_id": service.hotel_id,
            "name": service.name,
            "description": service.description,
            "price": float(service.price),
            "unit": service.unit,
            "is_active": service.is_active,
        },
        "Cap nhat dich vu khach san thanh cong",
    )


# Admin tao khuyen mai cho khach san cua minh.
@router.post("/promotions")
def create_promotion(
    payload: CreatePromotionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    hotel = get_approved_admin_hotel(db, current_user)
    validate_promotion_data(payload.discount_type, payload.discount_value, payload.start_date, payload.end_date)

    promotion = Promotion(
        hotel_id=hotel.id,
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

    return ok(
        {
            "id": promotion.id,
            "hotel_id": promotion.hotel_id,
            "name": promotion.name,
            "discount_type": promotion.discount_type,
            "discount_value": float(promotion.discount_value),
            "start_date": promotion.start_date,
            "end_date": promotion.end_date,
            "usage_limit": promotion.usage_limit,
            "used_count": promotion.used_count,
            "is_active": promotion.is_active,
        },
        "Tao khuyen mai thanh cong",
    )


# Admin xem danh sach khuyen mai cua khach san minh.
@router.get("/promotions")
def list_promotions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    hotel = get_approved_admin_hotel(db, current_user)
    promotions = db.query(Promotion).filter(Promotion.hotel_id == hotel.id).order_by(Promotion.start_date.desc()).all()

    data = [
        {
            "id": item.id,
            "hotel_id": item.hotel_id,
            "name": item.name,
            "description": item.description,
            "discount_type": item.discount_type,
            "discount_value": float(item.discount_value),
            "min_booking_amount": float(item.min_booking_amount) if item.min_booking_amount is not None else None,
            "max_discount_amount": float(item.max_discount_amount) if item.max_discount_amount is not None else None,
            "start_date": item.start_date,
            "end_date": item.end_date,
            "usage_limit": item.usage_limit,
            "used_count": item.used_count,
            "is_active": item.is_active,
        }
        for item in promotions
    ]
    return ok(data, "Danh sach khuyen mai")


# Admin cap nhat khuyen mai cua khach san minh.
@router.patch("/promotions/{promotion_id}")
def update_promotion(
    promotion_id: int,
    payload: UpdatePromotionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    hotel = get_approved_admin_hotel(db, current_user)
    promotion = db.query(Promotion).filter(Promotion.id == promotion_id).first()
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

    db.add(promotion)
    db.commit()
    db.refresh(promotion)

    return ok(
        {
            "id": promotion.id,
            "hotel_id": promotion.hotel_id,
            "name": promotion.name,
            "discount_type": promotion.discount_type,
            "discount_value": float(promotion.discount_value),
            "start_date": promotion.start_date,
            "end_date": promotion.end_date,
            "usage_limit": promotion.usage_limit,
            "used_count": promotion.used_count,
            "is_active": promotion.is_active,
        },
        "Cap nhat khuyen mai thanh cong",
    )
