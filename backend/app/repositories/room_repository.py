from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.enums import RoomStatus
from app.models.entities import Amenity, BookingRoom, BookingRoomUnit, Hotel, Room, RoomType, RoomTypeAmenity, RoomTypeImage
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


# Dem so phong vat ly (con hoat dong) cua loai phong.
def count_rooms_by_room_type(db: Session, room_type_id: int) -> int:
    return (
        db.query(func.count(Room.id))
        .filter(Room.room_type_id == room_type_id, Room.is_active.is_(True))
        .scalar()
        or 0
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


# Tao phong vat ly moi.
def create_room_record(db: Session, payload: CreateRoomRequest) -> Room:
    room = Room(
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


# Tao tien nghi cho khach san.
def create_amenity_record(db: Session, hotel_id: int, payload: CreateAmenityRequest) -> Amenity:
    amenity = Amenity(
        hotel_id=hotel_id,
        name=payload.name,
        icon=payload.icon,
        category=payload.category,
    )
    db.add(amenity)
    db.commit()
    db.refresh(amenity)
    return amenity


# Lay danh sach tien nghi theo khach san.
def list_amenity_records(db: Session, hotel_id: int) -> list[Amenity]:
    return db.query(Amenity).filter(Amenity.hotel_id == hotel_id).order_by(Amenity.name.asc()).all()


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
