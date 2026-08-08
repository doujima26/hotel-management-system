from datetime import timedelta

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from app.core.enums import AdminActionTarget, AdminActionType, HotelStatus, UserRole
from app.core.timeutils import business_today
from app.models.entities import AdminActionLog, Hotel, StaffMember, User
from app.repositories.admin_log_repository import (
    create_admin_action_log_record,
    list_admin_action_log_records,
)
from app.repositories.booking_repository import (
    count_outstanding_bookings_by_hotel_ids,
    get_booking_stats_by_user,
)
from app.repositories.dashboard_repository import (
    count_bookings_and_cancelled_by_hotel_ids,
    get_revenue_by_hotel_ids,
    get_total_paid_by_user,
)
from app.repositories.hotel_repository import (
    count_hotels_by_city,
    count_hotels_by_status,
    count_room_types_and_rooms_by_hotel_ids,
    get_hotel_by_id,
    get_hotel_by_owner,
    list_hotel_image_records,
    list_hotels_by_owner_ids,
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
from app.repositories.review_repository import count_reviews_by_user
from app.repositories.staff_repository import (
    list_staff_with_hotel_by_user_ids,
    list_staff_with_user_by_hotel,
)
from app.repositories.user_repository import count_users_by_role, get_user_by_id, list_user_records
from app.schemas.admin import (
    AdminActionLogItem,
    AdminActionLogListResponse,
    AdminHotelDetailResponse,
    AdminHotelListItem,
    AdminHotelListResponse,
    AdminHotelOwnerItem,
    AdminHotelRoomTypeItem,
    AdminHotelStaffItem,
    AdminUserActivity,
    AdminUserDetailResponse,
    AdminUserHotelLink,
    AdminUserListItem,
    AdminUserListResponse,
    CityCountItem,
    ReviewHotelRequest,
    ReviewHotelResponse,
    SetUserActiveRequest,
)
from app.services.auth_service import set_user_active
from app.services.email_service import queue_email, send_hotel_review_result


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
    outstanding_map = count_outstanding_bookings_by_hotel_ids(db, hotel_ids, to_date)

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
                outstanding_bookings=outstanding_map.get(hotel.id, 0),
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
            detail="Khách sạn không tồn tại",
        )

    owner = get_user_by_id(db, hotel.owner_id)
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy chủ sở hữu của khách sạn",
        )

    room_types = list_room_type_records(db, hotel.id)
    room_type_ids = [item.id for item in room_types]
    # Lay theo lo cho ca 3 thong tin phu de khong ban truy van theo tung loai phong.
    rooms_count_map = count_all_rooms_by_room_type_map(db, room_type_ids)
    images_map = list_images_by_room_type_ids(db, room_type_ids)
    amenities_map = list_amenities_by_room_type_ids(db, room_type_ids)

    # Tinh chi so 30 ngay bang dung ham va khoang ngay cua danh sach khach san.
    to_date = business_today()
    from_date = to_date - timedelta(days=_HOTEL_STATS_DAYS - 1)
    bookings_count, cancelled_count = count_bookings_and_cancelled_by_hotel_ids(
        db, from_date, to_date, [hotel.id]
    ).get(hotel.id, (0, 0))
    revenue = get_revenue_by_hotel_ids(db, from_date, to_date, [hotel.id]).get(hotel.id, 0.0)
    # Dem so booking khach san con phai phuc vu.
    outstanding = count_outstanding_bookings_by_hotel_ids(db, [hotel.id], to_date).get(hotel.id, 0)

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
        staff=[
            AdminHotelStaffItem(
                id=staff.id,
                user_id=user.id,
                full_name=user.full_name,
                email=user.email,
                phone=user.phone,
                position=staff.position,
                hired_at=staff.hired_at,
                is_active=staff.is_active,
                account_active=user.is_active,
            )
            for staff, user in list_staff_with_user_by_hotel(db, hotel.id)
        ],
        bookings_30d=bookings_count,
        revenue_30d=revenue,
        # Khong co don nao thi ty le huy la None, khong phai 0.
        cancel_rate_30d=round(cancelled_count / bookings_count, 4) if bookings_count else None,
        outstanding_bookings=outstanding,
    ).model_dump(mode="json")


