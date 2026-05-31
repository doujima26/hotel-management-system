from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import HotelStatus, UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import Hotel, User
from app.schemas.auth import CreateHotelRequest

router = APIRouter(prefix="/hotels", tags=["hotels"])


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
