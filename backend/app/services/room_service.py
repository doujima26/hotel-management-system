from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.enums import AmenityScope, DiscountType, HotelStatus, PricingRecurrence, RoomStatus
from app.models.entities import (
    Amenity,
    AmenityCategory,
    Hotel,
    PricingRule,
    Room,
    RoomType,
    RoomTypeImage,
    User,
)
from app.repositories.pricing_repository import (
    create_pricing_rule_record,
    delete_pricing_rule_record,
    get_pricing_rule_by_id,
    list_active_pricing_rules,
    list_pricing_rule_records,
    save_pricing_rule,
)
from app.repositories.room_repository import (
    count_rooms_by_room_type,
    count_amenities_in_category,
    create_amenity_category_record,
    create_amenity_record,
    create_room_block_record,
    create_room_record,
    count_all_rooms_by_room_type,
    count_booking_room_units_by_room,
    count_booking_rooms_by_room_type,
    create_room_type_amenity_link,
    create_room_type_image_record,
    create_room_type_record,
    delete_amenity_category_record,
    delete_amenity_record,
    delete_room_block,
    delete_room_record,
    delete_room_type_amenity_link,
    delete_room_type_image_record,
    delete_room_type_record,
    delete_room_type_rate,
    delete_room_type_rates_in_range,
    get_amenity_by_id,
    get_amenity_category_by_id,
    get_hotel_by_id,
    get_overlapping_room_blocks,
    get_room_block_by_id,
    get_room_by_id_for_update,
    get_room_type_amenity_link,
    get_room_type_by_id,
    get_room_type_by_id_for_update,
    get_room_type_image_by_id,
    count_sellable_rooms_by_room_type_map,
    list_amenities_by_room_type_ids,
    list_amenity_category_records,
    list_amenity_records_by_scope,
    list_booked_rooms_in_range,
    list_images_by_room_type_ids,
    list_room_blocks_for_hotel,
    list_room_blocks_in_range_by_room_type,
    list_room_records,
    list_room_type_amenity_records,
    list_room_type_availability,
    list_room_type_image_records,
    list_room_type_records,
    save_amenity,
    save_amenity_category,
    save_room,
    save_room_type,
    set_room_type_image_primary,
    upsert_room_type_rate,
)
from app.schemas.rooms import (
    AmenityCategoryResponse,
    AmenityResponse,
    CreateAmenityCategoryRequest,
    CreateAmenityRequest,
    ClearRoomTypeRatesResponse,
    CreatePricingRuleRequest,
    CreateRoomBlockRequest,
    CreateRoomRequest,
    CreateRoomTypeImageRequest,
    CreateRoomTypeRequest,
    DeleteAmenityCategoryResponse,
    DeleteAmenityResponse,
    DeletePricingRuleResponse,
    DeleteRoomBlockResponse,
    DeleteRoomResponse,
    DeleteRoomTypeImageResponse,
    DeleteRoomTypeResponse,
    PricingRuleResponse,
    RoomAvailabilityResponse,
    RoomBlockResponse,
    RoomCalendarDayItem,
    RoomCalendarResponse,
    RoomCalendarRowItem,
    RoomListResponse,
    RoomResponse,
    RoomTypeAmenityItem,
    RoomTypeAmenityLinkResponse,
    RoomTypeAvailabilityResponse,
    RoomTypeImageResponse,
    RoomTypeRateCalendarResponse,
    RoomTypeRateDayItem,
    RoomTypeResponse,
    SetRoomTypeRateRequest,
    UpdateAmenityCategoryRequest,
    UpdateAmenityRequest,
    UpdatePricingRuleRequest,
    UpdateRoomRequest,
    UpdateRoomTypeRequest,
)
from app.services.hotel_service import (
    get_approved_admin_hotel,
    get_operating_admin_hotel,
    get_operational_hotel,
)
from app.services.pricing_service import (
    PRICE_SOURCE_MANUAL,
    resolve_nightly_prices,
    resolve_stay_total,
)


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
    # category tra ve TEN danh muc (chuoi) de giu nguyen hop dong API cu cho
    # cac trang dang gom tien nghi theo danh muc; category_id/category_icon la
    # cac field them moi.
    return AmenityResponse.from_amenity(amenity).model_dump(mode="json")


