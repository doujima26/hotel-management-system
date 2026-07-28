from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import HotelSortOption, UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.schemas.hotels import (
    CreateHotelImageRequest,
    CreateHotelRequest,
    CreateHotelServiceRequest,
    CreatePromotionRequest,
    UpdateHotelRequest,
    UpdateHotelServiceRequest,
    UpdatePromotionRequest,
)
from app.services.hotel_service import (
    assign_hotel_amenity as assign_hotel_amenity_action,
    create_hotel as create_hotel_action,
    create_hotel_image as create_hotel_image_action,
    create_hotel_service as create_hotel_service_action,
    create_promotion as create_promotion_service_action,
    delete_hotel_image as delete_hotel_image_action,
    delete_hotel_service as delete_hotel_service_action,
    delete_promotion as delete_promotion_service_action,
    get_hotel_detail as get_hotel_detail_action,
    get_my_hotel as get_my_hotel_action,
    get_search_filters as get_search_filters_action,
    list_hotel_amenities as list_hotel_amenities_action,
    list_hotel_images as list_hotel_images_action,
    list_hotel_services as list_hotel_services_action,
    list_promotions as list_promotions_service_action,
    list_top_rated_hotels as list_top_rated_hotels_action,
    list_trending_deals as list_trending_deals_action,
    list_public_hotel_services as list_public_hotel_services_action,
    list_valid_promotions_for_hotel as list_valid_promotions_for_hotel_action,
    search_hotels as search_hotels_action,
    set_primary_hotel_image as set_primary_hotel_image_action,
    unassign_hotel_amenity as unassign_hotel_amenity_action,
    update_hotel as update_hotel_action,
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
    sort: HotelSortOption = Query(default=HotelSortOption.RECOMMENDED),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    stars: list[int] | None = Query(default=None),
    min_rating: float | None = Query(default=None, ge=0, le=5),
    districts: list[str] | None = Query(default=None),
    amenities: list[str] | None = Query(default=None),
    room_amenities: list[str] | None = Query(default=None),
    services: list[str] | None = Query(default=None),
    has_promotion: bool = Query(default=False),
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
        sort=sort,
        min_price=min_price,
        max_price=max_price,
        star_ratings=stars,
        min_rating=min_rating,
        districts=districts,
        amenities=amenities,
        room_amenities=room_amenities,
        services=services,
        has_promotion=has_promotion,
        page=page,
        page_size=page_size,
    )
    return ok(data, "Danh sach khach san")


