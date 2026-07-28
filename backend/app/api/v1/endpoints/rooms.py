from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import AmenityScope, UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.schemas.rooms import (
    CreateAmenityRequest,
    CreateRoomRequest,
    CreateRoomTypeImageRequest,
    CreateRoomTypeRequest,
    UpdateAmenityRequest,
    UpdateRoomRequest,
    UpdateRoomTypeRequest,
)
from app.services.checkin_service import get_room_status_board as get_room_status_board_action
from app.services.room_service import (
    assign_amenity_to_room_type as assign_amenity_to_room_type_action,
    create_amenity as create_amenity_action,
    create_room as create_room_action,
    create_room_type as create_room_type_action,
    create_room_type_image as create_room_type_image_action,
    delete_amenity as delete_amenity_action,
    delete_room as delete_room_action,
    delete_room_type as delete_room_type_action,
    delete_room_type_image as delete_room_type_image_action,
    get_room_availability as get_room_availability_action,
    get_room_calendar as get_room_calendar_action,
    list_amenities as list_amenities_action,
    list_room_type_amenities as list_room_type_amenities_action,
    list_room_type_images as list_room_type_images_action,
    list_room_types as list_room_types_action,
    list_rooms as list_rooms_action,
    set_primary_room_type_image as set_primary_room_type_image_action,
    unassign_amenity_from_room_type as unassign_amenity_from_room_type_action,
    update_amenity as update_amenity_action,
    update_room as update_room_action,
    update_room_type as update_room_type_action,
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


# Admin/Staff xem lich ton phong theo ngay x loai phong cua khach san minh.
@router.get("/calendar")
def room_calendar_endpoint(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
):
    data = get_room_calendar_action(db, current_user, from_date, to_date)
    return ok(data, "Lich ton phong")


# Admin/Staff xem so do phong (trang thai tat ca phong vat ly cua khach san minh).
@router.get("/status")
def room_status_board(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
):
    data = get_room_status_board_action(db, current_user)
    return ok(data, "So do phong")


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


# Admin sua loai phong cua khach san minh (gia, suc chua, mo ta, tat/mo is_active...).
@router.patch("/room-types/{room_type_id}")
def update_room_type(
    room_type_id: int,
    payload: UpdateRoomTypeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = update_room_type_action(db, current_user, room_type_id, payload)
    return ok(data, "Cap nhat loai phong thanh cong")


# Admin xoa cung loai phong (chi khi chua co phong vat ly/booking nao lien quan).
@router.delete("/room-types/{room_type_id}")
def delete_room_type(
    room_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = delete_room_type_action(db, current_user, room_type_id)
    return ok(data, "Xoa loai phong thanh cong")


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


# Admin sua phong vat ly (so phong/tang/tat mo is_active) cua khach san minh.
@router.patch("/{room_id}")
def update_room(
    room_id: int,
    payload: UpdateRoomRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = update_room_action(db, current_user, room_id, payload)
    return ok(data, "Cap nhat phong thanh cong")


# Admin xoa cung phong vat ly (chi khi chua tung duoc gan cho khach check-in).
@router.delete("/{room_id}")
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = delete_room_action(db, current_user, room_id)
    return ok(data, "Xoa phong thanh cong")


# Super Admin tao tien nghi moi trong danh muc chung (scope=hotel hoac room).
@router.post("/amenities")
def create_amenity(
    payload: CreateAmenityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    data = create_amenity_action(db, payload)
    return ok(data, "Tao tien nghi thanh cong")


# Admin/Super Admin xem danh sach tien nghi trong danh muc chung theo pham vi.
@router.get("/amenities")
def list_amenities(
    scope: AmenityScope = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
):
    data = list_amenities_action(db, scope)
    return ok(data, "Danh sach tien nghi")


# Super Admin sua tien nghi trong danh muc chung.
@router.patch("/amenities/{amenity_id}")
def update_amenity(
    amenity_id: int,
    payload: UpdateAmenityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    data = update_amenity_action(db, amenity_id, payload)
    return ok(data, "Cap nhat tien nghi thanh cong")


# Super Admin xoa tien nghi trong danh muc chung (tu dong go khoi cac khach
# san/loai phong da gan).
@router.delete("/amenities/{amenity_id}")
def delete_amenity(
    amenity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    data = delete_amenity_action(db, amenity_id)
    return ok(data, "Xoa tien nghi thanh cong")


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


# Admin go 1 tien nghi khoi loai phong (khong xoa amenity, chi xoa lien ket).
@router.delete("/room-types/{room_type_id}/amenities/{amenity_id}")
def unassign_amenity_from_room_type(
    room_type_id: int,
    amenity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = unassign_amenity_from_room_type_action(db, current_user, room_type_id, amenity_id)
    return ok(data, "Go tien nghi khoi loai phong thanh cong")


# Admin xem danh sach tien nghi cua loai phong.
@router.get("/room-types/{room_type_id}/amenities")
def list_room_type_amenities(
    room_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = list_room_type_amenities_action(db, current_user, room_type_id)
    return ok(data, "Danh sach tien nghi cua loai phong")


# Admin them anh cho loai phong cua khach san minh.
@router.post("/room-types/{room_type_id}/images")
def create_room_type_image(
    room_type_id: int,
    payload: CreateRoomTypeImageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = create_room_type_image_action(db, current_user, room_type_id, payload)
    return ok(data, "Them anh loai phong thanh cong")


# Admin xem danh sach anh cua loai phong.
@router.get("/room-types/{room_type_id}/images")
def list_room_type_images(
    room_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = list_room_type_images_action(db, current_user, room_type_id)
    return ok(data, "Danh sach anh loai phong")


# Admin xoa anh cua loai phong.
@router.delete("/room-types/{room_type_id}/images/{image_id}")
def delete_room_type_image(
    room_type_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = delete_room_type_image_action(db, current_user, room_type_id, image_id)
    return ok(data, "Xoa anh loai phong thanh cong")


# Admin dat anh dai dien cho loai phong.
@router.patch("/room-types/{room_type_id}/images/{image_id}/primary")
def set_primary_room_type_image(
    room_type_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = set_primary_room_type_image_action(db, current_user, room_type_id, image_id)
    return ok(data, "Dat anh dai dien thanh cong")
