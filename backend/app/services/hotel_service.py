from dataclasses import dataclass
from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.enums import AmenityScope, DiscountType, HotelSortOption, HotelStatus, UserRole
from app.models.entities import Amenity, Hotel, HotelImage, HotelService, Promotion, User
from app.repositories.booking_repository import count_bookings_by_promotion_id, list_booked_hotels_by_user
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
    get_booking_totals_by_hotel,
    get_hotels_by_ids,
    get_payout_totals_by_hotel,
    get_min_active_room_price_by_hotel_ids,
    get_primary_image_url_by_hotel_ids,
    get_promotion_by_id,
    get_reference_room_type_by_hotel_ids,
    get_search_facets,
    create_payout_record,
    list_hotel_image_records,
    list_hotels_for_settlement,
    list_payouts_by_hotel,
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
from app.repositories.pricing_repository import (
    list_active_discount_rules_for_approved_hotels,
    list_active_pricing_rules_by_hotel_ids,
)
from app.repositories.room_repository import (
    create_hotel_amenity_link,
    get_base_prices_by_room_type_ids,
    delete_hotel_amenity_link,
    get_amenity_by_id,
    get_hotel_amenity_link,
    list_hotel_amenity_records,
    list_room_type_amenity_records,
)
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
    HotelAmenityItem,
    HotelResponse,
    HotelSearchFiltersResponse,
    HotelSearchItemResponse,
    HotelSearchResponse,
    HotelServiceResponse,
    HotelSettlementResponse,
    PayoutResponse,
    PromotionResponse,
    CreatePayoutRequest,
    UpdateCommissionRateRequest,
    UpdateHotelRequest,
    UpdateHotelServiceRequest,
    UpdatePromotionRequest,
)
from app.schemas.rooms import AmenityResponse, HotelAmenityLinkResponse
from app.services.pricing_service import apply_adjustment, first_matching_date, resolve_stay_total


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
def serialize_hotel_detail(
    hotel: Hotel,
    images: list[HotelImage],
    amenities: list[Amenity],
    services: list[HotelService],
) -> dict:
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
        check_in_time=hotel.check_in_time,
        check_out_time=hotel.check_out_time,
        cancellation_policy=hotel.cancellation_policy,
        children_policy=hotel.children_policy,
        pets_allowed=hotel.pets_allowed,
        payment_methods=hotel.payment_methods,
        amenities=[HotelAmenityItem(name=a.name, category=a.category.name if a.category else None) for a in amenities],
        services=[s.name for s in services],
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
            detail="Admin chưa đăng ký khách sạn",
        )
    if hotel.status == HotelStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khách sạn đang bị tạm dừng, không thực hiện được thao tác này",
        )
    if hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khách sạn chưa được duyệt để vận hành",
        )
    return hotel


# Cac trang thai khach san con van hanh duoc. Khach san tam dung khong ban moi
# nhung van phai phuc vu cac don da dat.
_OPERATING_STATUSES = (HotelStatus.APPROVED, HotelStatus.SUSPENDED)


# Lay khach san cua admin hien tai cho cac chuc nang phuc vu don da dat.
def get_operating_admin_hotel(db: Session, current_user: User) -> Hotel:
    hotel = get_hotel_by_owner(db, current_user.id)
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin chưa đăng ký khách sạn",
        )
    if hotel.status not in _OPERATING_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khách sạn chưa được duyệt để vận hành",
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
                detail="Tài khoản chưa được gán làm nhân viên của khách sạn nào",
            )
        hotel = get_hotel_by_id(db, staff.hotel_id)
        if not hotel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khách sạn không tồn tại",
            )
        # Ap dung cung dieu kien trang thai nhu voi chu khach san.
        if hotel.status not in _OPERATING_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Khách sạn chưa được duyệt để vận hành",
            )
        return hotel

    return get_operating_admin_hotel(db, current_user)


# Kiem tra khuyen mai co du lieu hop le.
def validate_promotion_data(discount_type: str, discount_value: float, start_date, end_date):
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu",
        )
    if discount_type == "percentage" and discount_value > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Giá trị giảm theo phần trăm không được vượt quá 100",
        )


