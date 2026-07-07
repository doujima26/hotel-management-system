from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.enums import HotelStatus
from app.models.entities import Amenity, Hotel, Room, RoomType, User
from app.repositories.room_repository import (
    count_rooms_by_room_type,
    create_amenity_record,
    create_room_record,
    create_room_type_amenity_link,
    create_room_type_record,
    get_amenity_by_id,
    get_hotel_by_id,
    get_hotel_by_owner,
    get_room_type_amenity_link,
    get_room_type_by_id,
    get_room_type_by_id_for_update,
    list_amenity_records,
    list_room_records,
    list_room_type_amenity_records,
    list_room_type_availability,
    list_room_type_records,
)
from app.schemas.rooms import (
    AmenityResponse,
    CreateAmenityRequest,
    CreateRoomRequest,
    CreateRoomTypeRequest,
    RoomAvailabilityResponse,
    RoomListResponse,
    RoomResponse,
    RoomTypeAmenityLinkResponse,
    RoomTypeAvailabilityResponse,
    RoomTypeResponse,
)


# Chuyen loai phong thanh du lieu tra ve.
def serialize_room_type(room_type: RoomType) -> dict:
    return RoomTypeResponse.model_validate(room_type).model_dump(mode="json")


# Chuyen phong vat ly thanh du lieu tra ve.
def serialize_room(room: Room) -> dict:
    return RoomResponse.model_validate(room).model_dump(mode="json")


# Chuyen tien nghi thanh du lieu tra ve.
def serialize_amenity(amenity: Amenity) -> dict:
    return AmenityResponse.model_validate(amenity).model_dump(mode="json")


# Kiem tra admin co quyen quan ly khach san.
def validate_admin_hotel(hotel: Hotel | None, current_user: User, require_approved: bool = False) -> Hotel:
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
    if require_approved and hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khach san chua duoc duyet de van hanh",
        )
    return hotel


# Lay khach san da duoc duyet cua admin hien tai.
def get_approved_hotel_by_admin(db: Session, current_user: User) -> Hotel:
    hotel = get_hotel_by_owner(db, current_user.id)
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


# Kiem tra loai phong thuoc khach san cua admin.
def validate_room_type_owner(db: Session, room_type: RoomType | None, current_user: User, require_approved: bool = False) -> Hotel:
    if not room_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loai phong khong ton tai",
        )

    hotel = get_hotel_by_id(db, room_type.hotel_id)
    if not hotel or hotel.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly khach san cua minh",
        )
    if require_approved and hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khach san chua duoc duyet de van hanh",
        )
    return hotel


# Xu ly tao loai phong.
def create_room_type(db: Session, current_user: User, payload: CreateRoomTypeRequest) -> dict:
    hotel = get_hotel_by_id(db, payload.hotel_id)
    validate_admin_hotel(hotel, current_user, require_approved=True)
    room_type = create_room_type_record(db, payload)
    return serialize_room_type(room_type)


# Xu ly lay danh sach loai phong.
def list_room_types(db: Session, current_user: User, hotel_id: int) -> list[dict]:
    hotel = get_hotel_by_id(db, hotel_id)
    validate_admin_hotel(hotel, current_user)
    room_types = list_room_type_records(db, hotel_id)
    return [serialize_room_type(item) for item in room_types]


# Xu ly tao phong vat ly.
def create_room(db: Session, current_user: User, payload: CreateRoomRequest) -> dict:
    room_type = get_room_type_by_id_for_update(db, payload.room_type_id)
    validate_room_type_owner(db, room_type, current_user, require_approved=True)

    current_rooms = count_rooms_by_room_type(db, payload.room_type_id)
    if current_rooms >= room_type.total_rooms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Da dat toi da so phong cua loai phong nay",
        )

    try:
        room = create_room_record(db, payload)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="So phong da ton tai trong loai phong nay",
        ) from exc

    return serialize_room(room)


# Xu ly lay danh sach phong vat ly.
def list_rooms(db: Session, current_user: User, room_type_id: int) -> dict:
    room_type = get_room_type_by_id(db, room_type_id)
    validate_room_type_owner(db, room_type, current_user)

    rooms = list_room_records(db, room_type_id)
    items = [RoomResponse.model_validate(item) for item in rooms]
    return RoomListResponse(
        items=items,
        current_rooms=len(items),
        max_rooms=room_type.total_rooms,
        remaining_rooms=max(room_type.total_rooms - len(items), 0),
    ).model_dump(mode="json")


# Xu ly tao tien nghi cho khach san.
def create_amenity(db: Session, current_user: User, payload: CreateAmenityRequest) -> dict:
    hotel = get_approved_hotel_by_admin(db, current_user)

    try:
        amenity = create_amenity_record(db, hotel.id, payload)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tien nghi da ton tai",
        ) from exc

    return serialize_amenity(amenity)


# Xu ly lay danh sach tien nghi.
def list_amenities(db: Session, current_user: User) -> list[dict]:
    hotel = get_approved_hotel_by_admin(db, current_user)
    amenities = list_amenity_records(db, hotel.id)
    return [serialize_amenity(item) for item in amenities]


# Xu ly gan tien nghi vao loai phong.
def assign_amenity_to_room_type(db: Session, current_user: User, room_type_id: int, amenity_id: int) -> dict:
    room_type = get_room_type_by_id(db, room_type_id)
    hotel = validate_room_type_owner(db, room_type, current_user, require_approved=True)

    amenity = get_amenity_by_id(db, amenity_id)
    if not amenity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tien nghi khong ton tai",
        )
    if amenity.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tien nghi khong thuoc khach san cua ban",
        )

    existing_link = get_room_type_amenity_link(db, room_type_id, amenity_id)
    if existing_link:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tien nghi da duoc gan vao loai phong",
        )

    create_room_type_amenity_link(db, room_type_id, amenity_id)
    return RoomTypeAmenityLinkResponse(room_type_id=room_type_id, amenity_id=amenity_id).model_dump(mode="json")


# Xu ly lay danh sach tien nghi cua loai phong.
def list_room_type_amenities(db: Session, current_user: User, room_type_id: int) -> list[dict]:
    room_type = get_room_type_by_id(db, room_type_id)
    validate_room_type_owner(db, room_type, current_user)
    amenities = list_room_type_amenity_records(db, room_type_id)
    return [serialize_amenity(item) for item in amenities]


# Xu ly tra cuu phong trong cong khai theo loai phong va khoang ngay.
def get_room_availability(
    db: Session,
    hotel_id: int,
    check_in: date,
    check_out: date,
    num_guests: int | None,
) -> dict:
    if check_out <= check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngay tra phong phai sau ngay nhan phong",
        )

    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel or hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khach san khong ton tai hoac chua duoc duyet",
        )

    rows = list_room_type_availability(db, hotel_id, check_in, check_out, num_guests)
    items = [
        RoomTypeAvailabilityResponse(
            room_type_id=room_type.id,
            name=room_type.name,
            base_price=float(room_type.base_price),
            max_guests=room_type.max_guests,
            total_rooms=room_type.total_rooms,
            available_rooms=available_rooms,
        )
        for room_type, _booked_rooms, available_rooms in rows
    ]
    return RoomAvailabilityResponse(
        hotel_id=hotel_id,
        check_in=check_in,
        check_out=check_out,
        items=items,
    ).model_dump(mode="json")
