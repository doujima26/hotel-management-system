from datetime import date, datetime, time

from pydantic import BaseModel

from app.core.enums import ShiftType


# Schema 1 dich vu trong bang xep hang dich vu dung nhieu nhat.
class TopServiceItem(BaseModel):
    service_id: int
    service_name: str
    total_quantity: int
    total_revenue: float


# Schema du lieu tra ve dashboard cua 1 khach san.
class HotelDashboardResponse(BaseModel):
    hotel_id: int
    from_date: date
    to_date: date
    revenue: float
    occupancy_rate: float
    top_services: list[TopServiceItem]


# Schema du lieu tra ve dashboard tong quan toan nen tang.
class PlatformDashboardResponse(BaseModel):
    from_date: date
    to_date: date
    total_revenue: float
    total_bookings: int
    new_users_count: int
    hotel: HotelDashboardResponse | None = None


# Schema tong hop so phong theo tung trang thai (kem so phong dang bi khoa lich hom nay).
class RoomStatusOverview(BaseModel):
    available: int
    occupied: int
    cleaning: int
    maintenance: int
    blocked_today: int


# Schema 1 ca lam viec cua 1 nhan vien trong ngay (dung cho khoi lich lam viec hom nay).
class StaffShiftItem(BaseModel):
    staff_id: int
    staff_name: str
    staff_position: str
    shift_type: ShiftType
    start_time: time
    end_time: time


# Schema 1 danh gia gan day (dung cho khoi danh gia moi tren Dashboard).
class RecentReviewItem(BaseModel):
    id: int
    reviewer_name: str
    rating: int
    comment: str | None = None
    created_at: datetime


# Schema 1 diem trong bieu do doanh thu + hieu suat (ty le lap day) 7 ngay gan nhat.
class DailyTrendPoint(BaseModel):
    date: date
    revenue: float
    occupancy_rate: float


# Schema du lieu tra ve Dashboard tong quan van hanh cua 1 khach san (Admin) -
# luon la anh chup "hom nay", khac han HotelDashboardResponse (theo khoang ngay,
# thien ve tai chinh - da chuyen sang trang Doanh thu rieng).
class HotelOperationsOverviewResponse(BaseModel):
    hotel_id: int
    date: date
    pending_bookings: int
    overdue_confirmed_bookings: int
    arrivals_today: int
    departures_today: int
    in_house: int
    room_status: RoomStatusOverview
    daily_trend: list[DailyTrendPoint]
    staff_shifts_today: list[StaffShiftItem]
    recent_reviews: list[RecentReviewItem]