# Chuyen danh muc con cua tien nghi thanh du lieu tra ve.
def serialize_amenity_category(category: AmenityCategory) -> dict:
    return AmenityCategoryResponse.model_validate(category).model_dump(mode="json")


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


# Kiem tra cap loai giuong / so luong giuong. So luong khong co nghia neu chua
# biet la giuong gi ("2 x ...gi?"), nen chan lai. De trong ca hai thi hop le -
# day la thong tin mo ta, khong bat buoc.
def _validate_bed_config(bed_type: str | None, bed_count: int | None) -> None:
    if bed_count is not None and not bed_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phai chon loai giuong truoc khi nhap so luong giuong",
        )


# Xu ly tao loai phong.
def create_room_type(db: Session, current_user: User, payload: CreateRoomTypeRequest) -> dict:
    hotel = get_hotel_by_id(db, payload.hotel_id)
    validate_admin_hotel(hotel, current_user, require_approved=True)
    _validate_bed_config(payload.bed_type, payload.bed_count)
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

    # Kiem tra tren gia tri SAU khi cap nhat (field khong gui thi giu gia tri
    # cu), de vi du chi xoa bed_type ma con bed_count cung bi chan.
    _validate_bed_config(
        update_data.get("bed_type", room_type.bed_type),
        update_data.get("bed_count", room_type.bed_count),
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


# Kiem tra danh muc con ton tai (dung khi tao/sua tien nghi co chon danh muc).
def _validate_amenity_category(db: Session, category_id: int | None) -> None:
    if category_id is None:
        return
    if not get_amenity_category_by_id(db, category_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Danh muc tien nghi khong ton tai")


# Xu ly tao tien nghi moi trong danh muc chung (chi Super Admin).
def create_amenity(db: Session, payload: CreateAmenityRequest) -> dict:
    _validate_amenity_category(db, payload.category_id)
    try:
        amenity = create_amenity_record(db, payload)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tien nghi da ton tai",
        ) from exc

    return serialize_amenity(amenity)


# Xu ly lay danh sach tien nghi trong danh muc chung theo pham vi (hotel/room).
def list_amenities(db: Session, scope: AmenityScope) -> list[dict]:
    amenities = list_amenity_records_by_scope(db, scope)
    return [serialize_amenity(item) for item in amenities]


# Xu ly sua tien nghi trong danh muc chung (chi Super Admin).
def update_amenity(db: Session, amenity_id: int, payload: UpdateAmenityRequest) -> dict:
    amenity = get_amenity_by_id(db, amenity_id)
    if not amenity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tien nghi khong ton tai")

    _validate_amenity_category(db, payload.category_id)

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


# Xu ly xoa tien nghi trong danh muc chung (chi Super Admin, DB tu go cac lien
# ket voi khach san/loai phong nho ON DELETE CASCADE).
def delete_amenity(db: Session, amenity_id: int) -> dict:
    amenity = get_amenity_by_id(db, amenity_id)
    if not amenity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tien nghi khong ton tai")
    delete_amenity_record(db, amenity)
    return DeleteAmenityResponse(id=amenity_id).model_dump(mode="json")


# Xu ly tao danh muc con moi cho tien nghi (chi Super Admin).
def create_amenity_category(db: Session, payload: CreateAmenityCategoryRequest) -> dict:
    try:
        category = create_amenity_category_record(db, payload.name.strip(), payload.icon or None)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Danh muc tien nghi da ton tai") from exc

    return serialize_amenity_category(category)


# Xu ly lay danh sach danh muc con cua tien nghi.
def list_amenity_categories(db: Session) -> list[dict]:
    return [serialize_amenity_category(item) for item in list_amenity_category_records(db)]


# Xu ly sua ten danh muc con cua tien nghi (chi Super Admin).
def update_amenity_category(db: Session, category_id: int, payload: UpdateAmenityCategoryRequest) -> dict:
    category = get_amenity_category_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Danh muc tien nghi khong ton tai")

    category.name = payload.name.strip()
    category.icon = payload.icon or None
    try:
        category = save_amenity_category(db, category)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Danh muc tien nghi da ton tai") from exc

    return serialize_amenity_category(category)


# Xu ly xoa danh muc con cua tien nghi (chi Super Admin) - chan xoa khi danh
# muc dang con tien nghi de khong am tham lam mat phan loai cua hang loat
# tien nghi. Rang buoc ON DELETE RESTRICT o DB la luoi an toan cuoi.
def delete_amenity_category(db: Session, category_id: int) -> dict:
    category = get_amenity_category_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Danh muc tien nghi khong ton tai")

    usage_count = count_amenities_in_category(db, category_id)
    if usage_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Danh muc dang co {usage_count} tien nghi, hay chuyen sang danh muc khac truoc khi xoa",
        )

    delete_amenity_category_record(db, category)
    return DeleteAmenityCategoryResponse(id=category_id).model_dump(mode="json")


