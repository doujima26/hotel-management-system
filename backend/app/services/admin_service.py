from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.enums import AdminActionTarget, AdminActionType, HotelStatus, UserRole
from app.core.timeutils import business_today
from app.models.entities import User
from app.repositories.admin_log_repository import (
    create_admin_action_log_record,
    list_admin_action_log_records,
)
from app.repositories.dashboard_repository import (
    count_bookings_and_cancelled_by_hotel_ids,
    get_revenue_by_hotel_ids,
)
from app.repositories.hotel_repository import (
    count_hotels_by_city,
    count_hotels_by_status,
    count_room_types_and_rooms_by_hotel_ids,
    get_hotel_by_id,
    list_hotel_image_records,
    list_hotel_records_for_admin,
    list_hotel_service_records,
    save_hotel,
)
from app.repositories.room_repository import (
    count_all_rooms_by_room_type_map,
    list_amenities_by_room_type_ids,
    list_hotel_amenity_records,
    list_images_by_room_type_ids,
    list_room_type_records,
)
from app.repositories.user_repository import get_user_by_id, list_user_records
from app.schemas.admin import (
    AdminActionLogItem,
    AdminActionLogListResponse,
    AdminHotelDetailResponse,
    AdminHotelListItem,
    AdminHotelListResponse,
    AdminHotelOwnerItem,
    AdminHotelRoomTypeItem,
    AdminUserListResponse,
    CityCountItem,
    ReviewHotelRequest,
    ReviewHotelResponse,
    SetUserActiveRequest,
)
from app.schemas.auth import UserPublicResponse
from app.services.auth_service import set_user_active


# So ngay lay chi so hoat dong cho danh sach khach san.
_HOTEL_STATS_DAYS = 30


# Xu ly lay danh sach khach san cho Super Admin, kem chi so suc khoe cua tung
# khach san (quy mo, danh gia, booking/doanh thu 30 ngay, ty le huy).
#
# Cac chi so lay theo LO cho ca trang (3 truy van tong hop) thay vi hoi tung
# khach san mot - so truy van khong tang theo so dong hien tren trang.
def list_hotels_for_admin(
    db: Session,
    *,
    status_filter: HotelStatus | None,
    search: str | None = None,
    city: str | None = None,
    sort: str = "newest",
    page: int,
    page_size: int,
) -> dict:
    hotels, total = list_hotel_records_for_admin(
        db,
        status_filter=status_filter,
        search=search,
        city=city,
        sort=sort,
        page=page,
        page_size=page_size,
    )

    hotel_ids = [hotel.id for hotel in hotels]
    to_date = business_today()
    from_date = to_date - timedelta(days=_HOTEL_STATS_DAYS - 1)
    rooms_map = count_room_types_and_rooms_by_hotel_ids(db, hotel_ids)
    bookings_map = count_bookings_and_cancelled_by_hotel_ids(db, from_date, to_date, hotel_ids)
    revenue_map = get_revenue_by_hotel_ids(db, from_date, to_date, hotel_ids)

    items = []
    for hotel in hotels:
        room_type_count, room_count = rooms_map.get(hotel.id, (0, 0))
        bookings_count, cancelled_count = bookings_map.get(hotel.id, (0, 0))
        items.append(
            AdminHotelListItem(
                id=hotel.id,
                name=hotel.name,
                address=hotel.address,
                city=hotel.city,
                district=hotel.district,
                phone=hotel.phone,
                email=hotel.email,
                star_rating=hotel.star_rating,
                status=hotel.status,
                rejection_reason=hotel.rejection_reason,
                avg_rating=float(hotel.avg_rating),
                total_reviews=hotel.total_reviews,
                room_type_count=room_type_count,
                room_count=room_count,
                bookings_30d=bookings_count,
                revenue_30d=revenue_map.get(hotel.id, 0.0),
                # Khong co don nao thi ty le huy khong xac dinh, KHONG phai 0%.
                cancel_rate_30d=round(cancelled_count / bookings_count, 4) if bookings_count else None,
            )
        )

    total_pages = (total + page_size - 1) // page_size if total else 0
    return AdminHotelListResponse(
        items=items,
        status_counts=count_hotels_by_status(db),
        cities=[CityCountItem(city=city_name, count=count) for city_name, count in count_hotels_by_city(db)],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    ).model_dump(mode="json")


