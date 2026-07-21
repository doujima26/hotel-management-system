from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.enums import DiscountType, HotelStatus
from app.models.entities import BookingService, Hotel, HotelImage, HotelService, Promotion, RoomType
from app.repositories.booking_repository import booked_quantity_subquery
from app.schemas.hotels import (
    CreateHotelImageRequest,
    CreateHotelRequest,
    CreateHotelServiceRequest,
    CreatePromotionRequest,
)


# Lay khach san theo chu so huu.
def get_hotel_by_owner(db: Session, owner_id: int) -> Hotel | None:
    return db.query(Hotel).filter(Hotel.owner_id == owner_id).first()


# Lay khach san theo id.
def get_hotel_by_id(db: Session, hotel_id: int) -> Hotel | None:
    return db.query(Hotel).filter(Hotel.id == hotel_id).first()


# Lay nhieu khach san theo danh sach id, tra ve dict de tra cuu nhanh theo id.
def get_hotels_by_ids(db: Session, hotel_ids: list[int]) -> dict[int, Hotel]:
    if not hotel_ids:
        return {}
    hotels = db.query(Hotel).filter(Hotel.id.in_(hotel_ids)).all()
    return {hotel.id: hotel for hotel in hotels}


# Tao khach san moi.
def create_hotel_record(db: Session, owner_id: int, payload: CreateHotelRequest) -> Hotel:
    hotel = Hotel(
        owner_id=owner_id,
        name=payload.name,
        description=payload.description,
        address=payload.address,
        city=payload.city,
        district=payload.district,
        phone=payload.phone,
        email=payload.email,
        star_rating=payload.star_rating,
        status=HotelStatus.PENDING,
    )
    db.add(hotel)
    db.commit()
    db.refresh(hotel)
    return hotel


# Luu thay doi khach san.
def save_hotel(db: Session, hotel: Hotel) -> Hotel:
    db.add(hotel)
    db.commit()
    db.refresh(hotel)
    return hotel


# Lay danh sach khach san da duyet, xep theo diem danh gia trung binh va so
# luot danh gia giam dan - dung cho muc "Khach san duoc yeu thich" o trang chu.
# Chi lay khach san da co it nhat 1 danh gia (tranh hien khach san chua ai
# danh gia, avg_rating dang mac dinh la 0).
def list_top_rated_hotel_records(db: Session, limit: int) -> list[Hotel]:
    return (
        db.query(Hotel)
        .filter(Hotel.status == HotelStatus.APPROVED, Hotel.total_reviews > 0)
        .order_by(Hotel.avg_rating.desc(), Hotel.total_reviews.desc())
        .limit(limit)
        .all()
    )


