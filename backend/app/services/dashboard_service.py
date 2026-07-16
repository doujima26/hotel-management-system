from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.entities import User
from app.repositories.dashboard_repository import (
    count_bookings_created,
    count_new_users,
    get_revenue,
    get_top_services,
    get_total_room_capacity,
    list_active_booking_rooms_in_range,
)
from app.repositories.hotel_repository import get_hotel_by_id
from app.schemas.dashboard import HotelDashboardResponse, PlatformDashboardResponse, TopServiceItem
from app.services.hotel_service import get_approved_admin_hotel


# Mac dinh khoang ngay la thang hien tai neu khong truyen from_date/to_date.
def _default_date_range(from_date: date | None, to_date: date | None) -> tuple[date, date]:
    if from_date and to_date:
        return from_date, to_date
    today = date.today()
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
