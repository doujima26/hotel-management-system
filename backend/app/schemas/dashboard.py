from datetime import date

from pydantic import BaseModel


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