# Xu ly admin dang ky khach san moi.
def create_hotel(db: Session, current_user: User, payload: CreateHotelRequest) -> dict:
    existing_hotel = get_hotel_by_owner(db, current_user.id)
    if existing_hotel:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Admin này đã đăng ký khách sạn",
        )

    hotel = create_hotel_record(db, current_user.id, payload)
    return serialize_hotel(hotel)


# Xu ly lay lai thong tin khach san cua admin hien tai (ke ca khi dang cho duyet).
def get_my_hotel(db: Session, current_user: User) -> dict:
    hotel = get_hotel_by_owner(db, current_user.id)
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin chưa đăng ký khách sạn",
        )
    return serialize_hotel(hotel)


# Xu ly cap nhat thong tin khach san cua admin.
def update_hotel(db: Session, current_user: User, payload: UpdateHotelRequest) -> dict:
    hotel = get_hotel_by_owner(db, current_user.id)
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin chưa đăng ký khách sạn",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        # payment_methods gan qua association_proxy (thay the toan bo bang noi).
        if field == "payment_methods":
            hotel.payment_methods = list(value or [])
            continue
        setattr(hotel, field, value)

    hotel = save_hotel(db, hotel)
    return serialize_hotel(hotel)


# Xu ly lay chi tiet khach san cong khai cho khach hang.
def get_hotel_detail(db: Session, hotel_id: int) -> dict:
    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel or hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khách sạn không tồn tại hoặc chưa được duyệt",
        )

    images = list_hotel_image_records(db, hotel.id)
    amenities = list_hotel_amenity_records(db, hotel.id)
    services = [service for service in list_hotel_service_records(db, hotel.id) if service.is_active]
    return serialize_hotel_detail(hotel, images, amenities, services)


# Xu ly gan tien nghi chung (scope=hotel) vao khach san cua admin hien tai.
def assign_hotel_amenity(db: Session, current_user: User, amenity_id: int) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)

    amenity = get_amenity_by_id(db, amenity_id)
    if not amenity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tiện nghi không tồn tại")
    if amenity.scope != AmenityScope.HOTEL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ được gắn tiện nghi thuộc danh mục 'Tiện nghi' chung vào khách sạn",
        )

    if get_hotel_amenity_link(db, hotel.id, amenity_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tiện nghi đã được gắn vào khách sạn",
        )

    create_hotel_amenity_link(db, hotel.id, amenity_id)
    return HotelAmenityLinkResponse(hotel_id=hotel.id, amenity_id=amenity_id).model_dump(mode="json")


# Xu ly go 1 tien nghi chung khoi khach san cua admin hien tai (khong xoa amenity, chi xoa lien ket).
def unassign_hotel_amenity(db: Session, current_user: User, amenity_id: int) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)

    link = get_hotel_amenity_link(db, hotel.id, amenity_id)
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tiện nghi chưa được gắn vào khách sạn này",
        )

    delete_hotel_amenity_link(db, link)
    return HotelAmenityLinkResponse(hotel_id=hotel.id, amenity_id=amenity_id).model_dump(mode="json")


# Xu ly lay danh sach tien nghi chung da gan cho khach san cua admin hien tai.
def list_hotel_amenities(db: Session, current_user: User) -> list[dict]:
    hotel = get_operating_admin_hotel(db, current_user)
    amenities = list_hotel_amenity_records(db, hotel.id)
    return [AmenityResponse.from_amenity(item).model_dump(mode="json") for item in amenities]


# Xu ly tao dich vu khach san.
def create_hotel_service(db: Session, current_user: User, payload: CreateHotelServiceRequest) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    existing_service = get_hotel_service_by_name(db, hotel.id, payload.name)
    if existing_service:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Dịch vụ đã tồn tại trong khách sạn",
        )

    service = create_hotel_service_record(db, hotel.id, payload)
    return serialize_hotel_service(service)


