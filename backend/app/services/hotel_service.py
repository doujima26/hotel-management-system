from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.enums import DiscountType, HotelSortOption, HotelStatus, UserRole
from app.models.entities import Hotel, HotelImage, HotelService, Promotion, User
from app.repositories.booking_repository import count_bookings_by_promotion_id
from app.repositories.hotel_repository import (
    count_booking_services_by_service,
    create_hotel_image_record,
    create_hotel_record,
    create_hotel_service_record,
    create_promotion_record,
    delete_hotel_image_record,
    delete_hotel_service_record,
    delete_promotion_record,
    get_hotel_by_id,
    get_hotel_by_owner,
    get_hotel_image_by_id,
    get_hotel_service_by_id,
    get_hotel_service_by_name,
    get_hotels_by_ids,
    get_min_active_room_price_by_hotel_ids,
    get_primary_image_url_by_hotel_ids,
    get_promotion_by_id,
    get_reference_room_type_by_hotel_ids,
    get_search_facets,
    list_hotel_image_records,
    list_hotel_service_records,
    list_promotion_records,
    list_top_rated_hotel_records,
    list_valid_promotion_records,
    list_valid_promotions_for_approved_hotels,
    save_hotel,
    save_hotel_service,
    save_promotion,
    search_hotel_records,
    set_hotel_image_primary,
)
from app.repositories.room_repository import list_room_type_amenity_records
from app.repositories.staff_repository import get_staff_member_by_user_id
from app.schemas.hotels import (
    CreateHotelImageRequest,
    CreateHotelRequest,
    CreateHotelServiceRequest,
    CreatePromotionRequest,
    DeleteHotelImageResponse,
    DeleteHotelServiceResponse,
    DeletePromotionResponse,
    HotelDetailResponse,
    HotelHighlightResponse,
    HotelImageResponse,
    HotelResponse,
    HotelSearchFiltersResponse,
    HotelSearchItemResponse,
    HotelSearchResponse,
    HotelServiceResponse,
    PromotionResponse,
    UpdateHotelRequest,
    UpdateHotelServiceRequest,
    UpdatePromotionRequest,
)


# Chuyen khach san thanh du lieu tra ve.
def serialize_hotel(hotel: Hotel) -> dict:
    return HotelResponse.model_validate(hotel).model_dump(mode="json")


# Chuyen dich vu khach san thanh du lieu tra ve.
def serialize_hotel_service(service: HotelService) -> dict:
    return HotelServiceResponse.model_validate(service).model_dump(mode="json")


# Chuyen anh khach san thanh du lieu tra ve.
def serialize_hotel_image(image: HotelImage) -> dict:
    return HotelImageResponse.model_validate(image).model_dump(mode="json")


# Chuyen khach san va anh thanh du lieu chi tiet cong khai.
def serialize_hotel_detail(hotel: Hotel, images: list[HotelImage]) -> dict:
    return HotelDetailResponse(
        id=hotel.id,
        name=hotel.name,
        description=hotel.description,
        address=hotel.address,
        city=hotel.city,
        district=hotel.district,
        phone=hotel.phone,
        email=hotel.email,
        star_rating=hotel.star_rating,
        avg_rating=float(hotel.avg_rating),
        total_reviews=hotel.total_reviews,
        images=[HotelImageResponse.model_validate(image) for image in images],
    ).model_dump(mode="json")


# Chuyen khuyen mai thanh du lieu tra ve.
def serialize_promotion(promotion: Promotion) -> dict:
    return PromotionResponse.model_validate(promotion).model_dump(mode="json")


# Lay khach san da duoc duyet cua admin hien tai.
def get_approved_admin_hotel(db: Session, current_user: User) -> Hotel:
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