# Xu ly Super Admin xem ho so day du cua 1 khach san de tham dinh.
#
# KHONG loc theo trang thai: phai xem duoc ca khach san dang cho duyet (chua
# approved) - do moi chinh la luc can xem ky nhat.
def get_hotel_detail_for_admin(db: Session, hotel_id: int) -> dict:
    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khach san khong ton tai",
        )

    owner = get_user_by_id(db, hotel.owner_id)
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay chu so huu cua khach san",
        )

    room_types = list_room_type_records(db, hotel.id)
    room_type_ids = [item.id for item in room_types]
    # Lay theo lo cho ca 3 thong tin phu de khong ban truy van theo tung loai phong.
    rooms_count_map = count_all_rooms_by_room_type_map(db, room_type_ids)
    images_map = list_images_by_room_type_ids(db, room_type_ids)
    amenities_map = list_amenities_by_room_type_ids(db, room_type_ids)

    return AdminHotelDetailResponse(
        id=hotel.id,
        name=hotel.name,
        description=hotel.description,
        address=hotel.address,
        city=hotel.city,
        district=hotel.district,
        phone=hotel.phone,
        email=hotel.email,
        star_rating=hotel.star_rating,
        status=hotel.status,
        rejection_reason=hotel.rejection_reason,
        avg_rating=float(hotel.avg_rating),
        total_reviews=hotel.total_reviews,
        check_in_time=hotel.check_in_time,
        check_out_time=hotel.check_out_time,
        cancellation_policy=hotel.cancellation_policy,
        children_policy=hotel.children_policy,
        pets_allowed=hotel.pets_allowed,
        payment_methods=hotel.payment_methods,
        owner=AdminHotelOwnerItem(
            id=owner.id,
            full_name=owner.full_name,
            email=owner.email,
            phone=owner.phone,
            is_active=owner.is_active,
        ),
        images=[image.image_url for image in list_hotel_image_records(db, hotel.id)],
        amenities=[amenity.name for amenity in list_hotel_amenity_records(db, hotel.id)],
        services=[service.name for service in list_hotel_service_records(db, hotel.id)],
        room_types=[
            AdminHotelRoomTypeItem(
                id=room_type.id,
                name=room_type.name,
                base_price=float(room_type.base_price),
                max_guests=room_type.max_guests,
                bed_type=room_type.bed_type,
                bed_count=room_type.bed_count,
                area_sqm=float(room_type.area_sqm) if room_type.area_sqm is not None else None,
                total_rooms=room_type.total_rooms,
                created_rooms=rooms_count_map.get(room_type.id, 0),
                image_count=len(images_map.get(room_type.id, [])),
                amenities=[amenity.name for amenity in amenities_map.get(room_type.id, [])],
                is_active=room_type.is_active,
            )
            for room_type in room_types
        ],
    ).model_dump(mode="json")


# Anh xa hanh dong duyet sang loai su kien ghi vao nhat ky.
_REVIEW_ACTION_LOGS = {
    HotelStatus.APPROVED: AdminActionType.HOTEL_APPROVED,
    HotelStatus.REJECTED: AdminActionType.HOTEL_REJECTED,
    HotelStatus.SUSPENDED: AdminActionType.HOTEL_SUSPENDED,
}


# Xu ly Super Admin duyet / tu choi / tam dung khach san, co ghi nhat ky.
#
# Truoc day phan nay nam thang trong endpoint va truy van DB truc tiep - dua ve
# service cho dung phan tang, va de ban ghi nhat ky nam cung mot giao dich voi
# thay doi trang thai (khong the co truong hop doi trang thai xong nhung mat
# nhat ky, hoac nguoc lai).
def review_hotel(db: Session, actor: User, hotel_id: int, payload: ReviewHotelRequest) -> dict:
    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khach san khong ton tai",
        )

    new_status = HotelStatus(payload.action)
    hotel.status = new_status
    if new_status == HotelStatus.REJECTED:
        hotel.rejection_reason = payload.rejection_reason or "Khong du dieu kien phe duyet"
    else:
        hotel.rejection_reason = None

    create_admin_action_log_record(
        db,
        actor_id=actor.id,
        action=_REVIEW_ACTION_LOGS[new_status],
        target_type=AdminActionTarget.HOTEL,
        target_id=hotel.id,
        # Chup lai ten hien tai: khach san doi ten ve sau khong lam sai nhat ky cu.
        target_label=hotel.name,
        reason=payload.rejection_reason,
    )
    hotel = save_hotel(db, hotel)

    return ReviewHotelResponse(
        id=hotel.id,
        status=hotel.status,
        rejection_reason=hotel.rejection_reason,
    ).model_dump(mode="json")


# Xu ly Super Admin khoa/mo tai khoan, co ghi nhat ky.
def set_user_active_for_admin(db: Session, actor: User, user_id: int, payload: SetUserActiveRequest) -> dict:
    target = get_user_by_id(db, user_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nguoi dung khong ton tai",
        )

    create_admin_action_log_record(
        db,
        actor_id=actor.id,
        action=AdminActionType.USER_UNLOCKED if payload.is_active else AdminActionType.USER_LOCKED,
        target_type=AdminActionTarget.USER,
        target_id=target.id,
        target_label=target.email,
        reason=None,
    )
    return set_user_active(db, user_id, payload)


# Xu ly Super Admin xem nhat ky hanh dong quan tri.
def list_admin_action_logs(db: Session, *, target_type: str | None, page: int, page_size: int) -> dict:
    rows, total = list_admin_action_log_records(db, target_type=target_type, page=page, page_size=page_size)
    items = [
        AdminActionLogItem(
            id=log.id,
            actor_id=actor.id,
            actor_name=actor.full_name,
            actor_email=actor.email,
            action=log.action,
            target_type=log.target_type,
            target_id=log.target_id,
            target_label=log.target_label,
            reason=log.reason,
            created_at=log.created_at,
        )
        for log, actor in rows
    ]
    total_pages = (total + page_size - 1) // page_size if total else 0
    return AdminActionLogListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    ).model_dump(mode="json")


# Xu ly lay danh sach nguoi dung cho super admin quan ly, loc theo role/is_active.
def list_users_for_admin(
    db: Session,
    *,
    role_filter: UserRole | None,
    is_active_filter: bool | None,
    page: int,
    page_size: int,
) -> dict:
    users, total = list_user_records(
        db,
        role_filter=role_filter,
        is_active_filter=is_active_filter,
        page=page,
        page_size=page_size,
    )
    items = [UserPublicResponse.model_validate(user) for user in users]
    total_pages = (total + page_size - 1) // page_size if total else 0
    return AdminUserListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    ).model_dump(mode="json")
