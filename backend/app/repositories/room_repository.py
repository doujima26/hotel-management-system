from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.enums import AmenityScope, BookingStatus, DiscountType, RoomStatus
from app.models.entities import (
    Amenity,
    Booking,
    BookingRoom,
    BookingRoomUnit,
    Hotel,
    HotelAmenity,
    Room,
    RoomBlock,
    RoomType,
    RoomTypeAmenity,
    RoomTypeImage,
    RoomTypeRate,
)
from app.repositories.booking_repository import booked_quantity_subquery
from app.schemas.rooms import (
    CreateAmenityRequest,
    CreateRoomRequest,
    CreateRoomTypeImageRequest,
    CreateRoomTypeRequest,
)


# Lay khach san theo id.
def get_hotel_by_id(db: Session, hotel_id: int) -> Hotel | None:
    return db.query(Hotel).filter(Hotel.id == hotel_id).first()


# Lay khach san theo chu so huu.
def get_hotel_by_owner(db: Session, owner_id: int) -> Hotel | None:
    return db.query(Hotel).filter(Hotel.owner_id == owner_id).first()


# Tao loai phong moi.
def create_room_type_record(db: Session, payload: CreateRoomTypeRequest) -> RoomType:
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
    return room_type


# Luu thay doi loai phong (dung cho sua thong tin/tat mo is_active).
def save_room_type(db: Session, room_type: RoomType) -> RoomType:
    db.add(room_type)
    db.commit()
    db.refresh(room_type)
    return room_type


# Dem TAT CA phong vat ly (khong loc is_active) cua loai phong - dung de kiem
# tra co an toan xoa cung loai phong khong (con row la con bi FK RESTRICT chan).
def count_all_rooms_by_room_type(db: Session, room_type_id: int) -> int:
    return db.query(func.count(Room.id)).filter(Room.room_type_id == room_type_id).scalar() or 0


# Dem so dong booking_rooms da tung dat loai phong nay - loai phong da tung
# duoc dat thi khong the xoa cung (FK RESTRICT), du phong vat ly co the da bi xoa.
def count_booking_rooms_by_room_type(db: Session, room_type_id: int) -> int:
    return db.query(func.count(BookingRoom.id)).filter(BookingRoom.room_type_id == room_type_id).scalar() or 0


# Xoa cung loai phong (chi goi sau khi da kiem tra khong con phong vat ly/booking nao).
def delete_room_type_record(db: Session, room_type: RoomType) -> None:
    db.delete(room_type)
    db.commit()


# Lay danh sach loai phong theo khach san.
def list_room_type_records(db: Session, hotel_id: int) -> list[RoomType]:
    return db.query(RoomType).filter(RoomType.hotel_id == hotel_id).all()


# Lay loai phong theo id.
def get_room_type_by_id(db: Session, room_type_id: int) -> RoomType | None:
    return db.query(RoomType).filter(RoomType.id == room_type_id).first()


# Lay loai phong theo id va khoa dong de tao phong an toan.
def get_room_type_by_id_for_update(db: Session, room_type_id: int) -> RoomType | None:
    return db.query(RoomType).filter(RoomType.id == room_type_id).with_for_update().first()


# Dem so phong vat ly (con hoat dong) cua loai phong - dung de kiem tra suc
# chua vat ly khi tao phong moi / doi total_rooms (khong loai phong dang bao
# tri, vi phong do van la 1 phong vat ly co that, chi tam thoi khong ban duoc).
def count_rooms_by_room_type(db: Session, room_type_id: int) -> int:
    return (
        db.query(func.count(Room.id))
        .filter(Room.room_type_id == room_type_id, Room.is_active.is_(True))
        .scalar()
        or 0
    )