# Lay khach san dang van hanh cua nguoi dung hien tai, dung chung cho ca Admin
# (chu khach san) va Staff (nhan vien gan voi khach san) - dung cho cac tinh
# nang van hanh nhu xem trang thai phong, check-in/check-out.
def get_operational_hotel(db: Session, current_user: User) -> Hotel:
    if current_user.role == UserRole.STAFF:
        staff = get_staff_member_by_user_id(db, current_user.id)
        if not staff:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tai khoan chua duoc gan lam nhan vien cua khach san nao",
            )
        hotel = get_hotel_by_id(db, staff.hotel_id)
        if not hotel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khach san khong ton tai",
            )
        return hotel

    return get_approved_admin_hotel(db, current_user)


# Kiem tra khuyen mai co du lieu hop le.
def validate_promotion_data(discount_type: str, discount_value: float, start_date, end_date):
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngay ket thuc phai lon hon hoac bang ngay bat dau",
        )
    if discount_type == "percentage" and discount_value > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gia tri giam theo phan tram khong duoc vuot qua 100",
        )


# Xu ly admin dang ky khach san moi.
def create_hotel(db: Session, current_user: User, payload: CreateHotelRequest) -> dict:
    existing_hotel = get_hotel_by_owner(db, current_user.id)
    if existing_hotel:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Admin nay da dang ky khach san",
        )

    hotel = create_hotel_record(db, current_user.id, payload)
    return serialize_hotel(hotel)


# Xu ly lay lai thong tin khach san cua admin hien tai (ke ca khi dang cho duyet).
def get_my_hotel(db: Session, current_user: User) -> dict:
    hotel = get_hotel_by_owner(db, current_user.id)
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin chua dang ky khach san",
        )
    return serialize_hotel(hotel)


# Xu ly cap nhat thong tin khach san cua admin.
def update_hotel(db: Session, current_user: User, payload: UpdateHotelRequest) -> dict:
    hotel = get_hotel_by_owner(db, current_user.id)
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin chua dang ky khach san",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(hotel, field, value)

    hotel = save_hotel(db, hotel)
    return serialize_hotel(hotel)


# Xu ly lay chi tiet khach san cong khai cho khach hang.
def get_hotel_detail(db: Session, hotel_id: int) -> dict:
    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel or hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khach san khong ton tai hoac chua duoc duyet",
        )

    images = list_hotel_image_records(db, hotel.id)
    return serialize_hotel_detail(hotel, images)


# Xu ly tao dich vu khach san.
def create_hotel_service(db: Session, current_user: User, payload: CreateHotelServiceRequest) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    existing_service = get_hotel_service_by_name(db, hotel.id, payload.name)
    if existing_service:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Dich vu da ton tai trong khach san",
        )

    service = create_hotel_service_record(db, hotel.id, payload)
    return serialize_hotel_service(service)


# Xu ly lay danh sach dich vu khach san.
def list_hotel_services(db: Session, current_user: User) -> list[dict]:
    hotel = get_approved_admin_hotel(db, current_user)
    services = list_hotel_service_records(db, hotel.id)
    return [serialize_hotel_service(item) for item in services]


# Xu ly cap nhat dich vu khach san.
def update_hotel_service(
    db: Session,
    current_user: User,
    service_id: int,
    payload: UpdateHotelServiceRequest,
) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    service = get_hotel_service_by_id(db, service_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dich vu khong ton tai",
        )
    if service.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly dich vu cua khach san minh",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)

    service = save_hotel_service(db, service)
    return serialize_hotel_service(service)


# Xu ly xoa cung dich vu khach san - chi cho phep khi dich vu nay chua tung
# duoc khach dat (booking_services), FK RESTRICT se chan neu da tung dung.
def delete_hotel_service(db: Session, current_user: User, service_id: int) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    service = get_hotel_service_by_id(db, service_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dich vu khong ton tai",
        )
    if service.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly dich vu cua khach san minh",
        )

    usage_count = count_booking_services_by_service(db, service_id)
    if usage_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dich vu nay da tung duoc khach dat, khong the xoa - hay tat (is_active=false) thay vi xoa",
        )

    delete_hotel_service_record(db, service)
    return DeleteHotelServiceResponse(id=service_id).model_dump(mode="json")