# Xu ly gan tien nghi vao loai phong.
def assign_amenity_to_room_type(db: Session, current_user: User, room_type_id: int, amenity_id: int) -> dict:
    room_type = get_room_type_by_id(db, room_type_id)
    validate_room_type_owner(db, room_type, current_user, require_approved=True)

    amenity = get_amenity_by_id(db, amenity_id)
    if not amenity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tien nghi khong ton tai",
        )
    if amenity.scope != AmenityScope.ROOM:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chi duoc gan tien nghi thuoc danh muc 'Tien nghi phong' vao loai phong",
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

    num_nights = (check_out - check_in).days
    # Nap quy tac gia cua khach san 1 lan roi dung chung cho moi loai phong.
    pricing_rules = list_active_pricing_rules(db, hotel_id)

    def _average_effective_price(room_type: RoomType) -> float:
        # Gia co the khac nhau tung dem (gia sua tay trong room_type_rates hoac
        # quy tac gia theo mua) - tra ve gia BINH QUAN/dem cho dung khoang ngay
        # dang xem, de frontend nhan voi so dem van ra dung tong tien that
        # (giong het cach create_booking tinh tien).
        base_price = float(room_type.base_price)
        nights_total, _ = resolve_stay_total(db, room_type, check_in, check_out, rules=pricing_rules)
        return nights_total / num_nights if num_nights else base_price

    items = [
        RoomTypeAvailabilityResponse(
            room_type_id=room_type.id,
            name=room_type.name,
            description=room_type.description,
            base_price=_average_effective_price(room_type),
            max_guests=room_type.max_guests,
            bed_type=room_type.bed_type,
            bed_count=room_type.bed_count,
            area_sqm=float(room_type.area_sqm) if room_type.area_sqm is not None else None,
            total_rooms=room_type.total_rooms,
            available_rooms=available_rooms,
            images=[image.image_url for image in images_by_room_type.get(room_type.id, [])],
            amenities=[
                RoomTypeAmenityItem(name=amenity.name, category=amenity.category.name if amenity.category else None)
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
    # Tong mau so la so phong BAN DUOC (active, khong dang bao tri) - khop voi
    # dieu kien kiem tra ton kho that luc tao booking, thay vi dem moi phong
    # active bat ke trang thai.
    room_counts = count_sellable_rooms_by_room_type_map(db, hotel.id)
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

    # Trai cac dot khoa lich phong (room_blocks) ra tung ngay - khac booking,
    # khoang ngay cua block dong ca 2 dau nen ngay cuoi VAN tinh la bi khoa.
    blocked_by_day: dict[tuple[int, date], int] = {}
    for room_type_id, block_start, block_end in list_room_blocks_in_range_by_room_type(db, hotel.id, from_date, to_date):
        day = max(block_start, from_date)
        last_day = min(block_end, to_date)
        while day <= last_day:
            blocked_by_day[(room_type_id, day)] = blocked_by_day.get((room_type_id, day), 0) + 1
            day += timedelta(days=1)

    items = []
    for room_type in room_types:
        total_rooms = room_counts.get(room_type.id, 0)
        days = []
        for day in dates:
            booked = booked_by_day.get((room_type.id, day), 0)
            blocked = blocked_by_day.get((room_type.id, day), 0)
            days.append(
                RoomCalendarDayItem(
                    date=day,
                    booked_rooms=booked,
                    blocked_rooms=blocked,
                    available_rooms=max(total_rooms - booked - blocked, 0),
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


_MAX_RATE_RANGE_DAYS = 366


# Xu ly lay lich gia cua 1 loai phong theo khoang ngay (gia ghi de + gia hieu
# luc tung ngay - hieu luc = ghi de neu co, khong thi dung base_price).
def get_room_type_rate_calendar(
    db: Session, current_user: User, room_type_id: int, from_date: date, to_date: date
) -> dict:
    room_type = get_room_type_by_id(db, room_type_id)
    validate_room_type_owner(db, room_type, current_user)
    if to_date < from_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngay ket thuc phai sau ngay bat dau")
    if (to_date - from_date).days + 1 > _MAX_RATE_RANGE_DAYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chi xem toi da {_MAX_RATE_RANGE_DAYS} ngay moi lan",
        )

    prices = resolve_nightly_prices(db, room_type, from_date, to_date)

    days = []
    current = from_date
    while current <= to_date:
        night = prices[current]
        days.append(
            RoomTypeRateDayItem(
                date=current,
                override_price=night.price if night.source == PRICE_SOURCE_MANUAL else None,
                effective_price=night.price,
                source=night.source,
                rule_id=night.rule_id,
                rule_name=night.rule_name,
            )
        )
        current += timedelta(days=1)

    return RoomTypeRateCalendarResponse(
        room_type_id=room_type_id, from_date=from_date, to_date=to_date, days=days
    ).model_dump(mode="json")


# Xu ly sua tay gia 1 ngay cu the.
def set_room_type_rate(
    db: Session, current_user: User, room_type_id: int, rate_date: date, payload: SetRoomTypeRateRequest
) -> dict:
    room_type = get_room_type_by_id(db, room_type_id)
    validate_room_type_owner(db, room_type, current_user, require_approved=True)

    rate = upsert_room_type_rate(db, room_type_id, rate_date, payload.price)
    return RoomTypeRateDayItem(
        date=rate_date,
        override_price=float(rate.price),
        effective_price=float(rate.price),
        source=PRICE_SOURCE_MANUAL,
    ).model_dump(mode="json")


# Xu ly xoa gia ghi de 1 ngay - gia ngay do quay ve quy tac gia theo mua neu co
# quy tac dang khop, khong thi ve base_price.
def clear_room_type_rate(db: Session, current_user: User, room_type_id: int, rate_date: date) -> dict:
    room_type = get_room_type_by_id(db, room_type_id)
    validate_room_type_owner(db, room_type, current_user, require_approved=True)

    deleted = delete_room_type_rate(db, room_type_id, rate_date)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ngay nay chua co gia ghi de")

    night = resolve_nightly_prices(db, room_type, rate_date, rate_date)[rate_date]
    return RoomTypeRateDayItem(
        date=rate_date,
        override_price=None,
        effective_price=night.price,
        source=night.source,
        rule_id=night.rule_id,
        rule_name=night.rule_name,
    ).model_dump(mode="json")


# Xu ly xoa gia sua tay hang loat trong 1 khoang ngay - cac ngay do quay ve cho
# quy tac gia theo mua quyet dinh, khong con quy tac nao thi ve base_price.
def clear_room_type_rates_in_range(
    db: Session, current_user: User, room_type_id: int, from_date: date, to_date: date
) -> dict:
    room_type = get_room_type_by_id(db, room_type_id)
    validate_room_type_owner(db, room_type, current_user, require_approved=True)

    if to_date < from_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngay ket thuc phai sau ngay bat dau")
    if (to_date - from_date).days + 1 > _MAX_RATE_RANGE_DAYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chi xoa toi da {_MAX_RATE_RANGE_DAYS} ngay moi lan",
        )

    cleared = delete_room_type_rates_in_range(db, room_type_id, from_date, to_date)
    return ClearRoomTypeRatesResponse(
        room_type_id=room_type_id, from_date=from_date, to_date=to_date, cleared=cleared
    ).model_dump(mode="json")


# So ngay lon nhat cua tung thang, thang 2 lay 29 de con khai bao duoc ngay
# 29/02 cho nam nhuan.
_MAX_DAY_IN_MONTH = {1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31}


# Chuyen quy tac gia thanh du lieu tra ve, kem ten loai phong khi quy tac chi
# ap cho 1 loai phong.
def serialize_pricing_rule(rule: PricingRule, room_type_names: dict[int, str] | None = None) -> dict:
    data = PricingRuleResponse.model_validate(rule)
    if rule.room_type_id is not None and room_type_names:
        data.room_type_name = room_type_names.get(rule.room_type_id)
    return data.model_dump(mode="json")


# Kiem tra khoang ngay cua quy tac gia theo dung kieu lap lai da chon.
def _validate_pricing_rule_period(rule: PricingRule) -> None:
    if rule.recurrence == PricingRecurrence.YEARLY:
        if None in (rule.start_month, rule.start_day, rule.end_month, rule.end_day):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quy tac lap hang nam phai nhap du ngay va thang bat dau, ket thuc",
            )
        for month, day in ((rule.start_month, rule.start_day), (rule.end_month, rule.end_day)):
            if day > _MAX_DAY_IN_MONTH[month]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Thang {month} khong co ngay {day}",
                )
        return

    if rule.start_date is None or rule.end_date is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quy tac ap 1 lan phai nhap ngay bat dau va ngay ket thuc",
        )
    if rule.end_date < rule.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngay ket thuc phai sau ngay bat dau",
        )


