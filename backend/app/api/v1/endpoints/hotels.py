from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.schemas.hotels import (
    CreateHotelRequest,
    CreateHotelServiceRequest,
    CreatePromotionRequest,
    UpdateHotelServiceRequest,
    UpdatePromotionRequest,
)
from app.services.hotel_service import (
    create_hotel as create_hotel_action,
    create_hotel_service as create_hotel_service_action,
    create_promotion as create_promotion_service_action,
    list_hotel_services as list_hotel_services_action,
    list_promotions as list_promotions_service_action,
    search_hotels as search_hotels_action,
    update_hotel_service as update_hotel_service_action,
    update_promotion as update_promotion_service_action,
)

router = APIRouter(prefix="/hotels", tags=["hotels"])


# Endpoint tam de kiem tra module hotels.
@router.get("")
def hotels_ping():
    return ok({"module": "hotels"}, "Hotels module ready")


# Khach tim kiem khach san cong khai theo thanh pho va tinh trang phong trong.
@router.get("/search")
def search_hotels_endpoint(
    city: str | None = Query(default=None, min_length=1, max_length=100),
    check_in: date | None = Query(default=None),
    check_out: date | None = Query(default=None),
    num_guests: int | None = Query(default=None, gt=0),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    data = search_hotels_action(
        db,
        city=city,
        check_in=check_in,
        check_out=check_out,
        num_guests=num_guests,
        page=page,
        page_size=page_size,
    )
    return ok(data, "Danh sach khach san")


# Admin dang ky khach san moi de cho super admin duyet.
@router.post("")
def create_hotel(
    payload: CreateHotelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = create_hotel_action(db, current_user, payload)
    return ok(data, "Dang ky khach san thanh cong, cho duyet")


# Admin tao dich vu cho khach san cua minh.
@router.post("/services")
def create_hotel_service(
    payload: CreateHotelServiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = create_hotel_service_action(db, current_user, payload)
    return ok(data, "Tao dich vu khach san thanh cong")


# Admin xem danh sach dich vu cua khach san minh.
@router.get("/services")
def list_hotel_services(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = list_hotel_services_action(db, current_user)
    return ok(data, "Danh sach dich vu khach san")


# Admin cap nhat dich vu cua khach san minh.
@router.patch("/services/{service_id}")
def update_hotel_service(
    service_id: int,
    payload: UpdateHotelServiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = update_hotel_service_action(db, current_user, service_id, payload)
    return ok(data, "Cap nhat dich vu khach san thanh cong")


# Admin tao khuyen mai cho khach san cua minh.
@router.post("/promotions")
def create_promotion(
    payload: CreatePromotionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = create_promotion_service_action(db, current_user, payload)
    return ok(data, "Tao khuyen mai thanh cong")


# Admin xem danh sach khuyen mai cua khach san minh.
@router.get("/promotions")
def list_promotions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = list_promotions_service_action(db, current_user)
    return ok(data, "Danh sach khuyen mai")


# Admin cap nhat khuyen mai cua khach san minh.
@router.patch("/promotions/{promotion_id}")
def update_promotion(
    promotion_id: int,
    payload: UpdatePromotionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = update_promotion_service_action(db, current_user, promotion_id, payload)
    return ok(data, "Cap nhat khuyen mai thanh cong")