# Dem so phong vat ly CO THE BAN DUOC cua loai phong - loai ca phong dang bao
# tri (MAINTENANCE) khoi tong, vi phong nay khong san sang phuc vu khach du
# van "is_active". Dung rieng cho tinh tong phong khi kiem tra dat phong -
# neu dung chung count_rooms_by_room_type (dem suc chua vat ly) thi khach
# van dat duoc phong dang sua chua, chi lo ra luc check-in.
def count_sellable_rooms_by_room_type(db: Session, room_type_id: int) -> int:
    return (
        db.query(func.count(Room.id))
        .filter(
            Room.room_type_id == room_type_id,
            Room.is_active.is_(True),
            Room.status != RoomStatus.MAINTENANCE,
        )
        .scalar()
        or 0
    )


# Dem so phong vat ly CO THE BAN DUOC cua loai phong cho 1 khoang ngay cu the -
# giong count_sellable_rooms_by_room_type nhung loai them ca nhung phong dang
# bi khoa lich (room_blocks) giao voi khoang ngay nay. Mot phong bi khoa ngay
# X-Y van ban duoc binh thuong cho cac khoang ngay khac khong giao voi khoa do.
def count_sellable_rooms_for_dates(db: Session, room_type_id: int, check_in: date, check_out: date) -> int:
    blocked_room_ids = db.query(RoomBlock.room_id).filter(
        RoomBlock.start_date < check_out,
        RoomBlock.end_date >= check_in,
    )
    return (
        db.query(func.count(Room.id))
        .filter(
            Room.room_type_id == room_type_id,
            Room.is_active.is_(True),
            Room.status != RoomStatus.MAINTENANCE,
            Room.id.notin_(blocked_room_ids.scalar_subquery()),
        )
        .scalar()
        or 0
    )


# Lay gia ghi de theo ngay trong 1 khoang, tra ve dict {ngay: gia} de tra cuu
# nhanh - dung chung cho tinh tien booking va hien thi lich gia, tranh N+1.
def get_rates_in_range(db: Session, room_type_id: int, from_date: date, to_date: date) -> dict[date, float]:
    rows = (
        db.query(RoomTypeRate.rate_date, RoomTypeRate.price)
        .filter(
            RoomTypeRate.room_type_id == room_type_id,
            RoomTypeRate.rate_date >= from_date,
            RoomTypeRate.rate_date <= to_date,
        )
        .all()
    )
    return {rate_date: float(price) for rate_date, price in rows}


# Sua tay gia 1 ngay cu the (tao moi hoac ghi de neu da co).
def upsert_room_type_rate(db: Session, room_type_id: int, rate_date: date, price: float) -> RoomTypeRate:
    existing = (
        db.query(RoomTypeRate)
        .filter(RoomTypeRate.room_type_id == room_type_id, RoomTypeRate.rate_date == rate_date)
        .first()
    )
    if existing:
        existing.price = price
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    rate = RoomTypeRate(room_type_id=room_type_id, rate_date=rate_date, price=price)
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return rate


# Xoa gia ghi de 1 ngay - quay ve dung gia mac dinh (base_price). Tra ve False
# neu ngay do dang khong co ghi de nao (khong co gi de xoa).
def delete_room_type_rate(db: Session, room_type_id: int, rate_date: date) -> bool:
    existing = (
        db.query(RoomTypeRate)
        .filter(RoomTypeRate.room_type_id == room_type_id, RoomTypeRate.rate_date == rate_date)
        .first()
    )
    if not existing:
        return False
    db.delete(existing)
    db.commit()
    return True


