from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.enums import HotelStatus, RoomStatus
from app.models.entities import Amenity, Hotel, Room, RoomType, RoomTypeImage, User
from app.repositories.room_repository import (
    count_rooms_by_room_type,
    create_amenity_record,
    create_room_record,
    count_all_rooms_by_room_type,
    count_booking_room_units_by_room,
    count_booking_rooms_by_room_type,
    create_room_type_amenity_link,
    create_room_type_image_record,
    create_room_type_record,
    delete_amenity_record,
    delete_room_record,
    delete_room_type_amenity_link,
    delete_room_type_image_record,
    delete_room_type_record,
    get_amenity_by_id,
    get_hotel_by_id,
    get_hotel_by_owner,
    get_room_by_id_for_update,
    get_room_type_amenity_link,
    get_room_type_by_id,
    get_room_type_by_id_for_update,
    get_room_type_image_by_id,
    count_active_rooms_by_room_type,
    list_amenities_by_room_type_ids,
    list_amenity_records,
    list_booked_rooms_in_range,
    list_images_by_room_type_ids,
    list_room_records,
    list_room_type_amenity_records,
    list_room_type_availability,
    list_room_type_image_records,
    list_room_type_records,
    save_amenity,
    save_room,
    save_room_type,
    set_room_type_image_primary,
)
from app.schemas.rooms import (
    AmenityResponse,
    CreateAmenityRequest,
    CreateRoomRequest,
    CreateRoomTypeImageRequest,
    CreateRoomTypeRequest,
    DeleteAmenityResponse,
    DeleteRoomResponse,
    DeleteRoomTypeImageResponse,
    DeleteRoomTypeResponse,
    RoomAvailabilityResponse,
    RoomCalendarDayItem,
    RoomCalendarResponse,
    RoomCalendarRowItem,
    RoomListResponse,
    RoomResponse,
    RoomTypeAmenityItem,
    RoomTypeAmenityLinkResponse,
    RoomTypeAvailabilityResponse,
    RoomTypeImageResponse,
    RoomTypeResponse,
    UpdateAmenityRequest,
    UpdateRoomRequest,
    UpdateRoomTypeRequest,
)
from app.services.hotel_service import get_operational_hotel


# Chuyen loai phong thanh du lieu tra ve.
def serialize_room_type(room_type: RoomType) -> dict:
    return RoomTypeResponse.model_validate(room_type).model_dump(mode="json")


# Chuyen anh loai phong thanh du lieu tra ve.
def serialize_room_type_image(image: RoomTypeImage) -> dict:
    return RoomTypeImageResponse.model_validate(image).model_dump(mode="json")


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


# Xu ly sua loai phong. Khoa row vi co the doi total_rooms - tranh dua voi
# create_room dang kiem tra suc chua cung luc.
def update_room_type(db: Session, current_user: User, room_type_id: int, payload: UpdateRoomTypeRequest) -> dict:
    room_type = get_room_type_by_id_for_update(db, room_type_id)
    validate_room_type_owner(db, room_type, current_user, require_approved=True)

    update_data = payload.model_dump(exclude_unset=True)
    if "total_rooms" in update_data:
        current_rooms = count_rooms_by_room_type(db, room_type_id)
        if update_data["total_rooms"] < current_rooms:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Loai phong nay da co {current_rooms} phong vat ly, khong the giam total_rooms xuong thap hon",
            )

    for field, value in update_data.items():
        setattr(room_type, field, value)

    room_type = save_room_type(db, room_type)
    return serialize_room_type(room_type)


# Xu ly xoa cung loai phong - chi cho phep khi chua tung co phong vat ly hoac
# booking nao thuoc loai phong nay (FK RESTRICT se chan neu con, nen kiem tra
# truoc de bao loi ro nghia thay vi de DB nem IntegrityError kho hieu).
def delete_room_type(db: Session, current_user: User, room_type_id: int) -> dict:
    room_type = get_room_type_by_id_for_update(db, room_type_id)
    validate_room_type_owner(db, room_type, current_user, require_approved=True)

    room_count = count_all_rooms_by_room_type(db, room_type_id)
    booking_count = count_booking_rooms_by_room_type(db, room_type_id)
    if room_count > 0 or booking_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Loai phong nay dang co {room_count} phong vat ly va {booking_count} booking lien quan, "
                "khong the xoa - hay tat (is_active=false) thay vi xoa"
            ),
        )

    delete_room_type_record(db, room_type)
    return DeleteRoomTypeResponse(id=room_type_id).model_dump(mode="json")


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
        room = create_room_record(db, payload, room_type.hotel_id)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="So phong nay da ton tai trong khach san",
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


