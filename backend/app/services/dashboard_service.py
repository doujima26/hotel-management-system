from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.timeutils import business_today
from app.models.entities import User
from app.repositories.dashboard_repository import (
    count_arrivals_and_departures_today,
    count_bookings_created,
    count_declared_rooms_of_approved_hotels,
    count_new_users,
    count_overdue_confirmed_bookings,
    count_pending_bookings,
    count_users_by_role,
    get_oldest_pending_hotel_created_at,
    get_revenue,
    get_top_services,
    get_total_room_capacity,
    list_active_booking_rooms_in_range,
    list_top_hotels_by_revenue,
)
from app.repositories.hotel_repository import count_hotels_by_status, get_hotel_by_id
from app.repositories.review_repository import list_reviews_with_user_and_booking_by_hotel
from app.repositories.room_repository import count_rooms_by_status, get_active_room_blocks_for_hotel
from app.repositories.staff_repository import list_schedules_with_staff_by_hotel
from app.schemas.dashboard import (
    DailyTrendPoint,
    HotelDashboardResponse,
    HotelOperationsOverviewResponse,
    PlatformDashboardResponse,
    PlatformOverviewResponse,
    PlatformTrendPoint,
    RecentReviewItem,
    RoomStatusOverview,
    StaffShiftItem,
    TopHotelItem,
    TopServiceItem,
)
from app.services.hotel_service import get_approved_admin_hotel

# So review gan day nhat hien tren khoi "Danh gia moi" cua Dashboard.
_RECENT_REVIEWS_LIMIT = 5

# So ngay hien thi trong bieu do doanh thu + hieu suat tren Dashboard.
_TREND_DAYS = 7


# Mac dinh khoang ngay la thang hien tai neu khong truyen from_date/to_date.
def _default_date_range(from_date: date | None, to_date: date | None) -> tuple[date, date]:
    if from_date and to_date:
        return from_date, to_date
    # Lay "hom nay" theo mui gio nghiep vu, khong theo mui gio may chu.
    today = business_today()
    return today.replace(day=1), today


# Tinh ty le lap day = tong dem-phong da ban / tong dem-phong kha dung trong khoang ngay.
def _compute_occupancy_rate(db: Session, hotel_id: int, from_date: date, to_date: date) -> float:
    total_rooms = get_total_room_capacity(db, hotel_id)
    num_days = (to_date - from_date).days + 1
    room_nights_available = total_rooms * num_days
    if room_nights_available <= 0:
        return 0.0

    range_end_exclusive = to_date + timedelta(days=1)
    room_nights_sold = 0
    for check_in_date, check_out_date, quantity in list_active_booking_rooms_in_range(db, hotel_id, from_date, to_date):
        overlap_start = max(check_in_date, from_date)
        overlap_end = min(check_out_date, range_end_exclusive)
        nights = max((overlap_end - overlap_start).days, 0)
        room_nights_sold += nights * quantity

    return round(room_nights_sold / room_nights_available, 4)


# Dung chung cho ca dashboard Admin va phan chi tiet 1 khach san trong dashboard Super Admin.
def _build_hotel_dashboard(db: Session, hotel_id: int, from_date: date, to_date: date) -> dict:
    revenue = get_revenue(db, from_date, to_date, hotel_id=hotel_id)
    occupancy_rate = _compute_occupancy_rate(db, hotel_id, from_date, to_date)
    top_services = [
        TopServiceItem(service_id=service_id, service_name=name, total_quantity=int(quantity), total_revenue=float(revenue_amount))
        for service_id, name, quantity, revenue_amount in get_top_services(db, hotel_id, from_date, to_date)
    ]
    return HotelDashboardResponse(
        hotel_id=hotel_id,
        from_date=from_date,
        to_date=to_date,
        revenue=revenue,
        occupancy_rate=occupancy_rate,
        top_services=top_services,
    ).model_dump(mode="json")


# Xu ly Admin xem dashboard doanh thu/ty le lap day/dich vu cua khach san minh.
def get_hotel_dashboard(db: Session, current_user: User, from_date: date | None, to_date: date | None) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    from_date, to_date = _default_date_range(from_date, to_date)
    if to_date < from_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngay ket thuc phai sau hoac bang ngay bat dau")

    return _build_hotel_dashboard(db, hotel.id, from_date, to_date)


# Xu ly Super Admin xem dashboard tong quan toan nen tang, co the xem chi tiet 1 khach san.
def get_platform_dashboard(db: Session, from_date: date | None, to_date: date | None, hotel_id: int | None) -> dict:
    from_date, to_date = _default_date_range(from_date, to_date)
    if to_date < from_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngay ket thuc phai sau hoac bang ngay bat dau")

    total_revenue = get_revenue(db, from_date, to_date)
    total_bookings = count_bookings_created(db, from_date, to_date)
    new_users_count = count_new_users(db, from_date, to_date)

    hotel_data = None
    if hotel_id is not None:
        hotel = get_hotel_by_id(db, hotel_id)
        if not hotel:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khach san khong ton tai")
        hotel_data = _build_hotel_dashboard(db, hotel_id, from_date, to_date)

    return PlatformDashboardResponse(
        from_date=from_date,
        to_date=to_date,
        total_revenue=total_revenue,
        total_bookings=total_bookings,
        new_users_count=new_users_count,
        hotel=hotel_data,
    ).model_dump(mode="json")


# So khach san hien trong bang xep hang doanh thu cua nen tang.
_TOP_HOTELS_LIMIT = 5