# Kiem tra muc dieu chinh khong dua gia cua loai phong nao ve 0 hoac am. Quy
# tac khong chon loai phong se ap cho ca khach san nen doi chieu voi loai phong
# co gia thap nhat.
def _validate_pricing_rule_adjustment(
    db: Session,
    hotel_id: int,
    room_type_id: int | None,
    adjustment_type: DiscountType,
    adjustment_value: float,
) -> None:
    if adjustment_type == DiscountType.PERCENTAGE:
        if adjustment_value <= -100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Muc giam theo phan tram khong duoc tu 100% tro len",
            )
        return

    if room_type_id is not None:
        room_type = get_room_type_by_id(db, room_type_id)
        base_prices = [float(room_type.base_price)] if room_type else []
    else:
        base_prices = [float(item.base_price) for item in list_room_type_records(db, hotel_id)]

    if base_prices and min(base_prices) + adjustment_value <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gia sau dieu chinh phai lon hon 0",
        )


# Kiem tra loai phong duoc chon co thuoc khach san dang thao tac khong.
def _validate_pricing_rule_room_type(db: Session, hotel_id: int, room_type_id: int | None) -> None:
    if room_type_id is None:
        return
    room_type = get_room_type_by_id(db, room_type_id)
    if not room_type or room_type.hotel_id != hotel_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loai phong khong ton tai trong khach san nay",
        )


