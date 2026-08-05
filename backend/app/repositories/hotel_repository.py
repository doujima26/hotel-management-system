from datetime import date

from sqlalchemy import func, nullslast
from sqlalchemy.orm import Session

from app.core.enums import BookingStatus, DiscountType, HotelSortOption, HotelStatus, PaymentStatus
from app.models.entities import (
    Amenity,
    Booking,
    BookingService,
    Hotel,
    HotelAmenity,
    HotelImage,
    HotelPayout,
    HotelService,
    Payment,
    Promotion,
    RoomType,
    RoomTypeAmenity,
)
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


# Lay khach san cua NHIEU chu so huu, tra ve map owner_id -> khach san.
def list_hotels_by_owner_ids(db: Session, owner_ids: list[int]) -> dict[int, Hotel]:
    if not owner_ids:
        return {}
    rows = db.query(Hotel).filter(Hotel.owner_id.in_(owner_ids)).all()
    return {hotel.owner_id: hotel for hotel in rows}


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
# Dung bieu thuc gia phong tham khao cua tung khach san de sap xep theo gia -
# lay MIN gia phong con hoat dong hop so khach, neu khong co thi fallback MIN
# gia phong bat ky (khop logic get_reference_room_type_by_hotel_ids).
def _reference_price_expr(db: Session, num_guests: int | None):
    min_all = (
        db.query(func.min(RoomType.base_price))
        .filter(RoomType.hotel_id == Hotel.id, RoomType.is_active.is_(True))
        .correlate(Hotel)
        .scalar_subquery()
    )
    if not num_guests:
        return min_all
    min_fit = (
        db.query(func.min(RoomType.base_price))
        .filter(
            RoomType.hotel_id == Hotel.id,
            RoomType.is_active.is_(True),
            RoomType.max_guests >= num_guests,
        )
        .correlate(Hotel)
        .scalar_subquery()
    )
    return func.coalesce(min_fit, min_all)


# Dung danh sach order_by theo lua chon sap xep - luon them Hotel.id.asc() lam
# tiebreak de phan trang on dinh.
def _build_hotel_sort(sort: HotelSortOption, db: Session, num_guests: int | None):
    if sort == HotelSortOption.PRICE_ASC:
        return [nullslast(_reference_price_expr(db, num_guests).asc()), Hotel.id.asc()]
    if sort == HotelSortOption.PRICE_DESC:
        return [nullslast(_reference_price_expr(db, num_guests).desc()), Hotel.id.asc()]
    if sort == HotelSortOption.RATING_DESC:
        return [Hotel.avg_rating.desc(), Hotel.total_reviews.desc(), Hotel.id.asc()]
    if sort == HotelSortOption.STAR_DESC:
        return [nullslast(Hotel.star_rating.desc()), Hotel.id.asc()]
    if sort == HotelSortOption.STAR_ASC:
        return [nullslast(Hotel.star_rating.asc()), Hotel.id.asc()]
    return [Hotel.avg_rating.desc(), Hotel.id.asc()]


# Ap dung cac bo loc vi tri co ban (trang thai duyet, thanh pho, con phong
# trong theo ngay/so khach) - dung chung cho ca search va facets.
def _apply_base_filters(
    db: Session,
    query,
    *,
    city: str | None,
    check_in: date | None,
    check_out: date | None,
    num_guests: int | None,
):
    query = query.filter(Hotel.status == HotelStatus.APPROVED)

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

    return query