# Ap gia theo mua cho 1 khoang ngay: tinh 1 gia duy nhat tu base_price + dieu
# chinh (phan tram hoac so tien, co dau - am la giam gia, duong la phu thu),
# roi ghi de hang loat vao room_type_rates cho tung ngay trong khoang. Day la
# hanh dong tinh-va-ghi-mot-lan (khong luu lai "quy tac" o dau ca) - sau khi
# ap xong, Admin van sua tay tung ngay binh thuong qua upsert_room_type_rate.
def bulk_upsert_room_type_rates(
    db: Session,
    room_type_id: int,
    base_price: float,
    from_date: date,
    to_date: date,
    adjustment_type: DiscountType,
    adjustment_value: float,
) -> None:
    if adjustment_type == DiscountType.PERCENTAGE:
        new_price = base_price * (1 + adjustment_value / 100)
    else:
        new_price = base_price + adjustment_value
    new_price = round(new_price, 2)

    existing_rows = {
        rate.rate_date: rate
        for rate in db.query(RoomTypeRate)
        .filter(
            RoomTypeRate.room_type_id == room_type_id,
            RoomTypeRate.rate_date >= from_date,
            RoomTypeRate.rate_date <= to_date,
        )
        .all()
    }

    current = from_date
    while current <= to_date:
        existing = existing_rows.get(current)
        if existing:
            existing.price = new_price
            db.add(existing)
        else:
            db.add(RoomTypeRate(room_type_id=room_type_id, rate_date=current, price=new_price))
        current += timedelta(days=1)

    db.commit()


# Kiem tra 1 phong da co khoa lich nao giao voi khoang ngay moi chua (ca 2 dau
# dong) - dung khi TAO khoa moi de tranh 2 khoa chong nhau tren cung 1 phong.
def get_overlapping_room_blocks(db: Session, room_id: int, start_date: date, end_date: date) -> list[RoomBlock]:
    return (
        db.query(RoomBlock)
        .filter(
            RoomBlock.room_id == room_id,
            RoomBlock.start_date <= end_date,
            RoomBlock.end_date >= start_date,
        )
        .all()
    )


# Lay cac khoa lich cua 1 phong giao voi 1 ky luu tru (nua-mo, giong bookings:
# check_out la ngay tra phong, khong tinh la dem o) - dung luc tao booking va
# luc check-in de biet phong co dang bi khoa dung ngay khach can khong.
def get_room_blocks_for_stay(db: Session, room_id: int, check_in: date, check_out: date) -> list[RoomBlock]:
    return (
        db.query(RoomBlock)
        .filter(
            RoomBlock.room_id == room_id,
            RoomBlock.start_date < check_out,
            RoomBlock.end_date >= check_in,
        )
        .all()
    )


# Dem so phong vat ly theo tung trang thai (RoomStatus) cua 1 khach san -
# dung cho Dashboard tong quan van hanh.
def count_rooms_by_status(db: Session, hotel_id: int) -> dict[str, int]:
    rows = (
        db.query(Room.status, func.count(Room.id))
        .join(RoomType, RoomType.id == Room.room_type_id)
        .filter(RoomType.hotel_id == hotel_id)
        .group_by(Room.status)
        .all()
    )
    return {status.value: int(count) for status, count in rows}


# Lay khoa lich dang co hieu luc DUNG 1 ngay cu the, cho tat ca phong thuoc 1
# khach san trong 1 lan truy van - dung cho so do phong, tranh N+1.
def get_active_room_blocks_for_hotel(db: Session, hotel_id: int, on_date: date) -> dict[int, RoomBlock]:
    rows = (
        db.query(RoomBlock)
        .join(Room, Room.id == RoomBlock.room_id)
        .filter(Room.hotel_id == hotel_id, RoomBlock.start_date <= on_date, RoomBlock.end_date >= on_date)
        .all()
    )
    return {block.room_id: block for block in rows}