# Lay quy tac gia cua khach san admin hien tai, chan quy tac cua khach san khac.
def _get_own_pricing_rule(db: Session, hotel_id: int, rule_id: int) -> PricingRule:
    rule = get_pricing_rule_by_id(db, rule_id)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quy tac gia khong ton tai")
    if rule.hotel_id != hotel_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly quy tac gia cua khach san minh",
        )
    return rule


# Xu ly tao quy tac gia theo mua.
def create_pricing_rule(db: Session, current_user: User, payload: CreatePricingRuleRequest) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    _validate_pricing_rule_room_type(db, hotel.id, payload.room_type_id)
    _validate_pricing_rule_adjustment(
        db, hotel.id, payload.room_type_id, payload.adjustment_type, payload.adjustment_value
    )

    rule = PricingRule(
        recurrence=PricingRecurrence(payload.recurrence),
        start_date=payload.start_date,
        end_date=payload.end_date,
        start_month=payload.start_month,
        start_day=payload.start_day,
        end_month=payload.end_month,
        end_day=payload.end_day,
    )
    _validate_pricing_rule_period(rule)

    created = create_pricing_rule_record(db, hotel.id, payload)
    return serialize_pricing_rule(created, _room_type_names(db, hotel.id))


# Xu ly lay danh sach quy tac gia cua khach san.
def list_pricing_rules(db: Session, current_user: User) -> list[dict]:
    hotel = get_operating_admin_hotel(db, current_user)
    room_type_names = _room_type_names(db, hotel.id)
    return [serialize_pricing_rule(rule, room_type_names) for rule in list_pricing_rule_records(db, hotel.id)]