# Xu ly tao khuyen mai.
def create_promotion(db: Session, current_user: User, payload: CreatePromotionRequest) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    validate_promotion_data(payload.discount_type, payload.discount_value, payload.start_date, payload.end_date)
    promotion = create_promotion_record(db, hotel.id, payload)
    return serialize_promotion(promotion)


# Xu ly lay danh sach khuyen mai.
def list_promotions(db: Session, current_user: User) -> list[dict]:
    hotel = get_approved_admin_hotel(db, current_user)
    promotions = list_promotion_records(db, hotel.id)
    return [serialize_promotion(item) for item in promotions]


# Xu ly cong khai lay danh sach khuyen mai dang hop le cua 1 khach san, de
# khach xem truoc khi dat phong.
def list_valid_promotions_for_hotel(db: Session, hotel_id: int) -> list[dict]:
    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel or hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khach san khong ton tai hoac chua duoc duyet",
        )
    promotions = list_valid_promotion_records(db, hotel.id, date.today())
    return [serialize_promotion(item) for item in promotions]


# Tinh so tien va % giam gia thuc te cua 1 khuyen mai tren 1 muc gia tham
# chieu (gia phong re nhat con hoat dong cua khach san) - cung cong thuc voi
# _apply_promotion o booking_service.py (percentage/fixed_amount, chan boi
# max_discount_amount va khong vuot qua gia tham chieu) nhung khong co
# side-effect, dung de xep hang hien thi o trang chu. Tra ve None neu chua
# dat min_booking_amount.
def _calc_effective_discount(promotion: Promotion, reference_price: float) -> tuple[float, float] | None:
    if reference_price <= 0:
        return None
    if promotion.min_booking_amount is not None and reference_price < float(promotion.min_booking_amount):
        return None

    if promotion.discount_type == DiscountType.PERCENTAGE:
        discount_amount = reference_price * float(promotion.discount_value) / 100
    else:
        discount_amount = float(promotion.discount_value)

    if promotion.max_discount_amount is not None:
        discount_amount = min(discount_amount, float(promotion.max_discount_amount))
    discount_amount = min(discount_amount, reference_price)

    return discount_amount, discount_amount / reference_price * 100


# Xu ly cong khai lay danh sach khach san dang co uu dai giam gia sau nhat cho
# trang chu - xep theo % giam gia hieu qua (tinh tren gia phong re nhat con
# hoat dong cua khach san) giam dan.
def list_trending_deals(db: Session, limit: int = 15) -> list[dict]:
    promotions = list_valid_promotions_for_approved_hotels(db, date.today())
    if not promotions:
        return []

    hotel_ids = list({promotion.hotel_id for promotion in promotions})
    min_prices = get_min_active_room_price_by_hotel_ids(db, hotel_ids)
    image_urls = get_primary_image_url_by_hotel_ids(db, hotel_ids)
    hotels_by_id = get_hotels_by_ids(db, hotel_ids)

    best_deal_by_hotel: dict[int, tuple[float, float]] = {}
    for promotion in promotions:
        reference_price = min_prices.get(promotion.hotel_id)
        if reference_price is None:
            continue
        result = _calc_effective_discount(promotion, reference_price)
        if result is None:
            continue
        discount_amount, discount_percent = result
        if discount_percent <= 0:
            continue
        current_best = best_deal_by_hotel.get(promotion.hotel_id)
        if current_best is None or discount_percent > current_best[1]:
            best_deal_by_hotel[promotion.hotel_id] = (discount_amount, discount_percent)

    ranked = sorted(best_deal_by_hotel.items(), key=lambda item: item[1][1], reverse=True)[:limit]

    items = []
    for hotel_id, (discount_amount, discount_percent) in ranked:
        hotel = hotels_by_id[hotel_id]
        reference_price = min_prices[hotel_id]
        items.append(
            HotelHighlightResponse(
                id=hotel.id,
                name=hotel.name,
                city=hotel.city,
                star_rating=hotel.star_rating,
                avg_rating=float(hotel.avg_rating),
                total_reviews=hotel.total_reviews,
                primary_image_url=image_urls.get(hotel_id),
                from_price=reference_price,
                discounted_price=reference_price - discount_amount,
                discount_percent=round(discount_percent, 1),
            )
        )
    return [item.model_dump(mode="json") for item in items]


