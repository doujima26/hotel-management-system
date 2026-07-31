from datetime import time

from pydantic import BaseModel, Field

from app.core.enums import HotelStatus, PaymentMethod
from app.schemas.auth import UserPublicResponse


# Schema du lieu dau vao cho khoa mo tai khoan nguoi dung.
class SetUserActiveRequest(BaseModel):
    is_active: bool


# Schema du lieu dau vao cho super admin duyet khach san.
class ReviewHotelRequest(BaseModel):
    action: str = Field(pattern="^(approved|rejected|suspended)$")
    rejection_reason: str | None = None


# Schema du lieu tra ve sau khi khoa mo tai khoan nguoi dung.
# Luu y: email dung str (khong dung EmailStr), ly do xem chu thich o UserPublicResponse.
class SetUserActiveResponse(BaseModel):
    user_id: int
    email: str
    is_active: bool


# Schema du lieu tra ve sau khi duyet tu choi hoac tam dung khach san.
class ReviewHotelResponse(BaseModel):
    id: int
    status: HotelStatus
    rejection_reason: str | None = None


# Schema 1 thanh pho kem so khach san dang co - dung cho bo loc khu vuc.
class CityCountItem(BaseModel):
    city: str
    count: int


# Schema 1 dong trong danh sach khach san cua Super Admin: thong tin khach san
# kem cac chi so suc khoe de nhin phat biet khach san dang the nao ma khong phai
# mo tung ho so.
#
# revenue_30d/bookings_30d/cancel_rate_30d deu tinh trong 30 ngay gan nhat.
# cancel_rate_30d la None khi ky do khong co don nao - khac han voi 0% (co don
# va khong don nao bi huy).
class AdminHotelListItem(BaseModel):
    id: int
    name: str
    address: str
    city: str
    district: str | None = None
    phone: str | None = None
    email: str | None = None
    star_rating: int | None = None
    status: HotelStatus
    rejection_reason: str | None = None
    avg_rating: float
    total_reviews: int
    room_type_count: int
    room_count: int
    bookings_30d: int
    revenue_30d: float
    cancel_rate_30d: float | None = None


# Schema danh sach khach san cho super admin duyet, kem phan trang.
#
# status_counts cho biet so khach san o TUNG trang thai tren toan nen tang (khong
# phu thuoc bo loc dang chon) - de hang the trang thai o dau trang vua lam tong
# quan vua lam bo loc.
class AdminHotelListResponse(BaseModel):
    items: list[AdminHotelListItem]
    status_counts: dict[str, int] = {}
    # Cac thanh pho thuc su dang co khach san, dung de dung bo loc khu vuc.
    cities: list[CityCountItem] = []
    page: int
    page_size: int
    total: int
    total_pages: int


# Schema danh sach nguoi dung cho super admin quan ly, kem phan trang.
class AdminUserListResponse(BaseModel):
    items: list[UserPublicResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


# Schema chu so huu khach san - hien ten that thay vi chi co owner_id, de Super
# Admin biet minh dang duyet khach san cua ai.
class AdminHotelOwnerItem(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str | None = None
    is_active: bool


# Schema 1 loai phong trong ho so tham dinh.
#
# total_rooms la so phong CHU KHACH SAN KHAI BAO, created_rooms la so phong vat
# ly thuc su da tao. Hai so lech nhau la dau hieu khach san khai bao xong nhung
# chua nhap lieu day du - can nhin thay khi tham dinh.
class AdminHotelRoomTypeItem(BaseModel):
    id: int
    name: str
    base_price: float
    max_guests: int
    bed_type: str | None = None
    bed_count: int | None = None
    area_sqm: float | None = None
    total_rooms: int
    created_rooms: int
    image_count: int
    amenities: list[str] = []
    is_active: bool


# Schema ho so day du cua 1 khach san cho Super Admin tham dinh truoc khi duyet.
# Gom du thu can nhin de ra quyet dinh: chu so huu, anh, tien nghi, dich vu,
# toan bo loai phong - thay vi chi ten va dia chi nhu danh sach rut gon.
class AdminHotelDetailResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    address: str
    city: str
    district: str | None = None
    phone: str | None = None
    email: str | None = None
    star_rating: int | None = None
    status: HotelStatus
    rejection_reason: str | None = None
    avg_rating: float
    total_reviews: int
    check_in_time: time
    check_out_time: time
    cancellation_policy: str | None = None
    children_policy: str | None = None
    pets_allowed: bool
    payment_methods: list[PaymentMethod] = []
    owner: AdminHotelOwnerItem
    images: list[str] = []
    amenities: list[str] = []
    services: list[str] = []
    room_types: list[AdminHotelRoomTypeItem] = []