# Lay ten cac loai phong cua khach san de gan vao quy tac khi tra ve.
def _room_type_names(db: Session, hotel_id: int) -> dict[int, str]:
    return {item.id: item.name for item in list_room_type_records(db, hotel_id)}


# Xu ly sua quy tac gia theo mua.
def update_pricing_rule(
    db: Session, current_user: User, rule_id: int, payload: UpdatePricingRuleRequest
) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    rule = _get_own_pricing_rule(db, hotel.id, rule_id)

    update_data = payload.model_dump(exclude_unset=True)
    if "recurrence" in update_data:
        update_data["recurrence"] = PricingRecurrence(update_data["recurrence"])
    if "adjustment_type" in update_data:
        update_data["adjustment_type"] = DiscountType(update_data["adjustment_type"])
    for field, value in update_data.items():
        setattr(rule, field, value)

    _validate_pricing_rule_room_type(db, hotel.id, rule.room_type_id)
    _validate_pricing_rule_period(rule)
    _validate_pricing_rule_adjustment(
        db, hotel.id, rule.room_type_id, rule.adjustment_type, float(rule.adjustment_value)
    )

    rule = save_pricing_rule(db, rule)
    return serialize_pricing_rule(rule, _room_type_names(db, hotel.id))


# Xu ly xoa quy tac gia theo mua. Gia da sua tay trong room_type_rates khong bi
# anh huong, cac ngay con lai quay ve quy tac con lai hoac base_price.
def delete_pricing_rule(db: Session, current_user: User, rule_id: int) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    rule = _get_own_pricing_rule(db, hotel.id, rule_id)

    delete_pricing_rule_record(db, rule)
    return DeletePricingRuleResponse(id=rule_id).model_dump(mode="json")


# Xu ly tao khoa lich cho 1 phong vat ly.
def create_room_block(db: Session, current_user: User, payload: CreateRoomBlockRequest) -> dict:
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngay ket thuc phai sau ngay bat dau")

    room = get_room_by_id_for_update(db, payload.room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phong khong ton tai")
    room_type = get_room_type_by_id(db, room.room_type_id)
    validate_room_type_owner(db, room_type, current_user, require_approved=True)

    if get_overlapping_room_blocks(db, room.id, payload.start_date, payload.end_date):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phong nay da co khoa lich khac trong khoang ngay giao nhau",
        )

    block = create_room_block_record(
        db,
        room_id=room.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        created_by=current_user.id,
    )
    return RoomBlockResponse.model_validate(block).model_dump(mode="json")


# Xu ly xoa 1 khoa lich (huy khoa som).
def remove_room_block(db: Session, current_user: User, block_id: int) -> dict:
    block = get_room_block_by_id(db, block_id)
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khoa lich khong ton tai")

    room = get_room_by_id_for_update(db, block.room_id)
    room_type = get_room_type_by_id(db, room.room_type_id)
    validate_room_type_owner(db, room_type, current_user, require_approved=True)

    delete_room_block(db, block)
    return DeleteRoomBlockResponse(id=block_id).model_dump(mode="json")


# Xu ly lay danh sach khoa lich cua khach san hien tai theo khoang ngay.
def list_room_blocks(db: Session, current_user: User, from_date: date, to_date: date) -> list[dict]:
    hotel = get_operational_hotel(db, current_user)
    blocks = list_room_blocks_for_hotel(db, hotel.id, from_date, to_date)
    return [RoomBlockResponse.model_validate(block).model_dump(mode="json") for block in blocks]