# Ap dung cac bo loc nang cao tu sidebar (ngan sach, hang sao, diem danh gia,
# quan, tien nghi, dich vu, dang co khuyen mai).
def _apply_advanced_filters(
    db: Session,
    query,
    *,
    num_guests: int | None,
    min_price: float | None,
    max_price: float | None,
    star_ratings: list[int] | None,
    min_rating: float | None,
    districts: list[str] | None,
    amenities: list[str] | None,
    room_amenities: list[str] | None,
    services: list[str] | None,
    has_promotion: bool,
):
    # Ngan sach: loc tren gia phong tham khao/dem (theo so khach neu co).
    if min_price is not None or max_price is not None:
        ref_price = _reference_price_expr(db, num_guests)
        if min_price is not None:
            query = query.filter(ref_price >= min_price)
        if max_price is not None:
            query = query.filter(ref_price <= max_price)

    # Hang sao: OR (thuoc 1 trong cac hang da chon).
    if star_ratings:
        query = query.filter(Hotel.star_rating.in_(star_ratings))

    # Diem danh gia: nguong toi thieu (thang 5 sao).
    if min_rating is not None:
        query = query.filter(Hotel.avg_rating >= min_rating)

    # Quan/khu vuc: OR.
    if districts:
        query = query.filter(Hotel.district.in_(districts))

    # Tien nghi: AND (khach san phai co tat ca tien nghi chung da chon).
    if amenities:
        wanted = set(amenities)
        hotel_ids = (
            db.query(HotelAmenity.hotel_id)
            .join(Amenity, Amenity.id == HotelAmenity.amenity_id)
            .filter(Amenity.name.in_(wanted))
            .group_by(HotelAmenity.hotel_id)
            .having(func.count(func.distinct(Amenity.name)) == len(wanted))
        )
        query = query.filter(Hotel.id.in_(hotel_ids.scalar_subquery()))

    # Tien nghi phong: AND trong CUNG 1 loai phong (khach san phai co it nhat 1
    # loai phong dang hoat dong hoi du tat ca tien nghi phong da chon).
    if room_amenities:
        wanted_room = set(room_amenities)
        matching_room_type_ids = (
            db.query(RoomTypeAmenity.room_type_id)
            .join(Amenity, Amenity.id == RoomTypeAmenity.amenity_id)
            .filter(Amenity.name.in_(wanted_room))
            .group_by(RoomTypeAmenity.room_type_id)
            .having(func.count(func.distinct(Amenity.name)) == len(wanted_room))
        )
        hotel_ids_with_room_amenities = (
            db.query(RoomType.hotel_id)
            .filter(
                RoomType.id.in_(matching_room_type_ids.scalar_subquery()),
                RoomType.is_active.is_(True),
            )
            .distinct()
        )
        query = query.filter(Hotel.id.in_(hotel_ids_with_room_amenities.scalar_subquery()))

    # Dich vu: AND (chi tinh dich vu dang bat).
    if services:
        wanted_services = set(services)
        service_ids = (
            db.query(HotelService.hotel_id)
            .filter(HotelService.name.in_(wanted_services), HotelService.is_active.is_(True))
            .group_by(HotelService.hotel_id)
            .having(func.count(func.distinct(HotelService.name)) == len(wanted_services))
        )
        query = query.filter(Hotel.id.in_(service_ids.scalar_subquery()))

    # Dang co khuyen mai hop le (con hieu luc, chua het luot).
    if has_promotion:
        today = date.today()
        valid_promo = (
            db.query(Promotion.hotel_id)
            .filter(
                Promotion.is_active.is_(True),
                Promotion.start_date <= today,
                Promotion.end_date >= today,
            )
            .filter((Promotion.usage_limit.is_(None)) | (Promotion.used_count < Promotion.usage_limit))
        )
        query = query.filter(Hotel.id.in_(valid_promo.scalar_subquery()))

    return query