# Tim kiem khach san da duyet theo thanh pho va tinh trang phong trong trong khoang ngay.
def search_hotel_records(
    db: Session,
    *,
    city: str | None,
    check_in: date | None,
    check_out: date | None,
    num_guests: int | None,
    page: int,
    page_size: int,
) -> tuple[list[Hotel], int]:
    query = db.query(Hotel).filter(Hotel.status == HotelStatus.APPROVED)

    if city:
        query = query.filter(Hotel.city.ilike(f"%{city}%"))

    if check_in and check_out:
        booked_subquery = booked_quantity_subquery(db, check_in, check_out)
        available_hotel_ids = (
            db.query(RoomType.hotel_id)
            .outerjoin(booked_subquery, booked_subquery.c.room_type_id == RoomType.id)
            .filter(
                RoomType.is_active.is_(True),
                (RoomType.total_rooms - func.coalesce(booked_subquery.c.booked_quantity, 0)) > 0,
            )
        )
        if num_guests:
            available_hotel_ids = available_hotel_ids.filter(RoomType.max_guests >= num_guests)
        query = query.filter(Hotel.id.in_(available_hotel_ids.distinct().scalar_subquery()))

    total = query.count()
    hotels = (
        query.order_by(Hotel.avg_rating.desc(), Hotel.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return hotels, total


# Lay danh sach khach san cho super admin duyet, loc theo trang thai (khong loc neu None).
def list_hotel_records_for_admin(
    db: Session,
    *,
    status_filter: HotelStatus | None,
    page: int,
    page_size: int,
) -> tuple[list[Hotel], int]:
    query = db.query(Hotel)
    if status_filter:
        query = query.filter(Hotel.status == status_filter)

    total = query.count()
    hotels = (
        query.order_by(Hotel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return hotels, total


# Lay dich vu theo ten trong khach san.
def get_hotel_service_by_name(db: Session, hotel_id: int, name: str) -> HotelService | None:
    return db.query(HotelService).filter(HotelService.hotel_id == hotel_id, HotelService.name == name).first()


# Lay dich vu theo id.
def get_hotel_service_by_id(db: Session, service_id: int) -> HotelService | None:
    return db.query(HotelService).filter(HotelService.id == service_id).first()


# Tao dich vu khach san.
def create_hotel_service_record(db: Session, hotel_id: int, payload: CreateHotelServiceRequest) -> HotelService:
    service = HotelService(
        hotel_id=hotel_id,
        name=payload.name,
        description=payload.description,
        price=payload.price,
        unit=payload.unit,
        is_active=True,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


# Lay danh sach dich vu theo khach san.
def list_hotel_service_records(db: Session, hotel_id: int) -> list[HotelService]:
    return db.query(HotelService).filter(HotelService.hotel_id == hotel_id).order_by(HotelService.name.asc()).all()


# Luu thay doi dich vu khach san.
def save_hotel_service(db: Session, service: HotelService) -> HotelService:
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


# Dem so lan dich vu nay da tung duoc khach dat (booking_services) - dich vu
# da tung dung thi khong the xoa cung (FK RESTRICT tren booking_services.service_id).
def count_booking_services_by_service(db: Session, service_id: int) -> int:
    return db.query(func.count(BookingService.id)).filter(BookingService.service_id == service_id).scalar() or 0


# Xoa cung dich vu khach san (chi goi sau khi da kiem tra chua tung duoc dat).
def delete_hotel_service_record(db: Session, service: HotelService) -> None:
    db.delete(service)
    db.commit()


# Lay khuyen mai theo id.
def get_promotion_by_id(db: Session, promotion_id: int) -> Promotion | None:
    return db.query(Promotion).filter(Promotion.id == promotion_id).first()


# Lay khuyen mai theo id va khoa dong de ap dung vao booking an toan (tranh
# race condition tren used_count).
def get_promotion_by_id_for_update(db: Session, promotion_id: int) -> Promotion | None:
    return db.query(Promotion).filter(Promotion.id == promotion_id).with_for_update().first()


# Lay danh sach khuyen mai dang hop le (con hieu luc) cua khach san, dung cho
# endpoint cong khai de khach xem truoc khi dat - khac list_promotion_records
# (Admin xem tat ca, khong loc ngay/trang thai).
def list_valid_promotion_records(db: Session, hotel_id: int, today: date) -> list[Promotion]:
    return (
        db.query(Promotion)
        .filter(
            Promotion.hotel_id == hotel_id,
            Promotion.is_active.is_(True),
            Promotion.start_date <= today,
            Promotion.end_date >= today,
        )
        .filter((Promotion.usage_limit.is_(None)) | (Promotion.used_count < Promotion.usage_limit))
        .order_by(Promotion.start_date.desc())
        .all()
    )


# Lay tat ca khuyen mai dang hop le (con hieu luc) cua CAC khach san da duyet -
# dung cho trang chu de tim khach san dang co uu dai, khac list_valid_promotion_records
# (loc theo 1 khach san cu the).
def list_valid_promotions_for_approved_hotels(db: Session, today: date) -> list[Promotion]:
    return (
        db.query(Promotion)
        .join(Hotel, Hotel.id == Promotion.hotel_id)
        .filter(
            Hotel.status == HotelStatus.APPROVED,
            Promotion.is_active.is_(True),
            Promotion.start_date <= today,
            Promotion.end_date >= today,
        )
        .filter((Promotion.usage_limit.is_(None)) | (Promotion.used_count < Promotion.usage_limit))
        .all()
    )


# Lay gia phong re nhat (dang hoat dong) cua tung khach san trong danh sach id -
# dung lam gia tham chieu de tinh % giam gia hien thi o trang chu.
def get_min_active_room_price_by_hotel_ids(db: Session, hotel_ids: list[int]) -> dict[int, float]:
    if not hotel_ids:
        return {}
    rows = (
        db.query(RoomType.hotel_id, func.min(RoomType.base_price))
        .filter(RoomType.hotel_id.in_(hotel_ids), RoomType.is_active.is_(True))
        .group_by(RoomType.hotel_id)
        .all()
    )
    return {hotel_id: float(price) for hotel_id, price in rows}


# Lay anh dai dien (hoac anh dau tien neu chua dat dai dien) cua tung khach san
# trong danh sach id - dung cho cac khoi hien thi rut gon o trang chu.
def get_primary_image_url_by_hotel_ids(db: Session, hotel_ids: list[int]) -> dict[int, str]:
    if not hotel_ids:
        return {}
    images = (
        db.query(HotelImage)
        .filter(HotelImage.hotel_id.in_(hotel_ids))
        .order_by(HotelImage.hotel_id.asc(), HotelImage.is_primary.desc(), HotelImage.sort_order.asc())
        .all()
    )
    result: dict[int, str] = {}
    for image in images:
        if image.hotel_id not in result:
            result[image.hotel_id] = image.image_url
    return result


# Tao khuyen mai.
def create_promotion_record(db: Session, hotel_id: int, payload: CreatePromotionRequest) -> Promotion:
    promotion = Promotion(
        hotel_id=hotel_id,
        name=payload.name,
        description=payload.description,
        discount_type=DiscountType(payload.discount_type),
        discount_value=payload.discount_value,
        min_booking_amount=payload.min_booking_amount,
        max_discount_amount=payload.max_discount_amount,
        start_date=payload.start_date,
        end_date=payload.end_date,
        usage_limit=payload.usage_limit,
        used_count=0,
        is_active=True,
    )
    db.add(promotion)
    db.commit()
    db.refresh(promotion)
    return promotion


# Lay danh sach khuyen mai theo khach san.
def list_promotion_records(db: Session, hotel_id: int) -> list[Promotion]:
    return db.query(Promotion).filter(Promotion.hotel_id == hotel_id).order_by(Promotion.start_date.desc()).all()


# Luu thay doi khuyen mai.
def save_promotion(db: Session, promotion: Promotion) -> Promotion:
    db.add(promotion)
    db.commit()
    db.refresh(promotion)
    return promotion


# Xoa cung khuyen mai (chi goi sau khi da kiem tra chua co booking nao dung).
def delete_promotion_record(db: Session, promotion: Promotion) -> None:
    db.delete(promotion)
    db.commit()


# Tao anh moi cho khach san.
def create_hotel_image_record(db: Session, hotel_id: int, payload: CreateHotelImageRequest) -> HotelImage:
    if payload.is_primary:
        db.query(HotelImage).filter(
            HotelImage.hotel_id == hotel_id,
            HotelImage.is_primary.is_(True),
        ).update({"is_primary": False})

    max_sort_order = db.query(func.max(HotelImage.sort_order)).filter(HotelImage.hotel_id == hotel_id).scalar()
    image = HotelImage(
        hotel_id=hotel_id,
        image_url=payload.image_url,
        is_primary=payload.is_primary,
        sort_order=(max_sort_order or 0) + 1,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


# Lay danh sach anh theo khach san.
def list_hotel_image_records(db: Session, hotel_id: int) -> list[HotelImage]:
    return db.query(HotelImage).filter(HotelImage.hotel_id == hotel_id).order_by(HotelImage.sort_order.asc()).all()


# Lay anh khach san theo id.
def get_hotel_image_by_id(db: Session, image_id: int) -> HotelImage | None:
    return db.query(HotelImage).filter(HotelImage.id == image_id).first()


# Xoa anh khach san.
def delete_hotel_image_record(db: Session, image: HotelImage) -> None:
    db.delete(image)
    db.commit()


# Dat mot anh lam anh dai dien va bo dai dien cac anh con lai.
def set_hotel_image_primary(db: Session, hotel_id: int, image: HotelImage) -> HotelImage:
    db.query(HotelImage).filter(
        HotelImage.hotel_id == hotel_id,
        HotelImage.id != image.id,
    ).update({"is_primary": False})
    image.is_primary = True
    db.add(image)
    db.commit()
    db.refresh(image)
    return image
