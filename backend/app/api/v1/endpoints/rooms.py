from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import HotelStatus, UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import Amenity, Hotel, Room, RoomType, RoomTypeAmenity, User
from app.schemas.auth import CreateAmenityRequest, CreateRoomRequest, CreateRoomTypeRequest

router = APIRouter(prefix="/rooms", tags=["rooms"])


# Endpoint tam de kiem tra module rooms.
@router.get("")
def rooms_ping():
    return ok({"module": "rooms"}, "Rooms module ready")


# Admin tao loai phong cho khach san cua minh.
@router.post("/room-types")
def create_room_type(
    payload: CreateRoomTypeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    hotel = db.query(Hotel).filter(Hotel.id == payload.hotel_id).first()
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khach san khong ton tai",
        )
    if hotel.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly khach san cua minh",
        )
    if hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khach san chua duoc duyet de van hanh",
        )

    room_type = RoomType(
        hotel_id=payload.hotel_id,
        name=payload.name,
        description=payload.description,
        base_price=payload.base_price,
        max_guests=payload.max_guests,
        area_sqm=payload.area_sqm,
        bed_type=payload.bed_type,
        total_rooms=payload.total_rooms,
        is_active=True,
    )
    db.add(room_type)
    db.commit()
    db.refresh(room_type)

    return ok(
        {
            "id": room_type.id,
            "hotel_id": room_type.hotel_id,
            "name": room_type.name,
            "base_price": float(room_type.base_price),
            "max_guests": room_type.max_guests,
            "total_rooms": room_type.total_rooms,
            "is_active": room_type.is_active,
        },
        "Tao loai phong thanh cong",
    )


# Admin xem danh sach loai phong theo khach san cua minh.
@router.get("/room-types")
def list_room_types(
    hotel_id: int = Query(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khach san khong ton tai",
        )
    if hotel.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly khach san cua minh",
        )

    room_types = db.query(RoomType).filter(RoomType.hotel_id == hotel_id).all()
    data = [
        {
            "id": item.id,
            "hotel_id": item.hotel_id,
            "name": item.name,
            "base_price": float(item.base_price),
            "max_guests": item.max_guests,
            "total_rooms": item.total_rooms,
            "is_active": item.is_active,
        }
        for item in room_types
    ]
    return ok(data, "Danh sach loai phong")


# Admin tao phong vat ly theo loai phong cua khach san minh.
@router.post("")
def create_room(
    payload: CreateRoomRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    room_type = db.query(RoomType).filter(RoomType.id == payload.room_type_id).with_for_update().first()
    if not room_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loai phong khong ton tai",
        )

    hotel = db.query(Hotel).filter(Hotel.id == room_type.hotel_id).first()
    if not hotel or hotel.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly khach san cua minh",
        )
    if hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khach san chua duoc duyet de van hanh",
        )

    current_rooms = db.query(func.count(Room.id)).filter(Room.room_type_id == payload.room_type_id).scalar() or 0
    if current_rooms >= room_type.total_rooms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Da dat toi da so phong cua loai phong nay",
        )

    room = Room(
        room_type_id=payload.room_type_id,
        room_number=payload.room_number,
        floor=payload.floor,
        status="available",
        is_active=True,
    )
    db.add(room)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="So phong da ton tai trong loai phong nay",
        ) from exc
    db.refresh(room)

    return ok(
        {
            "id": room.id,
            "room_type_id": room.room_type_id,
            "room_number": room.room_number,
            "floor": room.floor,
            "status": room.status,
            "is_active": room.is_active,
        },
        "Tao phong thanh cong",
    )


# Admin xem danh sach phong vat ly theo loai phong cua minh.
@router.get("/list")
def list_rooms(
    room_type_id: int = Query(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    room_type = db.query(RoomType).filter(RoomType.id == room_type_id).first()
    if not room_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loai phong khong ton tai",
        )

    hotel = db.query(Hotel).filter(Hotel.id == room_type.hotel_id).first()
    if not hotel or hotel.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly khach san cua minh",
        )

    rooms = db.query(Room).filter(Room.room_type_id == room_type_id).all()
    data = [
        {
            "id": item.id,
            "room_type_id": item.room_type_id,
            "room_number": item.room_number,
            "floor": item.floor,
            "status": item.status,
            "is_active": item.is_active,
        }
        for item in rooms
    ]
    return ok(
        {
            "items": data,
            "current_rooms": len(data),
            "max_rooms": room_type.total_rooms,
            "remaining_rooms": max(room_type.total_rooms - len(data), 0),
        },
        "Danh sach phong vat ly",
    )


# Admin tao tien nghi moi cho he thong.
@router.post("/amenities")
def create_amenity(
    payload: CreateAmenityRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    amenity = Amenity(
        name=payload.name,
        icon=payload.icon,
        category=payload.category,
    )
    db.add(amenity)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tien nghi da ton tai",
        ) from exc
    db.refresh(amenity)

    return ok(
        {
            "id": amenity.id,
            "name": amenity.name,
            "icon": amenity.icon,
            "category": amenity.category,
        },
        "Tao tien nghi thanh cong",
    )


# Admin xem danh sach tien nghi.
@router.get("/amenities")
def list_amenities(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    amenities = db.query(Amenity).order_by(Amenity.name.asc()).all()
    data = [
        {
            "id": item.id,
            "name": item.name,
            "icon": item.icon,
            "category": item.category,
        }
        for item in amenities
    ]
    return ok(data, "Danh sach tien nghi")


# Admin gan tien nghi vao loai phong cua khach san minh.
@router.post("/room-types/{room_type_id}/amenities/{amenity_id}")
def assign_amenity_to_room_type(
    room_type_id: int,
    amenity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    room_type = db.query(RoomType).filter(RoomType.id == room_type_id).first()
    if not room_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loai phong khong ton tai",
        )

    hotel = db.query(Hotel).filter(Hotel.id == room_type.hotel_id).first()
    if not hotel or hotel.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly khach san cua minh",
        )

    amenity = db.query(Amenity).filter(Amenity.id == amenity_id).first()
    if not amenity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tien nghi khong ton tai",
        )

    existing_link = (
        db.query(RoomTypeAmenity)
        .filter(
            RoomTypeAmenity.room_type_id == room_type_id,
            RoomTypeAmenity.amenity_id == amenity_id,
        )
        .first()
    )
    if existing_link:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tien nghi da duoc gan vao loai phong",
        )

    link = RoomTypeAmenity(room_type_id=room_type_id, amenity_id=amenity_id)
    db.add(link)
    db.commit()

    return ok(
        {
            "room_type_id": room_type_id,
            "amenity_id": amenity_id,
        },
        "Gan tien nghi vao loai phong thanh cong",
    )


# Admin xem danh sach tien nghi cua loai phong.
@router.get("/room-types/{room_type_id}/amenities")
def list_room_type_amenities(
    room_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    room_type = db.query(RoomType).filter(RoomType.id == room_type_id).first()
    if not room_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loai phong khong ton tai",
        )

    hotel = db.query(Hotel).filter(Hotel.id == room_type.hotel_id).first()
    if not hotel or hotel.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly khach san cua minh",
        )

    amenities = (
        db.query(Amenity)
        .join(RoomTypeAmenity, RoomTypeAmenity.amenity_id == Amenity.id)
        .filter(RoomTypeAmenity.room_type_id == room_type_id)
        .order_by(Amenity.name.asc())
        .all()
    )
    data = [
        {
            "id": item.id,
            "name": item.name,
            "icon": item.icon,
            "category": item.category,
        }
        for item in amenities
    ]
    return ok(data, "Danh sach tien nghi cua loai phong")