# Khach lay danh sach option cho sidebar loc theo thanh pho dang xem - cong khai.
@router.get("/search/filters")
def get_search_filters_endpoint(
    city: str | None = Query(default=None, min_length=1, max_length=100),
    check_in: date | None = Query(default=None),
    check_out: date | None = Query(default=None),
    num_guests: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    data = get_search_filters_action(
        db,
        city=city,
        check_in=check_in,
        check_out=check_out,
        num_guests=num_guests,
    )
    return ok(data, "Bo loc tim kiem")


# Khach xem danh sach khach san dang co uu dai giam gia sau nhat, dung cho
# trang chu - cong khai, khong can dang nhap.
@router.get("/highlights/deals")
def list_trending_deals_endpoint(
    limit: int = Query(default=15, ge=1, le=50),
    db: Session = Depends(get_db),
):
    data = list_trending_deals_action(db, limit=limit)
    return ok(data, "Danh sach khach san dang uu dai")


# Khach xem danh sach khach san duoc yeu thich nhat (diem/so luot danh gia cao
# nhat), dung cho trang chu - cong khai, khong can dang nhap.
@router.get("/highlights/top-rated")
def list_top_rated_hotels_endpoint(
    limit: int = Query(default=15, ge=1, le=50),
    db: Session = Depends(get_db),
):
    data = list_top_rated_hotels_action(db, limit=limit)
    return ok(data, "Danh sach khach san duoc yeu thich")


# Admin dang ky khach san moi de cho super admin duyet.
@router.post("")
def create_hotel(
    payload: CreateHotelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = create_hotel_action(db, current_user, payload)
    return ok(data, "Dang ky khach san thanh cong, cho duyet")


# Admin xem lai thong tin khach san cua minh (biet id + trang thai duyet, ke ca dang pending).
# Dat truoc "/{hotel_id}" de tranh bi route dong nuot mat.
@router.get("/me")
def get_my_hotel(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = get_my_hotel_action(db, current_user)
    return ok(data, "Thong tin khach san cua toi")


# Admin cap nhat thong tin khach san cua minh.
@router.patch("")
def update_hotel(
    payload: UpdateHotelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = update_hotel_action(db, current_user, payload)
    return ok(data, "Cap nhat thong tin khach san thanh cong")


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


# Admin xoa cung dich vu cua khach san minh (chi khi chua tung duoc khach dat).
@router.delete("/services/{service_id}")
def delete_hotel_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = delete_hotel_service_action(db, current_user, service_id)
    return ok(data, "Xoa dich vu khach san thanh cong")


# Admin gan tien nghi chung (tu danh muc Super Admin quan ly) vao khach san minh.
@router.post("/amenities/{amenity_id}")
def assign_hotel_amenity(
    amenity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = assign_hotel_amenity_action(db, current_user, amenity_id)
    return ok(data, "Gan tien nghi vao khach san thanh cong")


# Admin go tien nghi chung khoi khach san minh (khong xoa khoi danh muc).
@router.delete("/amenities/{amenity_id}")
def unassign_hotel_amenity(
    amenity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = unassign_hotel_amenity_action(db, current_user, amenity_id)
    return ok(data, "Go tien nghi khoi khach san thanh cong")


# Admin xem danh sach tien nghi chung da gan cho khach san minh.
@router.get("/amenities")
def list_hotel_amenities(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = list_hotel_amenities_action(db, current_user)
    return ok(data, "Danh sach tien nghi khach san")


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


# Admin xoa cung khuyen mai cua khach san minh (chi khi chua co booking nao dung).
@router.delete("/promotions/{promotion_id}")
def delete_promotion(
    promotion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = delete_promotion_service_action(db, current_user, promotion_id)
    return ok(data, "Xoa khuyen mai thanh cong")


# Admin them anh cho khach san cua minh.
@router.post("/images")
def create_hotel_image(
    payload: CreateHotelImageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = create_hotel_image_action(db, current_user, payload)
    return ok(data, "Them anh khach san thanh cong")


# Admin xem danh sach anh cua khach san minh.
@router.get("/images")
def list_hotel_images(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = list_hotel_images_action(db, current_user)
    return ok(data, "Danh sach anh khach san")


# Admin xoa anh cua khach san minh.
@router.delete("/images/{image_id}")
def delete_hotel_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = delete_hotel_image_action(db, current_user, image_id)
    return ok(data, "Xoa anh khach san thanh cong")


# Admin dat anh dai dien cho khach san minh.
@router.patch("/images/{image_id}/primary")
def set_primary_hotel_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = set_primary_hotel_image_action(db, current_user, image_id)
    return ok(data, "Dat anh dai dien thanh cong")


# Khach xem danh sach khuyen mai dang hop le cua 1 khach san (cong khai), de
# biet duoc promotion_id nao co the dung khi dat phong.
@router.get("/{hotel_id}/promotions")
def list_valid_promotions_for_hotel(
    hotel_id: int,
    db: Session = Depends(get_db),
):
    data = list_valid_promotions_for_hotel_action(db, hotel_id)
    return ok(data, "Danh sach khuyen mai dang hop le")


# Khach xem danh sach dich vu dang bat cua 1 khach san (cong khai), dung o trang
# checkout de chon dich vu them.
@router.get("/{hotel_id}/services")
def list_public_hotel_services(
    hotel_id: int,
    db: Session = Depends(get_db),
):
    data = list_public_hotel_services_action(db, hotel_id)
    return ok(data, "Danh sach dich vu khach san")


# Khach xem chi tiet 1 khach san cong khai. Dat cuoi file de khong nuot cac route co dinh o tren.
@router.get("/{hotel_id}")
def get_hotel_detail(
    hotel_id: int,
    db: Session = Depends(get_db),
):
    data = get_hotel_detail_action(db, hotel_id)
    return ok(data, "Chi tiet khach san")
