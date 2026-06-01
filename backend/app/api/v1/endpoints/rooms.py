from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import Hotel, Room, RoomType, User
from app.schemas.auth import CreateRoomRequest, CreateRoomTypeRequest

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
    room_type = db.query(RoomType).filter(RoomType.id == payload.room_type_id).first()
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
    return ok(data, "Danh sach phong vat ly")