# Xu ly sua phong vat ly (so phong/tang/tat mo is_active). Khoa row vi co the
# doi is_active - tranh dua voi check-in dang gan phong cung luc.
def update_room(db: Session, current_user: User, room_id: int, payload: UpdateRoomRequest) -> dict:
    room = get_room_by_id_for_update(db, room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phong khong ton tai")

    room_type = get_room_type_by_id(db, room.room_type_id)
    validate_room_type_owner(db, room_type, current_user, require_approved=True)

    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("is_active") is False and room.status != RoomStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chi tat duoc phong dang o trang thai available",
        )

    for field, value in update_data.items():
        setattr(room, field, value)

    try:
        room = save_room(db, room)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="So phong da ton tai trong loai phong nay",
        ) from exc

    return serialize_room(room)


# Xu ly xoa cung phong vat ly - chi cho phep khi phong nay chua tung duoc gan
# cho khach check-in (FK RESTRICT tren booking_room_units se chan neu da tung dung).
def delete_room(db: Session, current_user: User, room_id: int) -> dict:
    room = get_room_by_id_for_update(db, room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phong khong ton tai")

    room_type = get_room_type_by_id(db, room.room_type_id)
    validate_room_type_owner(db, room_type, current_user, require_approved=True)

    usage_count = count_booking_room_units_by_room(db, room_id)
    if usage_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phong nay da tung duoc gan cho khach check-in, khong the xoa - hay tat thay vi xoa",
        )

    delete_room_record(db, room)
    return DeleteRoomResponse(id=room_id).model_dump(mode="json")


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


# Kiem tra tien nghi thuoc khach san cua admin hien tai.
def _get_owned_amenity(db: Session, current_user: User, amenity_id: int) -> Amenity:
    hotel = get_approved_hotel_by_admin(db, current_user)
    amenity = get_amenity_by_id(db, amenity_id)
    if not amenity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tien nghi khong ton tai")
    if amenity.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly tien nghi cua khach san minh",
        )
    return amenity


# Xu ly sua tien nghi.
def update_amenity(db: Session, current_user: User, amenity_id: int, payload: UpdateAmenityRequest) -> dict:
    amenity = _get_owned_amenity(db, current_user, amenity_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(amenity, field, value)

    try:
        amenity = save_amenity(db, amenity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tien nghi da ton tai",
        ) from exc

    return serialize_amenity(amenity)


# Xu ly xoa tien nghi (xoa het, DB tu go cac lien ket voi loai phong).
def delete_amenity(db: Session, current_user: User, amenity_id: int) -> dict:
    amenity = _get_owned_amenity(db, current_user, amenity_id)
    delete_amenity_record(db, amenity)
    return DeleteAmenityResponse(id=amenity_id).model_dump(mode="json")


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


# Xu ly go 1 tien nghi khoi loai phong (khong xoa amenity, chi xoa lien ket).
def unassign_amenity_from_room_type(db: Session, current_user: User, room_type_id: int, amenity_id: int) -> dict:
    room_type = get_room_type_by_id(db, room_type_id)
    validate_room_type_owner(db, room_type, current_user, require_approved=True)

    link = get_room_type_amenity_link(db, room_type_id, amenity_id)
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tien nghi chua duoc gan vao loai phong nay",
        )

    delete_room_type_amenity_link(db, link)
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
    if check_in < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngay nhan phong khong duoc o qua khu",
        )

    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel or hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khach san khong ton tai hoac chua duoc duyet",
        )

    rows = list_room_type_availability(db, hotel_id, check_in, check_out, num_guests)
    # Nap anh + tien nghi cua tat ca loai phong trong 1 luot (tranh N+1), dung cho
    # bang chon phong va modal chi tiet loai phong o trang chi tiet khach san.
    room_type_ids = [room_type.id for room_type, _booked, _available in rows]
    images_by_room_type = list_images_by_room_type_ids(db, room_type_ids)
    amenities_by_room_type = list_amenities_by_room_type_ids(db, room_type_ids)

    items = [
        RoomTypeAvailabilityResponse(
            room_type_id=room_type.id,
            name=room_type.name,
            description=room_type.description,
            base_price=float(room_type.base_price),
            max_guests=room_type.max_guests,
            bed_type=room_type.bed_type,
            area_sqm=float(room_type.area_sqm) if room_type.area_sqm is not None else None,
            total_rooms=room_type.total_rooms,
            available_rooms=available_rooms,
            images=[image.image_url for image in images_by_room_type.get(room_type.id, [])],
            amenities=[
                RoomTypeAmenityItem(name=amenity.name, category=amenity.category)
                for amenity in amenities_by_room_type.get(room_type.id, [])
            ],
        )
        for room_type, _booked_rooms, available_rooms in rows
    ]
    return RoomAvailabilityResponse(
        hotel_id=hotel_id,
        check_in=check_in,
        check_out=check_out,
        items=items,
    ).model_dump(mode="json")