def search_hotel_records(
    db: Session,
    *,
    city: str | None,
    check_in: date | None,
    check_out: date | None,
    num_guests: int | None,
    sort: HotelSortOption = HotelSortOption.RECOMMENDED,
    min_price: float | None = None,
    max_price: float | None = None,
    star_ratings: list[int] | None = None,
    min_rating: float | None = None,
    districts: list[str] | None = None,
    amenities: list[str] | None = None,
    room_amenities: list[str] | None = None,
    services: list[str] | None = None,
    has_promotion: bool = False,
    page: int,
    page_size: int,
) -> tuple[list[Hotel], int]:
    query = _apply_base_filters(
        db,
        db.query(Hotel),
        city=city,
        check_in=check_in,
        check_out=check_out,
        num_guests=num_guests,
    )
    query = _apply_advanced_filters(
        db,
        query,
        num_guests=num_guests,
        min_price=min_price,
        max_price=max_price,
        star_ratings=star_ratings,
        min_rating=min_rating,
        districts=districts,
        amenities=amenities,
        room_amenities=room_amenities,
        services=services,
        has_promotion=has_promotion,
    )

    total = query.count()
    hotels = (
        query.order_by(*_build_hotel_sort(sort, db, num_guests))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return hotels, total


# Lay danh sach option cho sidebar loc (quan, tien nghi, dich vu, khoang gia)
# theo bo loc vi tri co ban - khong tinh cac facet dang tick de danh sach on dinh.
def get_search_facets(
    db: Session,
    *,
    city: str | None,
    check_in: date | None,
    check_out: date | None,
    num_guests: int | None,
) -> dict:
    base_ids = _apply_base_filters(
        db,
        db.query(Hotel.id),
        city=city,
        check_in=check_in,
        check_out=check_out,
        num_guests=num_guests,
    ).scalar_subquery()

    districts = [
        d
        for (d,) in db.query(Hotel.district)
        .filter(Hotel.id.in_(base_ids), Hotel.district.isnot(None))
        .distinct()
        .order_by(Hotel.district.asc())
        .all()
    ]
    amenities = [
        {"name": name, "count": count}
        for name, count in db.query(Amenity.name, func.count(func.distinct(HotelAmenity.hotel_id)))
        .join(HotelAmenity, HotelAmenity.amenity_id == Amenity.id)
        .filter(HotelAmenity.hotel_id.in_(base_ids))
        .group_by(Amenity.name)
        .order_by(Amenity.name.asc())
        .all()
    ]
    room_amenities = [
        {"name": name, "count": count}
        for name, count in db.query(Amenity.name, func.count(func.distinct(RoomType.hotel_id)))
        .join(RoomTypeAmenity, RoomTypeAmenity.amenity_id == Amenity.id)
        .join(RoomType, RoomType.id == RoomTypeAmenity.room_type_id)
        .filter(RoomType.hotel_id.in_(base_ids), RoomType.is_active.is_(True))
        .group_by(Amenity.name)
        .order_by(Amenity.name.asc())
        .all()
    ]
    services = [
        s
        for (s,) in db.query(HotelService.name)
        .filter(HotelService.hotel_id.in_(base_ids), HotelService.is_active.is_(True))
        .distinct()
        .order_by(HotelService.name.asc())
        .all()
    ]
    price_min, price_max = (
        db.query(func.min(RoomType.base_price), func.max(RoomType.base_price))
        .filter(RoomType.hotel_id.in_(base_ids), RoomType.is_active.is_(True))
        .one()
    )

    return {
        "price_min": float(price_min) if price_min is not None else None,
        "price_max": float(price_max) if price_max is not None else None,
        "districts": districts,
        "amenities": amenities,
        "room_amenities": room_amenities,
        "services": services,
    }


# Lay danh sach khach san cho super admin duyet, loc theo trang thai (khong loc neu None).
def list_hotel_records_for_admin(
    db: Session,
    *,
    status_filter: HotelStatus | None,
    search: str | None = None,
    city: str | None = None,
    sort: str = "newest",
    page: int,
    page_size: int,
) -> tuple[list[Hotel], int]:
    query = db.query(Hotel)
    if status_filter:
        query = query.filter(Hotel.status == status_filter)
    # Tim CHI theo ten khach san. Truoc day tim ca theo thanh pho nen tu khoa
    # vua la ten vua la dia danh se tra ve ket qua tron lan; loc khu vuc gio
    # tach han sang tham so city.
    if search:
        query = query.filter(Hotel.name.ilike(f"%{search.strip()}%"))
    if city:
        query = query.filter(Hotel.city == city)

    total = query.count()

    if sort == "lowest_rated":
        # Khach san chua ai danh gia co avg_rating = 0; neu de nguyen chung se
        # chiem het dau bang va day khach san THUC SU bi cham diem thap xuong
        # duoi. Dua nhom chua co danh gia xuong cuoi truoc khi sap theo diem.
        query = query.order_by(Hotel.total_reviews == 0, Hotel.avg_rating.asc(), Hotel.id.asc())
    elif sort == "highest_rated":
        query = query.order_by(Hotel.avg_rating.desc(), Hotel.total_reviews.desc(), Hotel.id.asc())
    elif sort == "name":
        query = query.order_by(Hotel.name.asc(), Hotel.id.asc())
    else:
        query = query.order_by(Hotel.created_at.desc(), Hotel.id.desc())

    hotels = query.offset((page - 1) * page_size).limit(page_size).all()
    return hotels, total


# Cac thanh pho THUC SU dang co khach san, kem so luong. Dung de dung bo loc khu
# vuc - lay tu du lieu that thay vi liet ke ca 63 tinh, tranh bay ra hang chuc
# lua chon luon cho 0 ket qua.
def count_hotels_by_city(db: Session) -> list[tuple[str, int]]:
    return (
        db.query(Hotel.city, func.count(Hotel.id))
        .group_by(Hotel.city)
        .order_by(func.count(Hotel.id).desc(), Hotel.city.asc())
        .all()
    )


# Dem so khach san theo tung trang thai - dung cho hang the trang thai o dau
# trang, vua la tong quan vua la bo loc.
def count_hotels_by_status(db: Session) -> dict[str, int]:
    rows = db.query(Hotel.status, func.count(Hotel.id)).group_by(Hotel.status).all()
    return {status.value: count for status, count in rows}


# Dem so loai phong va tong so phong (theo cong suat khai bao) cua NHIEU khach
# san trong 1 truy van - de danh sach khach san khong ban truy van theo tung dong.
def count_room_types_and_rooms_by_hotel_ids(db: Session, hotel_ids: list[int]) -> dict[int, tuple[int, int]]:
    if not hotel_ids:
        return {}
    rows = (
        db.query(
            RoomType.hotel_id,
            func.count(RoomType.id),
            func.coalesce(func.sum(RoomType.total_rooms), 0),
        )
        .filter(RoomType.hotel_id.in_(hotel_ids))
        .group_by(RoomType.hotel_id)
        .all()
    )
    return {hotel_id: (int(type_count), int(room_count)) for hotel_id, type_count, room_count in rows}


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


# Lay "phong tham khao" re nhat cua tung khach san trong danh sach id, uu tien
# loai phong chua toi thieu so khach da tim (max_guests >= num_guests) - neu
# khach san khong co loai phong nao du sao, roi lai ve loai phong re nhat noi
# chung (van hien duoc gia, chi khong dung suc chua yeu cau). Dung cho ket qua
# tim kiem cong khai o /hotels.
def get_reference_room_type_by_hotel_ids(
    db: Session, hotel_ids: list[int], num_guests: int | None
) -> dict[int, RoomType]:
    if not hotel_ids:
        return {}

    def cheapest_per_hotel(min_guests: int | None) -> dict[int, RoomType]:
        query = db.query(RoomType).filter(RoomType.hotel_id.in_(hotel_ids), RoomType.is_active.is_(True))
        if min_guests:
            query = query.filter(RoomType.max_guests >= min_guests)
        rows = query.order_by(RoomType.hotel_id.asc(), RoomType.base_price.asc()).all()
        picked: dict[int, RoomType] = {}
        for room_type in rows:
            picked.setdefault(room_type.hotel_id, room_type)
        return picked

    result = cheapest_per_hotel(num_guests)
    if num_guests:
        for hotel_id, room_type in cheapest_per_hotel(None).items():
            result.setdefault(hotel_id, room_type)
    return result


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


# ===== Doi soat cong no voi khach san =====


# Tong tien don da THU DUOC va tong hoa hong nen tang huong, gom theo khach san.
#
# Chi tinh don co thanh toan completed: don huy da hoan tien co payment_status
# refunded nen tu roi ra khoi phep tinh, khong can dieu kien rieng.
#
# Dung total_amount cua DON chu khong dung so tien khach chuyen: khach chuyen
# thua thi phan thua la khoan phai hoan lai cho khach, khong phai tien cua
# khach san.
def get_booking_totals_by_hotel(db: Session, hotel_ids: list[int] | None = None) -> dict[int, tuple[float, float]]:
    query = (
        db.query(
            Booking.hotel_id,
            func.coalesce(func.sum(Booking.total_amount), 0),
            func.coalesce(func.sum(Booking.commission_amount), 0),
        )
        .join(Payment, Payment.booking_id == Booking.id)
        .filter(Payment.payment_status == PaymentStatus.COMPLETED)
        .group_by(Booking.hotel_id)
    )
    if hotel_ids is not None:
        query = query.filter(Booking.hotel_id.in_(hotel_ids))
    return {hotel_id: (float(da_thu), float(hoa_hong)) for hotel_id, da_thu, hoa_hong in query.all()}


# Tong so tien da chi tra cho tung khach san.
def get_payout_totals_by_hotel(db: Session, hotel_ids: list[int] | None = None) -> dict[int, float]:
    query = db.query(HotelPayout.hotel_id, func.coalesce(func.sum(HotelPayout.amount), 0)).group_by(
        HotelPayout.hotel_id
    )
    if hotel_ids is not None:
        query = query.filter(HotelPayout.hotel_id.in_(hotel_ids))
    return {hotel_id: float(tong) for hotel_id, tong in query.all()}


# Danh sach cac dot da chi tra cho 1 khach san, moi nhat truoc.
def list_payouts_by_hotel(db: Session, hotel_id: int) -> list[HotelPayout]:
    return (
        db.query(HotelPayout)
        .filter(HotelPayout.hotel_id == hotel_id)
        .order_by(HotelPayout.created_at.desc())
        .all()
    )


# Ghi nhan 1 dot chi tra cho khach san.
def create_payout_record(
    db: Session,
    *,
    hotel_id: int,
    amount: float,
    period_from: date | None,
    period_to: date | None,
    reference: str | None,
    note: str | None,
    created_by: int,
) -> HotelPayout:
    payout = HotelPayout(
        hotel_id=hotel_id,
        amount=amount,
        period_from=period_from,
        period_to=period_to,
        reference=reference,
        note=note,
        created_by=created_by,
    )
    db.add(payout)
    db.commit()
    db.refresh(payout)
    return payout


# Danh sach khach san can doi soat cong no: chi khach san da tung van hanh
# (approved/suspended) moi co don va co tien de doi soat.
def list_hotels_for_settlement(db: Session) -> list[Hotel]:
    return (
        db.query(Hotel)
        .filter(Hotel.status.in_((HotelStatus.APPROVED, HotelStatus.SUSPENDED)))
        .order_by(Hotel.name.asc())
        .all()
    )