# Xu ly cong khai lay danh sach khach san duoc yeu thich nhat cho trang chu -
# xep theo diem danh gia trung binh va so luot danh gia giam dan.
def list_top_rated_hotels(db: Session, limit: int = 15) -> list[dict]:
    hotels = list_top_rated_hotel_records(db, limit)
    if not hotels:
        return []

    hotel_ids = [hotel.id for hotel in hotels]
    min_prices = get_min_active_room_price_by_hotel_ids(db, hotel_ids)
    image_urls = get_primary_image_url_by_hotel_ids(db, hotel_ids)

    items = [
        HotelHighlightResponse(
            id=hotel.id,
            name=hotel.name,
            city=hotel.city,
            star_rating=hotel.star_rating,
            avg_rating=float(hotel.avg_rating),
            total_reviews=hotel.total_reviews,
            primary_image_url=image_urls.get(hotel.id),
            from_price=min_prices.get(hotel.id),
        )
        for hotel in hotels
    ]
    return [item.model_dump(mode="json") for item in items]


# Xu ly cap nhat khuyen mai.
def update_promotion(
    db: Session,
    current_user: User,
    promotion_id: int,
    payload: UpdatePromotionRequest,
) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    promotion = get_promotion_by_id(db, promotion_id)
    if not promotion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khuyen mai khong ton tai",
        )
    if promotion.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly khuyen mai cua khach san minh",
        )

    update_data = payload.model_dump(exclude_unset=True)
    if "discount_type" in update_data:
        update_data["discount_type"] = DiscountType(update_data["discount_type"])
    for field, value in update_data.items():
        setattr(promotion, field, value)

    validate_promotion_data(
        promotion.discount_type,
        float(promotion.discount_value),
        promotion.start_date,
        promotion.end_date,
    )

    promotion = save_promotion(db, promotion)
    return serialize_promotion(promotion)


# Xu ly xoa cung khuyen mai - chi cho phep khi chua co booking nao dung khuyen
# mai nay (ke ca booking da huy, vi FK khong CASCADE nen con row la bi chan).
def delete_promotion(db: Session, current_user: User, promotion_id: int) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    promotion = get_promotion_by_id(db, promotion_id)
    if not promotion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khuyen mai khong ton tai",
        )
    if promotion.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly khuyen mai cua khach san minh",
        )

    usage_count = count_bookings_by_promotion_id(db, promotion_id)
    if usage_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khuyen mai nay da tung duoc dung trong booking, khong the xoa - hay tat thay vi xoa",
        )

    delete_promotion_record(db, promotion)
    return DeletePromotionResponse(id=promotion_id).model_dump(mode="json")