# Xu ly lay danh sach dich vu khach san.
def list_hotel_services(db: Session, current_user: User) -> list[dict]:
    hotel = get_operating_admin_hotel(db, current_user)
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
            detail="Dịch vụ không tồn tại",
        )
    if service.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chỉ được quản lý dịch vụ của khách sạn mình",
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
            detail="Dịch vụ không tồn tại",
        )
    if service.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chỉ được quản lý dịch vụ của khách sạn mình",
        )

    usage_count = count_booking_services_by_service(db, service_id)
    if usage_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dịch vụ này đã từng được khách đặt, không thể xóa - hãy tắt (is_active=false) thay vì xóa",
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
    hotel = get_operating_admin_hotel(db, current_user)
    promotions = list_promotion_records(db, hotel.id)
    return [serialize_promotion(item) for item in promotions]


# Xu ly cong khai lay danh sach khuyen mai dang hop le cua 1 khach san, de
# khach xem truoc khi dat phong.
def list_valid_promotions_for_hotel(db: Session, hotel_id: int) -> list[dict]:
    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel or hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khách sạn không tồn tại hoặc chưa được duyệt",
        )
    promotions = list_valid_promotion_records(db, hotel.id, date.today())
    return [serialize_promotion(item) for item in promotions]


# Khach xem danh sach dich vu dang bat cua 1 khach san (cong khai) - dung o
# trang checkout de chon dich vu them.
def list_public_hotel_services(db: Session, hotel_id: int) -> list[dict]:
    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel or hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khách sạn không tồn tại hoặc chưa được duyệt",
        )
    services = [service for service in list_hotel_service_records(db, hotel_id) if service.is_active]
    return [serialize_hotel_service(service) for service in services]


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


# So ngay nhin truoc khi tim uu dai theo mua. Khach thuong len ke hoach truoc
# hang thang nen mua he hay ngay le sap toi moi la thu dang gioi thieu, chi lay
# uu dai dang ap dung se bo lo phan lon nhu cau.
_SEASONAL_DEAL_LOOKAHEAD_DAYS = 60


# Xu ly cong khai lay danh sach khach san dang hoac sap co giam gia theo mua va
# ngay le cho trang chu. Khac list_trending_deals o cho nguon giam gia la quy
# tac gia (giam thang vao gia phong) chu khong phai ma khuyen mai.
@dataclass(frozen=True)
class SeasonalDeal:
    label: str
    reference_price: float
    discounted_price: float
    discount_percent: float
    # De trong nghia la uu dai dang ap dung, co gia tri la ngay se bat dau.
    starts_on: date | None


# Tim uu dai theo mua TOT NHAT cua tung khach san tu danh sach quy tac giam gia.
# Dung chung cho trang chu va cac cho khac can hien uu dai cua 1 nhom khach san.
def pick_best_seasonal_deals(db: Session, rules: list, min_prices: dict[int, float]) -> dict[int, SeasonalDeal]:
    today = date.today()
    last_day = today + timedelta(days=_SEASONAL_DEAL_LOOKAHEAD_DAYS)
    # Quy tac chi ap 1 loai phong thi doi chieu voi gia goc cua chinh loai do,
    # khong lay gia re nhat khach san vi muc giam khong ap cho phong do.
    scoped_prices = get_base_prices_by_room_type_ids(
        db, [rule.room_type_id for rule in rules if rule.room_type_id is not None]
    )

    best_by_hotel: dict[int, SeasonalDeal] = {}
    for rule in rules:
        starts_on = first_matching_date(rule, today, last_day)
        if starts_on is None:
            continue

        reference_price = (
            scoped_prices.get(rule.room_type_id) if rule.room_type_id is not None else min_prices.get(rule.hotel_id)
        )
        if not reference_price:
            continue

        discounted_price = apply_adjustment(reference_price, rule.adjustment_type, float(rule.adjustment_value))
        if discounted_price <= 0 or discounted_price >= reference_price:
            continue

        deal = SeasonalDeal(
            label=rule.name,
            reference_price=reference_price,
            discounted_price=discounted_price,
            discount_percent=(reference_price - discounted_price) / reference_price * 100,
            starts_on=None if starts_on <= today else starts_on,
        )
        current_best = best_by_hotel.get(rule.hotel_id)
        if current_best is None or deal.discount_percent > current_best.discount_percent:
            best_by_hotel[rule.hotel_id] = deal

    return best_by_hotel


