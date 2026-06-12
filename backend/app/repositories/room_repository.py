from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.entities import Amenity, Hotel, Room, RoomType, RoomTypeAmenity
from app.schemas.rooms import CreateAmenityRequest, CreateRoomRequest, CreateRoomTypeRequest


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


# Lay danh sach loai phong theo khach san.
def list_room_type_records(db: Session, hotel_id: int) -> list[RoomType]:
    return db.query(RoomType).filter(RoomType.hotel_id == hotel_id).all()


# Lay loai phong theo id.
def get_room_type_by_id(db: Session, room_type_id: int) -> RoomType | None:
    return db.query(RoomType).filter(RoomType.id == room_type_id).first()


# Lay loai phong theo id va khoa dong de tao phong an toan.
def get_room_type_by_id_for_update(db: Session, room_type_id: int) -> RoomType | None:
    return db.query(RoomType).filter(RoomType.id == room_type_id).with_for_update().first()


# Dem so phong vat ly cua loai phong.
def count_rooms_by_room_type(db: Session, room_type_id: int) -> int:
    return db.query(func.count(Room.id)).filter(Room.room_type_id == room_type_id).scalar() or 0


# Tao phong vat ly moi.
def create_room_record(db: Session, payload: CreateRoomRequest) -> Room:
    room = Room(
        room_type_id=payload.room_type_id,
        room_number=payload.room_number,
        floor=payload.floor,
        status="available",
        is_active=True,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


# Lay danh sach phong vat ly theo loai phong.
def list_room_records(db: Session, room_type_id: int) -> list[Room]:
    return db.query(Room).filter(Room.room_type_id == room_type_id).all()


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