# Xu ly them anh cho loai phong.
def create_room_type_image(
    db: Session,
    current_user: User,
    room_type_id: int,
    payload: CreateRoomTypeImageRequest,
) -> dict:
    room_type = get_room_type_by_id(db, room_type_id)
    validate_room_type_owner(db, room_type, current_user)
    image = create_room_type_image_record(db, room_type_id, payload)
    return serialize_room_type_image(image)


# Xu ly lay danh sach anh cua loai phong.
def list_room_type_images(db: Session, current_user: User, room_type_id: int) -> list[dict]:
    room_type = get_room_type_by_id(db, room_type_id)
    validate_room_type_owner(db, room_type, current_user)
    images = list_room_type_image_records(db, room_type_id)
    return [serialize_room_type_image(item) for item in images]


# Kiem tra anh thuoc loai phong cua khach san admin hien tai.
def _get_owned_room_type_image(db: Session, current_user: User, room_type_id: int, image_id: int) -> RoomTypeImage:
    room_type = get_room_type_by_id(db, room_type_id)
    validate_room_type_owner(db, room_type, current_user)
    image = get_room_type_image_by_id(db, image_id)
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anh khong ton tai",
        )
    if image.room_type_id != room_type_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anh khong thuoc loai phong nay",
        )
    return image


# Xu ly xoa anh loai phong.
def delete_room_type_image(db: Session, current_user: User, room_type_id: int, image_id: int) -> dict:
    image = _get_owned_room_type_image(db, current_user, room_type_id, image_id)
    delete_room_type_image_record(db, image)
    return DeleteRoomTypeImageResponse(id=image_id).model_dump(mode="json")


# Xu ly dat anh dai dien cho loai phong.
def set_primary_room_type_image(db: Session, current_user: User, room_type_id: int, image_id: int) -> dict:
    image = _get_owned_room_type_image(db, current_user, room_type_id, image_id)
    image = set_room_type_image_primary(db, room_type_id, image)
    return serialize_room_type_image(image)


# So ngay toi da cho 1 lan xem lich ton phong (tranh tra ve qua nhieu du lieu).
_MAX_CALENDAR_DAYS = 62


# Xu ly dung lich ton phong cua khach san: truc ngay x loai phong, moi o cho
# biet da dat bao nhieu / con trong bao nhieu phong trong ngay do.
def get_room_calendar(db: Session, current_user: User, from_date: date, to_date: date) -> dict:
    if to_date < from_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngay ket thuc phai lon hon hoac bang ngay bat dau",
        )
    num_days = (to_date - from_date).days + 1
    if num_days > _MAX_CALENDAR_DAYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chi xem toi da {_MAX_CALENDAR_DAYS} ngay moi lan",
        )

    hotel = get_operational_hotel(db, current_user)
    room_types = [rt for rt in list_room_type_records(db, hotel.id) if rt.is_active]
    room_counts = count_active_rooms_by_room_type(db, hotel.id)
    dates = [from_date + timedelta(days=offset) for offset in range(num_days)]

    # Trai so phong da dat cua tung booking ra tung ngay trong khoang. Ngay tra
    # phong khong tinh (khach da di), giong cach kiem tra phong trong khi dat.
    booked_by_day: dict[tuple[int, date], int] = {}
    for room_type_id, check_in, check_out, quantity in list_booked_rooms_in_range(db, hotel.id, from_date, to_date):
        day = max(check_in, from_date)
        last_day = min(check_out - timedelta(days=1), to_date)
        while day <= last_day:
            booked_by_day[(room_type_id, day)] = booked_by_day.get((room_type_id, day), 0) + quantity
            day += timedelta(days=1)

    items = []
    for room_type in room_types:
        total_rooms = room_counts.get(room_type.id, 0)
        days = []
        for day in dates:
            booked = booked_by_day.get((room_type.id, day), 0)
            days.append(
                RoomCalendarDayItem(
                    date=day,
                    booked_rooms=booked,
                    available_rooms=max(total_rooms - booked, 0),
                )
            )
        items.append(
            RoomCalendarRowItem(
                room_type_id=room_type.id,
                name=room_type.name,
                total_rooms=total_rooms,
                days=days,
            )
        )

    return RoomCalendarResponse(
        hotel_id=hotel.id,
        from_date=from_date,
        to_date=to_date,
        dates=dates,
        items=items,
    ).model_dump(mode="json")
