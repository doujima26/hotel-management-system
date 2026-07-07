from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.schemas.rooms import CreateAmenityRequest, CreateRoomRequest, CreateRoomTypeRequest
from app.services.room_service import (
    assign_amenity_to_room_type as assign_amenity_to_room_type_action,
    create_amenity as create_amenity_action,
    create_room as create_room_action,
    create_room_type as create_room_type_action,
    get_room_availability as get_room_availability_action,
    list_amenities as list_amenities_action,
    list_room_type_amenities as list_room_type_amenities_action,
    list_room_types as list_room_types_action,
    list_rooms as list_rooms_action,
)

router = APIRouter(prefix="/rooms", tags=["rooms"])


# Endpoint tam de kiem tra module rooms.
@router.get("")
def rooms_ping():
    return ok({"module": "rooms"}, "Rooms module ready")


# Khach tra cuu phong trong cong khai theo khach san va khoang ngay.
@router.get("/availability")
def room_availability_endpoint(
    hotel_id: int = Query(gt=0),
    check_in: date = Query(...),
    check_out: date = Query(...),
    num_guests: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    data = get_room_availability_action(db, hotel_id, check_in, check_out, num_guests)
    return ok(data, "Danh sach phong trong")


# Admin tao loai phong cho khach san cua minh.
@router.post("/room-types")
def create_room_type(
    payload: CreateRoomTypeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = create_room_type_action(db, current_user, payload)
    return ok(data, "Tao loai phong thanh cong")


# Admin xem danh sach loai phong theo khach san cua minh.
@router.get("/room-types")
def list_room_types(
    hotel_id: int = Query(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = list_room_types_action(db, current_user, hotel_id)
    return ok(data, "Danh sach loai phong")


# Admin tao phong vat ly theo loai phong cua khach san minh.
@router.post("")
def create_room(
    payload: CreateRoomRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = create_room_action(db, current_user, payload)
    return ok(data, "Tao phong thanh cong")


# Admin xem danh sach phong vat ly theo loai phong cua minh.
@router.get("/list")
def list_rooms(
    room_type_id: int = Query(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = list_rooms_action(db, current_user, room_type_id)
    return ok(data, "Danh sach phong vat ly")


# Admin tao tien nghi moi cho khach san cua minh.
@router.post("/amenities")
def create_amenity(
    payload: CreateAmenityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = create_amenity_action(db, current_user, payload)
    return ok(data, "Tao tien nghi thanh cong")


# Admin xem danh sach tien nghi.
@router.get("/amenities")
def list_amenities(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = list_amenities_action(db, current_user)
    return ok(data, "Danh sach tien nghi")


# Admin gan tien nghi vao loai phong cua khach san minh.
@router.post("/room-types/{room_type_id}/amenities/{amenity_id}")
def assign_amenity_to_room_type(
    room_type_id: int,
    amenity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = assign_amenity_to_room_type_action(db, current_user, room_type_id, amenity_id)
    return ok(data, "Gan tien nghi vao loai phong thanh cong")


# Admin xem danh sach tien nghi cua loai phong.
@router.get("/room-types/{room_type_id}/amenities")
def list_room_type_amenities(
    room_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = list_room_type_amenities_action(db, current_user, room_type_id)
    return ok(data, "Danh sach tien nghi cua loai phong")