# Anh xa hanh dong duyet sang loai su kien ghi vao nhat ky.
_REVIEW_ACTION_LOGS = {
    HotelStatus.APPROVED: AdminActionType.HOTEL_APPROVED,
    HotelStatus.REJECTED: AdminActionType.HOTEL_REJECTED,
    HotelStatus.SUSPENDED: AdminActionType.HOTEL_SUSPENDED,
}

# Cac chuyen trang thai hop le cua ho so khach san.
_ALLOWED_TRANSITIONS = {
    HotelStatus.PENDING: (HotelStatus.APPROVED, HotelStatus.REJECTED),
    HotelStatus.APPROVED: (HotelStatus.SUSPENDED,),
    HotelStatus.SUSPENDED: (HotelStatus.APPROVED,),
    HotelStatus.REJECTED: (HotelStatus.APPROVED,),
}


# Xu ly Super Admin duyet / tu choi / tam dung khach san, co ghi nhat ky.
#
# Truoc day phan nay nam thang trong endpoint va truy van DB truc tiep - dua ve
# service cho dung phan tang, va de ban ghi nhat ky nam cung mot giao dich voi
# thay doi trang thai (khong the co truong hop doi trang thai xong nhung mat
# nhat ky, hoac nguoc lai).
def review_hotel(
    db: Session,
    actor: User,
    hotel_id: int,
    payload: ReviewHotelRequest,
    background_tasks: BackgroundTasks | None = None,
) -> dict:
    hotel = get_hotel_by_id(db, hotel_id)
    if not hotel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khách sạn không tồn tại",
        )

    new_status = HotelStatus(payload.action)
    if new_status not in _ALLOWED_TRANSITIONS[hotel.status]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể chuyển khách sạn từ trạng thái '{hotel.status}' sang '{new_status}'",
        )

    reason = (payload.reason or "").strip()
    # Bat buoc nhap ly do khi tam dung khach san.
    if new_status == HotelStatus.SUSPENDED and not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phải nhập lý do tạm dừng khách sạn",
        )

    hotel.status = new_status
    if new_status == HotelStatus.REJECTED:
        hotel.rejection_reason = reason or "Khong du dieu kien phe duyet"
    elif new_status == HotelStatus.SUSPENDED:
        # Luu ly do tam dung vao chung cot voi ly do tu choi.
        hotel.rejection_reason = reason
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
        reason=reason or None,
    )
    hotel = save_hotel(db, hotel)

    # Bao ket qua tham dinh cho chu khach san. Tam dung khong gui vi ly do da
    # hien ngay tren trang quan ly cua ho.
    if new_status in (HotelStatus.APPROVED, HotelStatus.REJECTED):
        owner = get_user_by_id(db, hotel.owner_id)
        if owner:
            queue_email(
                background_tasks,
                send_hotel_review_result,
                owner.email,
                hotel.name,
                new_status == HotelStatus.APPROVED,
                reason or None,
            )

    return ReviewHotelResponse(
        id=hotel.id,
        status=hotel.status,
        rejection_reason=hotel.rejection_reason,
    ).model_dump(mode="json")


# Xu ly Super Admin khoa/mo tai khoan, co ghi nhat ky.
#
# Tai khoan Super Admin khong khoa duoc qua ung dung: he thong khong co duong
# tao tai khoan Super Admin moi, nen khoa het la mat quyen quan tri nen tang va
# chi khoi phuc duoc bang thao tac truc tiep tren database. Chan o day nen thao
# tac bi tu choi cung khong de lai dong nhat ky nao.
def set_user_active_for_admin(db: Session, actor: User, user_id: int, payload: SetUserActiveRequest) -> dict:
    target = get_user_by_id(db, user_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại",
        )
    if target.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không thể khóa hoặc mở khóa tài khoản Super Admin",
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


# So dong nhat ky hien trong ho so 1 tai khoan.
_USER_LOG_LIMIT = 20


