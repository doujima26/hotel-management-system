from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import HotelStatus, UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import Hotel, User
from app.schemas.auth import ReviewHotelRequest, SetUserActiveRequest
from app.services.auth_service import set_user_active

router = APIRouter(prefix="/admin", tags=["admin"])


# Endpoint tam de kiem tra module admin.
@router.get("")
def admin_ping():
    return ok({"module": "admin"}, "Admin module ready")


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

    return ok(
        {
            "id": hotel.id,
            "status": hotel.status,
            "rejection_reason": hotel.rejection_reason,
        },
        "Cap nhat trang thai duyet khach san thanh cong",
    )
