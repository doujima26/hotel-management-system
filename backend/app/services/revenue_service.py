from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.timeutils import business_timezone, business_today
from app.models.entities import User
from app.repositories.revenue_repository import (
    count_bookings_created,
    get_total_room_capacity,
    list_active_booking_rooms_in_range,
    list_completed_payments_in_range,
    list_revenue_by_room_type,
)
from app.schemas.revenue import DailyRevenuePoint, HotelRevenueDashboardResponse, RevenueByRoomTypeItem
from app.services.hotel_service import get_operating_admin_hotel

# So ngay toi da cho 1 lan xem xu huong doanh thu theo ngay (tra ve 1 diem/ngay
# nen qua dai se roi bieu do).
_MAX_REVENUE_TREND_DAYS = 92


# Mac dinh khoang ngay la thang hien tai neu khong truyen from_date/to_date.
def _default_date_range(from_date: date | None, to_date: date | None) -> tuple[date, date]:
    if from_date and to_date:
        return from_date, to_date
    today = business_today()
    return today.replace(day=1), today


# Kỳ trước liền ke, cung do dai voi khoang ngay hien tai.
def _shift_to_previous_period(from_date: date, to_date: date) -> tuple[date, date]:
    period_length = (to_date - from_date).days + 1
    prev_to = from_date - timedelta(days=1)
    prev_from = prev_to - timedelta(days=period_length - 1)
    return prev_from, prev_to


# Ty le % thay doi so voi ky truoc - None neu ky truoc = 0 (tranh chia 0, FE tu hien "-"/"moi").
def _pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None
    return (current - previous) / previous


# Cong don so dem-phong da ban (giao voi khoang ngay) - dung cho ca ty le lap day va ADR.
def _compute_room_nights_sold(db: Session, hotel_id: int, from_date: date, to_date: date) -> int:
    range_end_exclusive = to_date + timedelta(days=1)
    room_nights_sold = 0
    for check_in_date, check_out_date, quantity in list_active_booking_rooms_in_range(db, hotel_id, from_date, to_date):
        overlap_start = max(check_in_date, from_date)
        overlap_end = min(check_out_date, range_end_exclusive)
        nights = max((overlap_end - overlap_start).days, 0)
        room_nights_sold += nights * quantity
    return room_nights_sold


# Ty le lap day = tong dem-phong da ban / tong dem-phong kha dung trong khoang ngay.
def _compute_occupancy_rate(db: Session, hotel_id: int, from_date: date, to_date: date, room_nights_sold: int) -> float:
    total_rooms = get_total_room_capacity(db, hotel_id)
    num_days = (to_date - from_date).days + 1
    room_nights_available = total_rooms * num_days
    if room_nights_available <= 0:
        return 0.0
    return round(room_nights_sold / room_nights_available, 4)


# Gia phong binh quan/dem (Average Daily Rate) = doanh thu phong / so dem-phong da ban.
def _compute_adr(room_revenue: float, room_nights_sold: int) -> float:
    if room_nights_sold <= 0:
        return 0.0
    return round(room_revenue / room_nights_sold, 2)


# Tong hop cac chi so cua 1 khoang ngay - dung chung cho ca ky hien tai lan ky
# truoc (tranh viet lai logic 2 lan).
def _summarize_period(db: Session, hotel_id: int, from_date: date, to_date: date) -> dict:
    payments = list_completed_payments_in_range(db, hotel_id, from_date, to_date)
    room_revenue = sum(room_price - discount for _, room_price, _, discount in payments)
    service_revenue = sum(service_price for _, _, service_price, _ in payments)
    revenue = room_revenue + service_revenue

    room_nights_sold = _compute_room_nights_sold(db, hotel_id, from_date, to_date)
    occupancy_rate = _compute_occupancy_rate(db, hotel_id, from_date, to_date, room_nights_sold)
    total_bookings = count_bookings_created(db, hotel_id, from_date, to_date)
    adr = _compute_adr(room_revenue, room_nights_sold)

    return {
        "revenue": revenue,
        "room_revenue": room_revenue,
        "service_revenue": service_revenue,
        "occupancy_rate": occupancy_rate,
        "total_bookings": total_bookings,
        "adr": adr,
        "payments": payments,
    }


# Gom doanh thu theo tung ngay (theo mui gio nghiep vu) tu danh sach payment da
# fetch san - dien 0 cho ngay khong co doanh thu de bieu do lien mach.
def _build_daily_revenue(payments: list[tuple], from_date: date, to_date: date) -> list[DailyRevenuePoint]:
    tz = business_timezone()
    by_day: dict[date, float] = {}
    for paid_at, room_price, service_price, _ in payments:
        day = paid_at.astimezone(tz).date()
        by_day[day] = by_day.get(day, 0.0) + room_price + service_price

    points = []
    current = from_date
    while current <= to_date:
        points.append(DailyRevenuePoint(date=current, revenue=round(by_day.get(current, 0.0), 2)))
        current += timedelta(days=1)
    return points


# Xu ly Admin xem trang Doanh thu (kinh doanh/tai chinh) cua khach san minh -
# doc lap hoan toan voi domain dashboard (khong dung chung service/repository).
def get_hotel_revenue_dashboard(db: Session, current_user: User, from_date: date | None, to_date: date | None) -> dict:
    hotel = get_operating_admin_hotel(db, current_user)
    from_date, to_date = _default_date_range(from_date, to_date)
    if to_date < from_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu")
    if (to_date - from_date).days + 1 > _MAX_REVENUE_TREND_DAYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chỉ xem tối đa {_MAX_REVENUE_TREND_DAYS} ngày mỗi lần",
        )

    current_period = _summarize_period(db, hotel.id, from_date, to_date)
    daily_revenue = _build_daily_revenue(current_period["payments"], from_date, to_date)

    prev_from, prev_to = _shift_to_previous_period(from_date, to_date)
    previous_period = _summarize_period(db, hotel.id, prev_from, prev_to)

    top_room_types = [
        RevenueByRoomTypeItem(room_type_id=room_type_id, room_type_name=name, revenue=revenue)
        for room_type_id, name, revenue in list_revenue_by_room_type(db, hotel.id, from_date, to_date)
    ]

    return HotelRevenueDashboardResponse(
        hotel_id=hotel.id,
        from_date=from_date,
        to_date=to_date,
        revenue=round(current_period["revenue"], 2),
        revenue_change_pct=_pct_change(current_period["revenue"], previous_period["revenue"]),
        occupancy_rate=current_period["occupancy_rate"],
        occupancy_rate_change_pct=_pct_change(current_period["occupancy_rate"], previous_period["occupancy_rate"]),
        total_bookings=current_period["total_bookings"],
        total_bookings_change_pct=_pct_change(current_period["total_bookings"], previous_period["total_bookings"]),
        adr=current_period["adr"],
        adr_change_pct=_pct_change(current_period["adr"], previous_period["adr"]),
        room_revenue=round(current_period["room_revenue"], 2),
        service_revenue=round(current_period["service_revenue"], 2),
        daily_revenue=daily_revenue,
        top_room_types=top_room_types,
    ).model_dump(mode="json")
