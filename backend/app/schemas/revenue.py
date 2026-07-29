from datetime import date

from pydantic import BaseModel


# Schema 1 diem doanh thu theo ngay (dung ve bieu do xu huong).
class DailyRevenuePoint(BaseModel):
    date: date
    revenue: float


# Schema 1 dong trong bang xep hang loai phong theo doanh thu.
class RevenueByRoomTypeItem(BaseModel):
    room_type_id: int
    room_type_name: str
    revenue: float


# Schema du lieu tra ve trang Doanh thu cua 1 khach san.
class HotelRevenueDashboardResponse(BaseModel):
    hotel_id: int
    from_date: date
    to_date: date
    revenue: float
    revenue_change_pct: float | None = None
    occupancy_rate: float
    occupancy_rate_change_pct: float | None = None
    total_bookings: int
    total_bookings_change_pct: float | None = None
    adr: float
    adr_change_pct: float | None = None
    room_revenue: float
    service_revenue: float
    daily_revenue: list[DailyRevenuePoint]
    top_room_types: list[RevenueByRoomTypeItem]