# Tim uu dai theo mua tot nhat cua 1 nhom khach san cu the.
def get_seasonal_deals_for_hotels(db: Session, hotel_ids: list[int]) -> dict[int, SeasonalDeal]:
    if not hotel_ids:
        return {}
    rules_by_hotel = list_active_pricing_rules_by_hotel_ids(db, hotel_ids)
    discount_rules = [
        rule for rules in rules_by_hotel.values() for rule in rules if float(rule.adjustment_value) < 0
    ]
    if not discount_rules:
        return {}
    return pick_best_seasonal_deals(db, discount_rules, get_min_active_room_price_by_hotel_ids(db, hotel_ids))


def list_seasonal_deals(db: Session, limit: int = 15) -> list[dict]:
    rules = list_active_discount_rules_for_approved_hotels(db)
    if not rules:
        return []

    hotel_ids = list({rule.hotel_id for rule in rules})
    min_prices = get_min_active_room_price_by_hotel_ids(db, hotel_ids)
    image_urls = get_primary_image_url_by_hotel_ids(db, hotel_ids)
    hotels_by_id = get_hotels_by_ids(db, hotel_ids)

    best_by_hotel = pick_best_seasonal_deals(db, rules, min_prices)

    # Uu dai dang ap dung xep truoc, sau do toi muc giam sau hon.
    ranked = sorted(
        best_by_hotel.items(),
        key=lambda item: (item[1].starts_on is not None, -item[1].discount_percent),
    )[:limit]

    items = []
    for hotel_id, deal in ranked:
        hotel = hotels_by_id[hotel_id]
        reference_price = deal.reference_price
        discounted_price = deal.discounted_price
        discount_percent = deal.discount_percent
        label = deal.label
        starts_on = deal.starts_on
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
                discounted_price=discounted_price,
                discount_percent=round(discount_percent, 1),
                deal_label=label,
                deal_starts_on=starts_on,
            )
        )
    return [item.model_dump(mode="json") for item in items]


