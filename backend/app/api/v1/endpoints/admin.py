from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import HotelStatus, UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import Hotel, User
from app.schemas.admin import ReviewHotelRequest, ReviewHotelResponse, SetUserActiveRequest
from app.services.admin_service import (
    get_hotel_detail_for_admin,
    list_hotels_for_admin,
    list_users_for_admin,
)
from app.services.auth_service import set_user_active

router = APIRouter(prefix="/admin", tags=["admin"])


# Endpoint tam de kiem tra module admin.
@router.get("")
def admin_ping():
    return ok({"module": "admin"}, "Admin module ready")


# Super admin xem danh sach khach san, co the loc theo trang thai (vd pending de duyet).
@router.get("/hotels")
def list_hotels_endpoint(
    status_filter: HotelStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, max_length=255),
    city: str | None = Query(default=None, max_length=100),
    sort: str = Query(default="newest", pattern="^(newest|lowest_rated|highest_rated|name)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    data = list_hotels_for_admin(
        db,
        status_filter=status_filter,
        search=search,
        city=city,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    return ok(data, "Danh sach khach san")


# Super admin xem ho so day du cua 1 khach san de tham dinh truoc khi duyet.
@router.get("/hotels/{hotel_id}")
def get_hotel_detail_endpoint(
    hotel_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    data = get_hotel_detail_for_admin(db, hotel_id)
    return ok(data, "Chi tiet khach san")


# Super admin xem danh sach nguoi dung, co the loc theo role/trang thai kich hoat.
@router.get("/users")
def list_users_endpoint(
    role_filter: UserRole | None = Query(default=None, alias="role"),
    is_active: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    data = list_users_for_admin(
        db,
        role_filter=role_filter,
        is_active_filter=is_active,
        page=page,
        page_size=page_size,
    )
    return ok(data, "Danh sach nguoi dung")


# Super admin khoa hoac mo tai khoan nguoi dung.
@router.patch("/users/{user_id}/active")
def set_user_active_endpoint(
    user_id: int,
    payload: SetUserActiveRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    data = set_user_active(db, user_id, payload)
    return ok(data, "Cap nhat trang thai tai khoan thanh cong")


# Super admin duyet tu choi hoac tam dung khach san.
@router.patch("/hotels/{hotel_id}/review")
def review_hotel_endpoint(
    hotel_id: int,
    payload: ReviewHotelRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khach san khong ton tai",
        )

    hotel.status = HotelStatus(payload.action)
    if payload.action == "rejected":
        hotel.rejection_reason = payload.rejection_reason or "Khong du dieu kien phe duyet"
    else:
        hotel.rejection_reason = None

    db.add(hotel)
    db.commit()
    db.refresh(hotel)

    data = ReviewHotelResponse(
        id=hotel.id,
        status=hotel.status,
        rejection_reason=hotel.rejection_reason,
    ).model_dump(mode="json")
    return ok(data, "Cap nhat trang thai duyet khach san thanh cong")