# Chuyen 1 dong nhat ky kem nguoi thuc hien thanh du lieu tra ve.
def _serialize_action_log(log: AdminActionLog, actor: User) -> AdminActionLogItem:
    return AdminActionLogItem(
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


# Xu ly Super Admin xem nhat ky hanh dong quan tri.
def list_admin_action_logs(db: Session, *, target_type: str | None, page: int, page_size: int) -> dict:
    rows, total = list_admin_action_log_records(db, target_type=target_type, page=page, page_size=page_size)
    items = [_serialize_action_log(log, actor) for log, actor in rows]
    total_pages = (total + page_size - 1) // page_size if total else 0
    return AdminActionLogListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    ).model_dump(mode="json")


# Dung thong tin noi cong tac tu khach san so huu hoac tu ban ghi nhan vien.
def _build_hotel_link(hotel: Hotel | None, staff: StaffMember | None) -> AdminUserHotelLink | None:
    if not hotel:
        return None
    return AdminUserHotelLink(
        hotel_id=hotel.id,
        hotel_name=hotel.name,
        hotel_status=hotel.status,
        city=hotel.city,
        position=staff.position if staff else None,
        hired_at=staff.hired_at if staff else None,
        is_working=staff.is_active if staff else None,
    )


# Xu ly lay danh sach nguoi dung cho super admin quan ly, loc theo role/is_active/tu khoa.
#
# Noi cong tac lay theo lo cho ca trang (2 truy van) thay vi hoi tung nguoi mot.
def list_users_for_admin(
    db: Session,
    *,
    role_filter: UserRole | None,
    is_active_filter: bool | None,
    search: str | None = None,
    page: int,
    page_size: int,
) -> dict:
    users, total = list_user_records(
        db,
        role_filter=role_filter,
        is_active_filter=is_active_filter,
        search=search,
        page=page,
        page_size=page_size,
    )

    owner_ids = [user.id for user in users if user.role == UserRole.ADMIN]
    staff_user_ids = [user.id for user in users if user.role == UserRole.STAFF]
    owned_map = list_hotels_by_owner_ids(db, owner_ids)
    staff_map = list_staff_with_hotel_by_user_ids(db, staff_user_ids)

    items = []
    for user in users:
        staff, hotel = staff_map.get(user.id, (None, None))
        items.append(
            AdminUserListItem(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                phone=user.phone,
                avatar_url=user.avatar_url,
                role=user.role,
                is_active=user.is_active,
                is_verified=user.is_verified,
                created_at=user.created_at,
                hotel=_build_hotel_link(owned_map.get(user.id) or hotel, staff),
            )
        )

    total_pages = (total + page_size - 1) // page_size if total else 0
    return AdminUserListResponse(
        items=items,
        role_counts=count_users_by_role(db),
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    ).model_dump(mode="json")


# Xu ly Super Admin xem ho so day du cua 1 tai khoan.
def get_user_detail_for_admin(db: Session, user_id: int) -> dict:
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại",
        )

    staff, staff_hotel = (None, None)
    owned_hotel = None
    if user.role == UserRole.ADMIN:
        owned_hotel = get_hotel_by_owner(db, user.id)
    elif user.role == UserRole.STAFF:
        staff, staff_hotel = list_staff_with_hotel_by_user_ids(db, [user.id]).get(user.id, (None, None))

    total_bookings, cancelled_bookings, last_check_in = get_booking_stats_by_user(db, user.id)
    logs, _ = list_admin_action_log_records(
        db,
        target_type=AdminActionTarget.USER,
        target_id=user.id,
        page=1,
        page_size=_USER_LOG_LIMIT,
    )

    return AdminUserDetailResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        avatar_url=user.avatar_url,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        updated_at=user.updated_at,
        hotel=_build_hotel_link(owned_hotel or staff_hotel, staff),
        activity=AdminUserActivity(
            total_bookings=total_bookings,
            cancelled_bookings=cancelled_bookings,
            total_paid=get_total_paid_by_user(db, user.id),
            total_reviews=count_reviews_by_user(db, user.id),
            last_check_in_date=last_check_in,
        ),
        action_logs=[_serialize_action_log(log, actor) for log, actor in logs],
    ).model_dump(mode="json")