# Xu ly lay danh sach khach san khach da tung dat de goi y dat lai nhanh. Khach
# san da bi tam dung hoac tu choi bi loai vi khong dat lai duoc nua.
def list_recently_booked_hotels(db: Session, current_user: User, limit: int = 15) -> list[dict]:
    rows = list_booked_hotels_by_user(db, current_user.id)
    if not rows:
        return []

    hotels_by_id = get_hotels_by_ids(db, [hotel_id for hotel_id, _last_booked_on in rows])
    con_dat_duoc = [
        (hotel_id, last_booked_on)
        for hotel_id, last_booked_on in rows
        if hotels_by_id.get(hotel_id) and hotels_by_id[hotel_id].status == HotelStatus.APPROVED
    ][:limit]
    if not con_dat_duoc:
        return []

    hotel_ids = [hotel_id for hotel_id, _last_booked_on in con_dat_duoc]
    image_urls = get_primary_image_url_by_hotel_ids(db, hotel_ids)
    min_prices = get_min_active_room_price_by_hotel_ids(db, hotel_ids)
    deals = get_seasonal_deals_for_hotels(db, hotel_ids)

    items = []
    for hotel_id, last_booked_on in con_dat_duoc:
        hotel = hotels_by_id[hotel_id]
        deal = deals.get(hotel_id)
        # Khi co uu dai thi lay chinh muc gia ma uu dai duoc tinh tren do lam
        # gia goc, de gia gach ngang va phan tram giam luon khop nhau.
        items.append(
            HotelHighlightResponse(
                id=hotel.id,
                name=hotel.name,
                city=hotel.city,
                star_rating=hotel.star_rating,
                avg_rating=float(hotel.avg_rating),
                total_reviews=hotel.total_reviews,
                primary_image_url=image_urls.get(hotel_id),
                from_price=deal.reference_price if deal else min_prices.get(hotel_id),
                discounted_price=deal.discounted_price if deal else None,
                discount_percent=round(deal.discount_percent, 1) if deal else None,
                deal_label=deal.label if deal else None,
                deal_starts_on=deal.starts_on if deal else None,
                last_booked_on=last_booked_on,
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
            detail="Khuyến mãi không tồn tại",
        )
    if promotion.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chỉ được quản lý khuyến mãi của khách sạn mình",
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
            detail="Khuyến mãi không tồn tại",
        )
    if promotion.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chỉ được quản lý khuyến mãi của khách sạn mình",
        )

    usage_count = count_bookings_by_promotion_id(db, promotion_id)
    if usage_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khuyến mãi này đã từng được dùng trong đơn đặt phòng, không thể xóa - hãy tắt thay vì xóa",
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
    room_amenities: list[str] | None = None,
    services: list[str] | None = None,
    has_promotion: bool = False,
    page: int,
    page_size: int,
) -> dict:
    if bool(check_in) != bool(check_out):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phải cung cấp cả check_in và check_out",
        )
    if check_in and check_out and check_out <= check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày trả phòng phải sau ngày nhận phòng",
        )
    if check_in and check_in < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày nhận phòng không được ở quá khứ",
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
        room_amenities=room_amenities,
        services=services,
        has_promotion=has_promotion,
        page=page,
        page_size=page_size,
    )
    hotel_ids = [hotel.id for hotel in hotels]
    image_urls = get_primary_image_url_by_hotel_ids(db, hotel_ids)
    reference_room_types = get_reference_room_type_by_hotel_ids(db, hotel_ids, num_guests)
    num_nights = (check_out - check_in).days if check_in and check_out else None
    # Nap quy tac gia cua moi khach san trong trang ket qua bang 1 truy van.
    pricing_rules_by_hotel = list_active_pricing_rules_by_hotel_ids(db, hotel_ids)

    items = []
    for hotel in hotels:
        room_type = reference_room_types.get(hotel.id)
        price_per_night = float(room_type.base_price) if room_type else None
        card_room_amenities: list[str] = []
        if room_type is not None:
            card_room_amenities = [a.name for a in list_room_type_amenity_records(db, room_type.id)[:3]]
        service_names = [s.name for s in list_hotel_service_records(db, hotel.id) if s.is_active][:2]

        total_price = None
        discounted_total_price = None
        discount_percent = None
        promotion_name = None
        if price_per_night is not None:
            if check_in and check_out and room_type is not None:
                # Gia co the khac nhau tung dem (gia sua tay trong room_type_rates
                # hoac quy tac gia theo mua) - cong don gia tung dem thay vi nhan
                # 1 gia phang, giong het cach tinh tien luc tao booking that
                # (create_booking).
                nights_total, _ = resolve_stay_total(
                    db,
                    room_type,
                    check_in,
                    check_out,
                    rules=pricing_rules_by_hotel.get(hotel.id, []),
                )
                total_price = nights_total
                price_per_night = nights_total / num_nights if num_nights else price_per_night
            else:
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
                bed_count=room_type.bed_count if room_type else None,
                room_amenities=card_room_amenities,
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
            detail="Phải cung cấp cả check_in và check_out",
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
    hotel = get_operating_admin_hotel(db, current_user)
    images = list_hotel_image_records(db, hotel.id)
    return [serialize_hotel_image(item) for item in images]


# Kiem tra anh thuoc khach san cua admin hien tai.
def _get_owned_hotel_image(db: Session, current_user: User, image_id: int) -> HotelImage:
    hotel = get_approved_admin_hotel(db, current_user)
    image = get_hotel_image_by_id(db, image_id)
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ảnh không tồn tại",
        )
    if image.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chỉ được quản lý ảnh của khách sạn mình",
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


# ===== Doi soat cong no voi khach san =====


# Gop so lieu doi soat cua 1 khach san tu 3 nguon: tien don da thu, hoa hong da
# chup tren tung don, va cac dot da chi tra.
def _dung_doi_soat(hotel: Hotel, tong_don: tuple[float, float], da_tra: float) -> HotelSettlementResponse:
    da_thu, hoa_hong = tong_don
    phai_tra = da_thu - hoa_hong
    return HotelSettlementResponse(
        hotel_id=hotel.id,
        hotel_name=hotel.name,
        commission_rate=float(hotel.commission_rate or 0),
        total_collected=da_thu,
        total_commission=hoa_hong,
        payable=phai_tra,
        total_paid=da_tra,
        outstanding=phai_tra - da_tra,
    )