# Tao khoa lich moi cho 1 phong vat ly.
def create_room_block_record(
    db: Session, *, room_id: int, start_date: date, end_date: date, reason: str | None, created_by: int
) -> RoomBlock:
    block = RoomBlock(
        room_id=room_id,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        created_by=created_by,
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


# Lay khoa lich theo id.
def get_room_block_by_id(db: Session, block_id: int) -> RoomBlock | None:
    return db.query(RoomBlock).filter(RoomBlock.id == block_id).first()


# Xoa 1 khoa lich (huy khoa som, vi du sua xong truoc du kien).
def delete_room_block(db: Session, block: RoomBlock) -> None:
    db.delete(block)
    db.commit()


# Lay danh sach khoa lich cua toan bo phong thuoc 1 khach san, loc theo khoang
# ngay giao nhau - dung cho trang quan ly xem lich khoa hien tai.
def list_room_blocks_for_hotel(db: Session, hotel_id: int, from_date: date, to_date: date) -> list[RoomBlock]:
    return (
        db.query(RoomBlock)
        .join(Room, Room.id == RoomBlock.room_id)
        .filter(
            Room.hotel_id == hotel_id,
            RoomBlock.start_date <= to_date,
            RoomBlock.end_date >= from_date,
        )
        .order_by(RoomBlock.start_date.asc())
        .all()
    )


# Lay phong vat ly theo id va khoa dong de gan phong khi check-in an toan.
def get_room_by_id_for_update(db: Session, room_id: int) -> Room | None:
    return db.query(Room).filter(Room.id == room_id).with_for_update().first()


# Lay phong vat ly theo id, khong khoa dong (dung de xem/kiem tra quyen).
def get_room_by_id(db: Session, room_id: int) -> Room | None:
    return db.query(Room).filter(Room.id == room_id).first()


# Luu thay doi phong vat ly (dung cho sua so phong/tang/tat mo is_active).
def save_room(db: Session, room: Room) -> Room:
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


# Dem so lan phong vat ly nay da tung duoc gan cho khach check-in - phong da
# tung dung thi khong the xoa cung (FK RESTRICT tren booking_room_units.room_id).
def count_booking_room_units_by_room(db: Session, room_id: int) -> int:
    return db.query(func.count(BookingRoomUnit.id)).filter(BookingRoomUnit.room_id == room_id).scalar() or 0


# Xoa cung phong vat ly (chi goi sau khi da kiem tra chua tung duoc gan check-in).
def delete_room_record(db: Session, room: Room) -> None:
    db.delete(room)
    db.commit()


# Lay danh sach phong vat ly kem ten loai phong theo khach san, dung cho so do phong.
def list_rooms_with_type_by_hotel(db: Session, hotel_id: int) -> list[tuple[Room, RoomType]]:
    return (
        db.query(Room, RoomType)
        .join(RoomType, RoomType.id == Room.room_type_id)
        .filter(RoomType.hotel_id == hotel_id)
        .order_by(Room.floor.asc().nullslast(), Room.room_number.asc())
        .all()
    )


# Tao phong vat ly moi. hotel_id lay tu room_type lien ket (server tu suy ra,
# khong nhan tu client) de dam bao dung khach san va khop rang buoc duy nhat
# (hotel_id, room_number).
def create_room_record(db: Session, payload: CreateRoomRequest, hotel_id: int) -> Room:
    room = Room(
        hotel_id=hotel_id,
        room_type_id=payload.room_type_id,
        room_number=payload.room_number,
        floor=payload.floor,
        status=RoomStatus.AVAILABLE,
        is_active=True,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


# Lay danh sach phong vat ly theo loai phong.
def list_room_records(db: Session, room_type_id: int) -> list[Room]:
    return db.query(Room).filter(Room.room_type_id == room_type_id).all()


# Lay tinh trang phong trong cua tung loai phong trong khach san theo khoang ngay.
# Luu y: "trong" tinh theo SO PHONG VAT LY THAT SU da tao (bang rooms), khong dung
# RoomType.total_rooms (chi la con so Admin tu khai bao luc tao loai phong, co the
# chua co phong vat ly nao tuong ung). Loai phong chua co phong vat ly nao (INNER
# JOIN voi room_count_subquery) se bi loai han khoi ket qua - khac voi loai phong
# da het phong cho khoang ngay nay (van con trong danh sach, available_rooms=0).
def list_room_type_availability(
    db: Session,
    hotel_id: int,
    check_in: date,
    check_out: date,
    num_guests: int | None,
) -> list[tuple[RoomType, int, int]]:
    booked_subquery = booked_quantity_subquery(db, check_in, check_out)
    room_count_subquery = (
        db.query(
            Room.room_type_id.label("room_type_id"),
            func.count(Room.id).label("room_count"),
        )
        .filter(Room.is_active.is_(True))
        .group_by(Room.room_type_id)
        .subquery()
    )
    query = (
        db.query(
            RoomType,
            func.coalesce(booked_subquery.c.booked_quantity, 0).label("booked_rooms"),
            room_count_subquery.c.room_count.label("actual_room_count"),
        )
        .outerjoin(booked_subquery, booked_subquery.c.room_type_id == RoomType.id)
        .join(room_count_subquery, room_count_subquery.c.room_type_id == RoomType.id)
        .filter(RoomType.hotel_id == hotel_id, RoomType.is_active.is_(True))
    )
    if num_guests:
        query = query.filter(RoomType.max_guests >= num_guests)

    results = []
    for room_type, booked_rooms, actual_room_count in query.order_by(RoomType.base_price.asc()).all():
        booked = int(booked_rooms)
        available = max(int(actual_room_count) - booked, 0)
        results.append((room_type, booked, available))
    return results


# Tao tien nghi moi trong danh muc chung (Super Admin quan ly).
def create_amenity_record(db: Session, payload: CreateAmenityRequest) -> Amenity:
    amenity = Amenity(
        name=payload.name,
        scope=payload.scope,
        icon=payload.icon,
        category=payload.category,
    )
    db.add(amenity)
    db.commit()
    db.refresh(amenity)
    return amenity


# Lay danh sach tien nghi trong danh muc chung theo pham vi (hotel hoac room).
def list_amenity_records_by_scope(db: Session, scope: AmenityScope) -> list[Amenity]:
    return db.query(Amenity).filter(Amenity.scope == scope).order_by(Amenity.name.asc()).all()


# Tao lien ket khach san va tien nghi chung.
def create_hotel_amenity_link(db: Session, hotel_id: int, amenity_id: int) -> HotelAmenity:
    link = HotelAmenity(hotel_id=hotel_id, amenity_id=amenity_id)
    db.add(link)
    db.commit()
    return link


# Lay lien ket khach san va tien nghi chung.
def get_hotel_amenity_link(db: Session, hotel_id: int, amenity_id: int) -> HotelAmenity | None:
    return (
        db.query(HotelAmenity)
        .filter(HotelAmenity.hotel_id == hotel_id, HotelAmenity.amenity_id == amenity_id)
        .first()
    )


# Xoa 1 lien ket khach san - tien nghi chung cu the (go tien nghi khoi khach san, khong xoa amenity).
def delete_hotel_amenity_link(db: Session, link: HotelAmenity) -> None:
    db.delete(link)
    db.commit()


# Lay danh sach tien nghi chung da gan cho 1 khach san.
def list_hotel_amenity_records(db: Session, hotel_id: int) -> list[Amenity]:
    return (
        db.query(Amenity)
        .join(HotelAmenity, HotelAmenity.amenity_id == Amenity.id)
        .filter(HotelAmenity.hotel_id == hotel_id)
        .order_by(Amenity.name.asc())
        .all()
    )


# Lay tien nghi theo id.
def get_amenity_by_id(db: Session, amenity_id: int) -> Amenity | None:
    return db.query(Amenity).filter(Amenity.id == amenity_id).first()


# Luu thay doi tien nghi (sua ten/icon/category).
def save_amenity(db: Session, amenity: Amenity) -> Amenity:
    db.add(amenity)
    db.commit()
    db.refresh(amenity)
    return amenity


# Xoa tien nghi (DB tu dong xoa cac lien ket room_type_amenities nho ON DELETE CASCADE).
def delete_amenity_record(db: Session, amenity: Amenity) -> None:
    db.delete(amenity)
    db.commit()


# Xoa 1 lien ket loai phong - tien nghi cu the (go tien nghi khoi loai phong, khong xoa amenity).
def delete_room_type_amenity_link(db: Session, link: RoomTypeAmenity) -> None:
    db.delete(link)
    db.commit()


# Lay lien ket loai phong va tien nghi.
def get_room_type_amenity_link(db: Session, room_type_id: int, amenity_id: int) -> RoomTypeAmenity | None:
    return (
        db.query(RoomTypeAmenity)
        .filter(
            RoomTypeAmenity.room_type_id == room_type_id,
            RoomTypeAmenity.amenity_id == amenity_id,
        )
        .first()
    )


# Tao lien ket loai phong va tien nghi.
def create_room_type_amenity_link(db: Session, room_type_id: int, amenity_id: int) -> RoomTypeAmenity:
    link = RoomTypeAmenity(room_type_id=room_type_id, amenity_id=amenity_id)
    db.add(link)
    db.commit()
    return link


# Lay danh sach tien nghi cua loai phong.
def list_room_type_amenity_records(db: Session, room_type_id: int) -> list[Amenity]:
    return (
        db.query(Amenity)
        .join(RoomTypeAmenity, RoomTypeAmenity.amenity_id == Amenity.id)
        .filter(RoomTypeAmenity.room_type_id == room_type_id)
        .order_by(Amenity.name.asc())
        .all()
    )


# Lay tien nghi cua NHIEU loai phong trong 1 query (tranh N+1 khi liet ke phong trong).
def list_amenities_by_room_type_ids(db: Session, room_type_ids: list[int]) -> dict[int, list[Amenity]]:
    if not room_type_ids:
        return {}
    rows = (
        db.query(RoomTypeAmenity.room_type_id, Amenity)
        .join(Amenity, Amenity.id == RoomTypeAmenity.amenity_id)
        .filter(RoomTypeAmenity.room_type_id.in_(room_type_ids))
        .order_by(Amenity.name.asc())
        .all()
    )
    grouped: dict[int, list[Amenity]] = {}
    for room_type_id, amenity in rows:
        grouped.setdefault(room_type_id, []).append(amenity)
    return grouped


# Lay anh cua NHIEU loai phong trong 1 query, anh dai dien xep truoc.
def list_images_by_room_type_ids(db: Session, room_type_ids: list[int]) -> dict[int, list[RoomTypeImage]]:
    if not room_type_ids:
        return {}
    rows = (
        db.query(RoomTypeImage)
        .filter(RoomTypeImage.room_type_id.in_(room_type_ids))
        .order_by(RoomTypeImage.is_primary.desc(), RoomTypeImage.sort_order.asc(), RoomTypeImage.id.asc())
        .all()
    )
    grouped: dict[int, list[RoomTypeImage]] = {}
    for image in rows:
        grouped.setdefault(image.room_type_id, []).append(image)
    return grouped


# Tao anh moi cho loai phong.
def create_room_type_image_record(db: Session, room_type_id: int, payload: CreateRoomTypeImageRequest) -> RoomTypeImage:
    if payload.is_primary:
        db.query(RoomTypeImage).filter(
            RoomTypeImage.room_type_id == room_type_id,
            RoomTypeImage.is_primary.is_(True),
        ).update({"is_primary": False})

    max_sort_order = db.query(func.max(RoomTypeImage.sort_order)).filter(RoomTypeImage.room_type_id == room_type_id).scalar()
    image = RoomTypeImage(
        room_type_id=room_type_id,
        image_url=payload.image_url,
        is_primary=payload.is_primary,
        sort_order=(max_sort_order or 0) + 1,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


# Lay danh sach anh theo loai phong.
def list_room_type_image_records(db: Session, room_type_id: int) -> list[RoomTypeImage]:
    return (
        db.query(RoomTypeImage)
        .filter(RoomTypeImage.room_type_id == room_type_id)
        .order_by(RoomTypeImage.sort_order.asc())
        .all()
    )


# Lay anh loai phong theo id.
def get_room_type_image_by_id(db: Session, image_id: int) -> RoomTypeImage | None:
    return db.query(RoomTypeImage).filter(RoomTypeImage.id == image_id).first()


# Xoa anh loai phong.
def delete_room_type_image_record(db: Session, image: RoomTypeImage) -> None:
    db.delete(image)
    db.commit()


# Dat mot anh lam anh dai dien va bo dai dien cac anh con lai.
def set_room_type_image_primary(db: Session, room_type_id: int, image: RoomTypeImage) -> RoomTypeImage:
    db.query(RoomTypeImage).filter(
        RoomTypeImage.room_type_id == room_type_id,
        RoomTypeImage.id != image.id,
    ).update({"is_primary": False})
    image.is_primary = True
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


# Cac trang thai booking khong con chiem giu phong (dung chung cach tinh voi
# booking_repository de lich phong khop voi ket qua tim phong trong). Checked_out
# cung khong con chiem giu du check_out_date goc chua toi - xem giai thich o
# booking_repository._INACTIVE_BOOKING_STATUSES.
_INACTIVE_BOOKING_STATUSES = (BookingStatus.CANCELLED, BookingStatus.NO_SHOW, BookingStatus.CHECKED_OUT)


# Dem so phong vat ly BAN DUOC (active, khong dang bao tri) theo tung loai
# phong cua 1 khach san - dung lam tong mau so cho lich ton phong, khop voi
# cach tinh cua count_sellable_rooms_by_room_type (dung khi tao booking that)
# thay vi chi dem phong active nhu truoc (se tinh du ca phong dang bao tri).
def count_sellable_rooms_by_room_type_map(db: Session, hotel_id: int) -> dict[int, int]:
    rows = (
        db.query(Room.room_type_id, func.count(Room.id))
        .join(RoomType, RoomType.id == Room.room_type_id)
        .filter(RoomType.hotel_id == hotel_id, Room.is_active.is_(True), Room.status != RoomStatus.MAINTENANCE)
        .group_by(Room.room_type_id)
        .all()
    )
    return {room_type_id: int(count) for room_type_id, count in rows}


# Lay cac dong dat phong con hieu luc giao voi khoang ngay, kem loai phong va so
# luong - dung de dung lich ton phong theo tung ngay.
def list_booked_rooms_in_range(
    db: Session, hotel_id: int, from_date: date, to_date: date
) -> list[tuple[int, date, date, int]]:
    return (
        db.query(BookingRoom.room_type_id, Booking.check_in_date, Booking.check_out_date, BookingRoom.quantity)
        .join(Booking, Booking.id == BookingRoom.booking_id)
        .filter(
            Booking.hotel_id == hotel_id,
            Booking.status.notin_(_INACTIVE_BOOKING_STATUSES),
            # Giao nhau voi khoang ngay: booking chiem phong tu check_in den
            # truoc check_out (ngay tra phong khong tinh la dem chiem giu).
            Booking.check_in_date <= to_date,
            Booking.check_out_date > from_date,
        )
        .all()
    )


# Lay cac dong khoa lich phong giao voi khoang ngay, kem loai phong - dung de
# dung lich ton phong theo tung ngay (giong list_booked_rooms_in_range nhung
# cho room_blocks; khoang ngay cua block dong ca 2 dau, khac booking nua-mo).
def list_room_blocks_in_range_by_room_type(
    db: Session, hotel_id: int, from_date: date, to_date: date
) -> list[tuple[int, date, date]]:
    return (
        db.query(Room.room_type_id, RoomBlock.start_date, RoomBlock.end_date)
        .join(Room, Room.id == RoomBlock.room_id)
        .filter(
            Room.hotel_id == hotel_id,
            RoomBlock.start_date <= to_date,
            RoomBlock.end_date >= from_date,
        )
        .all()
    )