# So ngay lay doanh thu cho bang xep hang top khach san.
_TOP_HOTELS_DAYS = 30


# Xu ly Super Admin xem tong quan nen tang - anh chup "hom nay" (khac han
# get_platform_dashboard tinh theo khoang ngay tuy chon).
#
# Gom 3 cau hoi cua nguoi van hanh nen tang: nen tang dang to co nao, hom nay co
# gi can xu ly, va dang tang hay giam.
def get_platform_overview(db: Session) -> dict:
    today = business_today()
    status_counts = count_hotels_by_status(db)

    # Ho so cho duyet lau nhat da cho bao nhieu ngay - None khi khong con ho so
    # nao cho, de giao dien khong hien "0 ngay" gay hieu nham la vua co ho so moi.
    oldest_pending_at = get_oldest_pending_hotel_created_at(db)
    oldest_pending_days = (today - oldest_pending_at.date()).days if oldest_pending_at else None

    trend = []
    for offset in range(_TREND_DAYS - 1, -1, -1):
        day = today - timedelta(days=offset)
        trend.append(
            PlatformTrendPoint(
                date=day,
                revenue=get_revenue(db, day, day),
                bookings=count_bookings_created(db, day, day),
            )
        )

    top_from = today - timedelta(days=_TOP_HOTELS_DAYS - 1)
    top_hotels = [
        TopHotelItem(hotel_id=hotel_id, name=name, revenue=float(revenue))
        for hotel_id, name, revenue in list_top_hotels_by_revenue(db, top_from, today, _TOP_HOTELS_LIMIT)
    ]

    return PlatformOverviewResponse(
        date=today,
        total_hotels=sum(status_counts.values()),
        approved_hotels=status_counts.get("approved", 0),
        pending_hotels=status_counts.get("pending", 0),
        suspended_hotels=status_counts.get("suspended", 0),
        rejected_hotels=status_counts.get("rejected", 0),
        total_rooms=count_declared_rooms_of_approved_hotels(db),
        users_by_role=count_users_by_role(db),
        oldest_pending_days=oldest_pending_days,
        revenue_today=get_revenue(db, today, today),
        bookings_today=count_bookings_created(db, today, today),
        new_users_today=count_new_users(db, today, today),
        daily_trend=trend,
        top_hotels=top_hotels,
    ).model_dump(mode="json")


# Tinh doanh thu + ty le lap day cho tung ngay trong _TREND_DAYS ngay gan nhat
# (tinh ca hom nay), thu tu tu cu den moi - dung cho bieu do "Doanh thu va
# hieu suat 7 ngay" tren Dashboard.
def _build_daily_trend(db: Session, hotel_id: int, today: date) -> list[DailyTrendPoint]:
    points = []
    for offset in range(_TREND_DAYS - 1, -1, -1):
        day = today - timedelta(days=offset)
        revenue = get_revenue(db, day, day, hotel_id=hotel_id)
        occupancy_rate = _compute_occupancy_rate(db, hotel_id, day, day)
        points.append(DailyTrendPoint(date=day, revenue=revenue, occupancy_rate=occupancy_rate))
    return points


# Xu ly Admin xem Dashboard tong quan van hanh cua khach san minh - luon la
# anh chup "hom nay" (khac han get_hotel_dashboard tinh theo khoang ngay,
# thien ve tai chinh - da chuyen sang trang Doanh thu rieng, khong dung chung
# logic voi ham nay).
def get_hotel_operations_overview(db: Session, current_user: User) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    today = business_today()

    pending_bookings = count_pending_bookings(db, hotel.id)
    overdue_confirmed_bookings = count_overdue_confirmed_bookings(db, hotel.id, today)
    arrivals_today, departures_today, in_house = count_arrivals_and_departures_today(db, hotel.id, today)

    room_counts = count_rooms_by_status(db, hotel.id)
    blocked_today = len(get_active_room_blocks_for_hotel(db, hotel.id, today))
    room_status = RoomStatusOverview(
        available=room_counts.get("available", 0),
        occupied=room_counts.get("occupied", 0),
        cleaning=room_counts.get("cleaning", 0),
        maintenance=room_counts.get("maintenance", 0),
        blocked_today=blocked_today,
    )

    daily_trend = _build_daily_trend(db, hotel.id, today)

    staff_shifts_today = [
        StaffShiftItem(
            staff_id=schedule.staff_id,
            staff_name=user.full_name,
            staff_position=staff.position,
            shift_type=schedule.shift_type,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
        )
        for schedule, staff, user in list_schedules_with_staff_by_hotel(db, hotel.id, today, today)
    ]

    recent_reviews = [
        RecentReviewItem(id=review.id, reviewer_name=user.full_name, rating=review.rating, comment=review.comment, created_at=review.created_at)
        for review, user, _booking in list_reviews_with_user_and_booking_by_hotel(db, hotel.id)[:_RECENT_REVIEWS_LIMIT]
    ]

    return HotelOperationsOverviewResponse(
        hotel_id=hotel.id,
        date=today,
        pending_bookings=pending_bookings,
        overdue_confirmed_bookings=overdue_confirmed_bookings,
        arrivals_today=arrivals_today,
        departures_today=departures_today,
        in_house=in_house,
        room_status=room_status,
        daily_trend=daily_trend,
        staff_shifts_today=staff_shifts_today,
        recent_reviews=recent_reviews,
    ).model_dump(mode="json")