# Xu ly Super Admin xem cong no voi toan bo khach san.
def list_hotel_settlements(db: Session, current_user: User) -> list[dict]:
    hotels = list_hotels_for_settlement(db)
    hotel_ids = [hotel.id for hotel in hotels]
    tong_don = get_booking_totals_by_hotel(db, hotel_ids)
    da_tra = get_payout_totals_by_hotel(db, hotel_ids)
    ket_qua = [
        _dung_doi_soat(hotel, tong_don.get(hotel.id, (0.0, 0.0)), da_tra.get(hotel.id, 0.0))
        for hotel in hotels
    ]
    # Khach san dang no nhieu nhat len dau - do la viec can xu ly truoc.
    ket_qua.sort(key=lambda item: item.outstanding, reverse=True)
    return [item.model_dump(mode="json") for item in ket_qua]


# Xu ly Admin xem cong no nen tang dang giu ho khach san minh.
def get_my_settlement(db: Session, current_user: User) -> dict:
    hotel = get_operating_admin_hotel(db, current_user)
    tong_don = get_booking_totals_by_hotel(db, [hotel.id])
    da_tra = get_payout_totals_by_hotel(db, [hotel.id])
    doi_soat = _dung_doi_soat(hotel, tong_don.get(hotel.id, (0.0, 0.0)), da_tra.get(hotel.id, 0.0))
    return doi_soat.model_dump(mode="json")


# Xu ly Admin xem lich su cac dot nen tang da chi tra cho khach san minh.
def list_my_payouts(db: Session, current_user: User) -> list[dict]:
    hotel = get_operating_admin_hotel(db, current_user)
    return [PayoutResponse.model_validate(item).model_dump(mode="json") for item in list_payouts_by_hotel(db, hotel.id)]


# Xu ly Super Admin xem lich su chi tra cua 1 khach san bat ky.
def list_hotel_payouts(db: Session, current_user: User, hotel_id: int) -> list[dict]:
    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khách sạn không tồn tại")
    return [PayoutResponse.model_validate(item).model_dump(mode="json") for item in list_payouts_by_hotel(db, hotel.id)]


# Xu ly Super Admin doi ty le hoa hong cua 1 khach san. Ty le moi chi ap cho don
# tao SAU thoi diem doi; don da tao giu nguyen ty le da chup.
def update_commission_rate(db: Session, current_user: User, hotel_id: int, payload: UpdateCommissionRateRequest) -> dict:
    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khách sạn không tồn tại")

    hotel.commission_rate = payload.commission_rate
    save_hotel(db, hotel)
    return serialize_hotel(hotel)


# Xu ly Super Admin ghi nhan 1 dot da chi tra cho khach san. Viec chuyen tien
# that lam ngoai he thong, day chi la buoc ghi so.
def create_hotel_payout(db: Session, current_user: User, payload: CreatePayoutRequest) -> dict:
    hotel = get_hotel_by_id(db, payload.hotel_id)
    if not hotel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khách sạn không tồn tại")

    # Chan ghi vuot so dang no: ghi thua se lam cong no am va sai so sach.
    tong_don = get_booking_totals_by_hotel(db, [hotel.id])
    da_tra = get_payout_totals_by_hotel(db, [hotel.id])
    con_no = _dung_doi_soat(hotel, tong_don.get(hotel.id, (0.0, 0.0)), da_tra.get(hotel.id, 0.0)).outstanding
    if payload.amount > con_no:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Số tiền vượt quá công nợ hiện tại ({con_no:,.0f} đ)",
        )

    payout = create_payout_record(
        db,
        hotel_id=hotel.id,
        amount=payload.amount,
        period_from=payload.period_from,
        period_to=payload.period_to,
        reference=payload.reference,
        note=payload.note,
        created_by=current_user.id,
    )
    return PayoutResponse.model_validate(payout).model_dump(mode="json")