# Xu ly tim kiem khach san cong khai theo thanh pho va tinh trang phong trong.
def search_hotels(
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
    services: list[str] | None = None,
    has_promotion: bool = False,
    page: int,
    page_size: int,
) -> dict:
    if bool(check_in) != bool(check_out):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phai cung cap ca check_in va check_out",
        )
    if check_in and check_out and check_out <= check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngay tra phong phai sau ngay nhan phong",
        )
    if check_in and check_in < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngay nhan phong khong duoc o qua khu",
        )

    hotels, total = search_hotel_records(
        db,
        city=city,
        check_in=check_in,
        check_out=check_out,
        num_guests=num_guests,
        sort=sort,
        min_price=min_price,
        max_price=max_price,
        star_ratings=star_ratings,
        min_rating=min_rating,
        districts=districts,
        amenities=amenities,
        services=services,
        has_promotion=has_promotion,
        page=page,
        page_size=page_size,
    )
    hotel_ids = [hotel.id for hotel in hotels]
    image_urls = get_primary_image_url_by_hotel_ids(db, hotel_ids)
    reference_room_types = get_reference_room_type_by_hotel_ids(db, hotel_ids, num_guests)
    num_nights = (check_out - check_in).days if check_in and check_out else None

    items = []
    for hotel in hotels:
        room_type = reference_room_types.get(hotel.id)
        price_per_night = float(room_type.base_price) if room_type else None
        room_amenities: list[str] = []
        if room_type is not None:
            room_amenities = [a.name for a in list_room_type_amenity_records(db, room_type.id)[:3]]
        service_names = [s.name for s in list_hotel_service_records(db, hotel.id) if s.is_active][:2]

        total_price = None
        discounted_total_price = None
        discount_percent = None
        promotion_name = None
        if price_per_night is not None:
            total_price = price_per_night * (num_nights or 1)
            best: tuple[float, float, str] | None = None
            for promotion in list_valid_promotion_records(db, hotel.id, date.today()):
                result = _calc_effective_discount(promotion, total_price)
                if result is None or result[1] <= 0:
                    continue
                if best is None or result[1] > best[1]:
                    best = (result[0], result[1], promotion.name)
            if best is not None:
                discounted_total_price = total_price - best[0]
                discount_percent = round(best[1], 1)
                promotion_name = best[2]

        items.append(
            HotelSearchItemResponse(
                id=hotel.id,
                name=hotel.name,
                city=hotel.city,
                district=hotel.district,
                address=hotel.address,
                star_rating=hotel.star_rating,
                avg_rating=float(hotel.avg_rating),
                total_reviews=hotel.total_reviews,
                primary_image_url=image_urls.get(hotel.id),
                room_type_name=room_type.name if room_type else None,
                bed_type=room_type.bed_type if room_type else None,
                room_amenities=room_amenities,
                hotel_service_names=service_names,
                promotion_name=promotion_name,
                price_per_night=price_per_night,
                num_nights=num_nights,
                total_price=total_price,
                discounted_total_price=discounted_total_price,
                discount_percent=discount_percent,
            )
        )
    total_pages = (total + page_size - 1) // page_size if total else 0
    return HotelSearchResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    ).model_dump(mode="json")


# Xu ly lay danh sach option cho sidebar loc theo bo loc vi tri co ban.
def get_search_filters(
    db: Session,
    *,
    city: str | None,
    check_in: date | None,
    check_out: date | None,
    num_guests: int | None,
) -> dict:
    if bool(check_in) != bool(check_out):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phai cung cap ca check_in va check_out",
        )
    facets = get_search_facets(
        db,
        city=city,
        check_in=check_in,
        check_out=check_out,
        num_guests=num_guests,
    )
    return HotelSearchFiltersResponse(**facets).model_dump(mode="json")


# Xu ly them anh cho khach san cua admin.
def create_hotel_image(db: Session, current_user: User, payload: CreateHotelImageRequest) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    image = create_hotel_image_record(db, hotel.id, payload)
    return serialize_hotel_image(image)


# Xu ly lay danh sach anh cua khach san admin.
def list_hotel_images(db: Session, current_user: User) -> list[dict]:
    hotel = get_approved_admin_hotel(db, current_user)
    images = list_hotel_image_records(db, hotel.id)
    return [serialize_hotel_image(item) for item in images]


# Kiem tra anh thuoc khach san cua admin hien tai.
def _get_owned_hotel_image(db: Session, current_user: User, image_id: int) -> HotelImage:
    hotel = get_approved_admin_hotel(db, current_user)
    image = get_hotel_image_by_id(db, image_id)
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anh khong ton tai",
        )
    if image.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly anh cua khach san minh",
        )
    return image


# Xu ly xoa anh khach san.
def delete_hotel_image(db: Session, current_user: User, image_id: int) -> dict:
    image = _get_owned_hotel_image(db, current_user, image_id)
    delete_hotel_image_record(db, image)
    return DeleteHotelImageResponse(id=image_id).model_dump(mode="json")


# Xu ly dat anh dai dien cho khach san.
def set_primary_hotel_image(db: Session, current_user: User, image_id: int) -> dict:
    image = _get_owned_hotel_image(db, current_user, image_id)
    image = set_hotel_image_primary(db, image.hotel_id, image)
    return serialize_hotel_image(image)
