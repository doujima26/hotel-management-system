from datetime import date, datetime, time

from pydantic import BaseModel, Field

from app.core.enums import HotelStatus, PaymentMethod, UserRole


# Schema du lieu dau vao cho khoa mo tai khoan nguoi dung.
class SetUserActiveRequest(BaseModel):
    is_active: bool


# Schema du lieu dau vao cho super admin duyet khach san, reason dung chung cho
# ca tu choi lan tam dung.
class ReviewHotelRequest(BaseModel):
    action: str = Field(pattern="^(approved|rejected|suspended)$")
    reason: str | None = None


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


# Schema 1 dong nhat ky hanh dong quan tri.
#
# target_label la ten khach san / email nguoi dung GHI LAI TAI THOI DIEM hanh
# dong, khong phai ten hien tai - nhat ky kiem toan phai phan anh dung luc do.
class AdminActionLogItem(BaseModel):
    id: int
    actor_id: int
    actor_name: str
    actor_email: str
    action: str
    target_type: str
    target_id: int
    target_label: str | None = None
    reason: str | None = None
    created_at: datetime


# Schema danh sach nhat ky hanh dong quan tri, kem phan trang.
class AdminActionLogListResponse(BaseModel):
    items: list[AdminActionLogItem]
    page: int
    page_size: int
    total: int
    total_pages: int


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
    # So booking chua tra phong tai thoi diem hien tai.
    outstanding_bookings: int = 0


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


# Schema noi cong tac cua 1 tai khoan.
# role admin la khach san so huu, role staff la khach san dang lam viec.
class AdminUserHotelLink(BaseModel):
    hotel_id: int
    hotel_name: str
    hotel_status: HotelStatus
    city: str
    # Chi co voi tai khoan nhan vien.
    position: str | None = None
    hired_at: date | None = None
    is_working: bool | None = None


# Schema 1 dong trong danh sach nguoi dung cua Super Admin.
class AdminUserListItem(BaseModel):
    id: int
    email: str
    full_name: str
    phone: str | None = None
    avatar_url: str | None = None
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    hotel: AdminUserHotelLink | None = None


# Schema danh sach nguoi dung cho super admin quan ly, kem phan trang.
class AdminUserListResponse(BaseModel):
    items: list[AdminUserListItem]
    role_counts: dict[str, int] = {}
    page: int
    page_size: int
    total: int
    total_pages: int


# Schema so lieu hoat dong cua tai khoan khach hang.
class AdminUserActivity(BaseModel):
    total_bookings: int
    cancelled_bookings: int
    total_paid: float
    total_reviews: int
    last_check_in_date: date | None = None


# Schema ho so day du cua 1 tai khoan cho Super Admin.
class AdminUserDetailResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: str | None = None
    avatar_url: str | None = None
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    hotel: AdminUserHotelLink | None = None
    activity: AdminUserActivity
    # Cac lan tai khoan nay bi khoa hoac mo khoa.
    action_logs: list[AdminActionLogItem] = []


# Schema chu so huu khach san - hien ten that thay vi chi co owner_id, de Super
# Admin biet minh dang duyet khach san cua ai.
class AdminHotelOwnerItem(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str | None = None
    is_active: bool


# Schema 1 tai khoan nhan vien thuoc khach san.
# is_active: nhan vien con lam viec hay da nghi.
# account_active: tai khoan dang nhap con mo hay bi khoa.
class AdminHotelStaffItem(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    phone: str | None = None
    position: str
    hired_at: date | None = None
    is_active: bool
    account_active: bool


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


# Schema ho so day du cua 1 khach san cho Super Admin tham dinh: chu so huu,
# nhan su, anh, tien nghi, dich vu, loai phong va chi so hoat dong 30 ngay.
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
    staff: list[AdminHotelStaffItem] = []
    bookings_30d: int = 0
    revenue_30d: float = 0.0
    cancel_rate_30d: float | None = None
    outstanding_bookings: int = 0
