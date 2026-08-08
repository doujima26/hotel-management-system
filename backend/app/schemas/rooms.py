from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.enums import AmenityScope, DiscountType, PricingRecurrence, RoomStatus


# Schema du lieu dau vao cho tao loai phong.
class CreateRoomTypeRequest(BaseModel):
    hotel_id: int = Field(gt=0)
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    base_price: float = Field(gt=0)
    max_guests: int = Field(gt=0)
    area_sqm: float | None = Field(default=None, gt=0)
    bed_type: str | None = Field(default=None, max_length=100)
    bed_count: int | None = Field(default=None, ge=1, le=10)
    total_rooms: int = Field(gt=0)


# Schema du lieu dau vao cho sua loai phong (tat ca field tuy chon).
class UpdateRoomTypeRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    base_price: float | None = Field(default=None, gt=0)
    max_guests: int | None = Field(default=None, gt=0)
    area_sqm: float | None = Field(default=None, gt=0)
    bed_type: str | None = Field(default=None, max_length=100)
    bed_count: int | None = Field(default=None, ge=1, le=10)
    total_rooms: int | None = Field(default=None, gt=0)
    is_active: bool | None = None


# Schema du lieu dau vao cho tao phong vat ly. Bat buoc nhap tang - moi phong
# vat ly thuc te luon co 1 tang xac dinh, de trong se lam so do phong mat tac
# dung dinh vi (nhom "Chua gan tang").
class CreateRoomRequest(BaseModel):
    room_type_id: int = Field(gt=0)
    room_number: str = Field(min_length=1, max_length=20)
    floor: int


# Schema du lieu dau vao cho sua phong vat ly (tat ca field tuy chon).
# Khong cho sua "status" qua day - trang thai phong quan ly rieng qua luong
# check-in/check-out (co ghi room_status_logs), tranh bo qua audit trail.
class UpdateRoomRequest(BaseModel):
    room_number: str | None = Field(default=None, min_length=1, max_length=20)
    floor: int | None = None
    is_active: bool | None = None


# Schema du lieu dau vao cho tao tien nghi (Super Admin tao trong danh muc chung).
class CreateAmenityRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    scope: AmenityScope
    category_id: int | None = Field(default=None, gt=0)


# Schema du lieu dau vao cho sua tien nghi (tat ca field tuy chon).
class UpdateAmenityRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    category_id: int | None = Field(default=None, gt=0)


# Schema du lieu dau vao cho tao danh muc con cua tien nghi.
class CreateAmenityCategoryRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    icon: str | None = Field(default=None, max_length=100)


# Schema du lieu dau vao cho sua danh muc con cua tien nghi.
class UpdateAmenityCategoryRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    icon: str | None = Field(default=None, max_length=100)


# Schema du lieu tra ve 1 danh muc con cua tien nghi.
class AmenityCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    icon: str | None = None


# Schema du lieu tra ve sau khi xoa danh muc con cua tien nghi.
class DeleteAmenityCategoryResponse(BaseModel):
    id: int


# Schema du lieu tra ve sau khi xoa loai phong.
class DeleteRoomTypeResponse(BaseModel):
    id: int


# Schema du lieu tra ve sau khi xoa phong vat ly.
class DeleteRoomResponse(BaseModel):
    id: int


# Schema du lieu tra ve loai phong. Co bed_type/area_sqm de trang quan ly hien
# va sua duoc 2 thong tin nay - truoc day chi trang dat phong cong khai doc
# chung nen ben quan ly khong co cach nao xem lai gia tri da nhap.
class RoomTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hotel_id: int
    name: str
    base_price: float
    max_guests: int
    bed_type: str | None = None
    bed_count: int | None = None
    area_sqm: float | None = None
    total_rooms: int
    is_active: bool


# Schema du lieu tra ve phong vat ly.
class RoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_type_id: int
    room_number: str
    floor: int | None = None
    status: RoomStatus
    is_active: bool


# Schema danh sach phong vat ly kem thong tin so luong.
class RoomListResponse(BaseModel):
    items: list[RoomResponse]
    current_rooms: int
    max_rooms: int
    remaining_rooms: int


# Schema du lieu tra ve tien nghi. category van la CHUOI ten danh muc (lay qua
# quan he) de khong pha vo cac noi dang tieu thu san, category_id la field them
# moi cho form chon danh muc. Tien nghi khong con icon rieng - icon thuoc ve
# danh muc, tra kem qua category_icon de FE khong phai goi them API danh muc.
class AmenityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scope: AmenityScope
    name: str
    category_id: int | None = None
    category: str | None = None
    category_icon: str | None = None

    # Dung tu ORM Amenity - phai qua ham nay thay vi model_validate() vi
    # Amenity.category la QUAN HE (doi tuong AmenityCategory) chu khong phai
    # chuoi, can lay .name/.icon ra. Dat o day de moi service dung chung 1
    # nguon, tranh import vong giua room_service va hotel_service.
    @classmethod
    def from_amenity(cls, amenity) -> "AmenityResponse":
        return cls(
            id=amenity.id,
            scope=amenity.scope,
            name=amenity.name,
            category_id=amenity.category_id,
            category=amenity.category.name if amenity.category else None,
            category_icon=amenity.category.icon if amenity.category else None,
        )


# Schema du lieu tra ve sau khi gan/go tien nghi khoi loai phong.
class RoomTypeAmenityLinkResponse(BaseModel):
    room_type_id: int
    amenity_id: int


# Schema du lieu tra ve sau khi gan/go tien nghi khoi khach san.
class HotelAmenityLinkResponse(BaseModel):
    hotel_id: int
    amenity_id: int


# Schema du lieu tra ve sau khi xoa tien nghi.
class DeleteAmenityResponse(BaseModel):
    id: int


# Schema tinh trang trong cua mot loai phong theo khoang ngay.
# Schema 1 tien nghi cua loai phong (kem nhom de gom theo muc o modal chi tiet).
class RoomTypeAmenityItem(BaseModel):
    name: str
    category: str | None = None


class RoomTypeAvailabilityResponse(BaseModel):
    room_type_id: int
    name: str
    description: str | None = None
    base_price: float
    max_guests: int
    bed_type: str | None = None
    bed_count: int | None = None
    area_sqm: float | None = None
    total_rooms: int
    available_rooms: int
    images: list[str] = []
    amenities: list[RoomTypeAmenityItem] = []


# Schema ket qua tra cuu phong trong cua mot khach san theo khoang ngay.
class RoomAvailabilityResponse(BaseModel):
    hotel_id: int
    check_in: date
    check_out: date
    items: list[RoomTypeAvailabilityResponse]


# Schema du lieu dau vao cho them anh loai phong.
class CreateRoomTypeImageRequest(BaseModel):
    image_url: str = Field(min_length=1, max_length=2048)
    is_primary: bool = False


# Schema du lieu tra ve anh loai phong.
class RoomTypeImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_type_id: int
    image_url: str
    is_primary: bool
    sort_order: int


# Schema du lieu tra ve sau khi xoa anh loai phong.
class DeleteRoomTypeImageResponse(BaseModel):
    id: int


# Schema 1 o trong lich ton phong (1 ngay cua 1 loai phong).
class RoomCalendarDayItem(BaseModel):
    date: date
    booked_rooms: int
    blocked_rooms: int = 0
    available_rooms: int


# Schema 1 hang trong lich ton phong (1 loai phong, trai theo cac ngay).
class RoomCalendarRowItem(BaseModel):
    room_type_id: int
    name: str
    total_rooms: int
    days: list[RoomCalendarDayItem]


# Schema lich ton phong: truc ngay (cot) x loai phong (hang).
class RoomCalendarResponse(BaseModel):
    hotel_id: int
    from_date: date
    to_date: date
    dates: list[date]
    items: list[RoomCalendarRowItem]


# Schema du lieu dau vao cho sua tay gia 1 ngay cu the.
class SetRoomTypeRateRequest(BaseModel):
    price: float = Field(gt=0)


# Schema du lieu tra ve khi xoa gia sua tay hang loat trong 1 khoang ngay.
class ClearRoomTypeRatesResponse(BaseModel):
    room_type_id: int
    from_date: date
    to_date: date
    cleared: int


# Schema 1 ngay trong lich gia cua 1 loai phong. source cho biet gia ngay do
# den tu dau: manual la gia sua tay, rule la quy tac gia theo mua, base la
# base_price cua loai phong.
class RoomTypeRateDayItem(BaseModel):
    date: date
    override_price: float | None = None
    effective_price: float
    source: str = "base"
    rule_id: int | None = None
    rule_name: str | None = None


# Schema lich gia cua 1 loai phong theo khoang ngay.
class RoomTypeRateCalendarResponse(BaseModel):
    room_type_id: int
    from_date: date
    to_date: date
    days: list[RoomTypeRateDayItem]


# Kiem tra danh sach thu trong tuan: khong rong, khong trung, moi gia tri nam
# trong 0 (chu nhat) den 6 (thu bay).
def _validate_weekdays(value: list[int] | None) -> list[int] | None:
    if value is None:
        return None
    if not value:
        raise ValueError("Danh sách thứ trong tuần không được để rỗng")
    if len(set(value)) != len(value):
        raise ValueError("Danh sách thứ trong tuần bị trùng giá trị")
    if any(item < 0 or item > 6 for item in value):
        raise ValueError("Thứ trong tuần chỉ nhận giá trị từ 0 đến 6")
    return sorted(value)


# Schema du lieu dau vao cho tao quy tac gia theo mua.
class CreatePricingRuleRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    room_type_id: int | None = Field(default=None, gt=0)
    recurrence: PricingRecurrence = PricingRecurrence.ONE_TIME
    start_date: date | None = None
    end_date: date | None = None
    start_month: int | None = Field(default=None, ge=1, le=12)
    start_day: int | None = Field(default=None, ge=1, le=31)
    end_month: int | None = Field(default=None, ge=1, le=12)
    end_day: int | None = Field(default=None, ge=1, le=31)
    weekdays: list[int] | None = None
    adjustment_type: DiscountType
    adjustment_value: float
    priority: int = Field(default=0, ge=0, le=1000)
    is_active: bool = True

    @field_validator("weekdays")
    @classmethod
    def check_weekdays(cls, value: list[int] | None) -> list[int] | None:
        return _validate_weekdays(value)


# Schema du lieu dau vao cho sua quy tac gia theo mua (tat ca field tuy chon).
class UpdatePricingRuleRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    room_type_id: int | None = Field(default=None, gt=0)
    recurrence: PricingRecurrence | None = None
    start_date: date | None = None
    end_date: date | None = None
    start_month: int | None = Field(default=None, ge=1, le=12)
    start_day: int | None = Field(default=None, ge=1, le=31)
    end_month: int | None = Field(default=None, ge=1, le=12)
    end_day: int | None = Field(default=None, ge=1, le=31)
    weekdays: list[int] | None = None
    adjustment_type: DiscountType | None = None
    adjustment_value: float | None = None
    priority: int | None = Field(default=None, ge=0, le=1000)
    is_active: bool | None = None

    @field_validator("weekdays")
    @classmethod
    def check_weekdays(cls, value: list[int] | None) -> list[int] | None:
        return _validate_weekdays(value)


# Schema du lieu tra ve quy tac gia theo mua.
class PricingRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hotel_id: int
    room_type_id: int | None = None
    room_type_name: str | None = None
    name: str
    description: str | None = None
    recurrence: PricingRecurrence
    start_date: date | None = None
    end_date: date | None = None
    start_month: int | None = None
    start_day: int | None = None
    end_month: int | None = None
    end_day: int | None = None
    weekdays: list[int] | None = None
    adjustment_type: DiscountType
    adjustment_value: float
    priority: int
    is_active: bool


# Schema du lieu tra ve khi xoa quy tac gia theo mua.
class DeletePricingRuleResponse(BaseModel):
    id: int


# Schema du lieu dau vao cho tao khoa lich phong vat ly.
class CreateRoomBlockRequest(BaseModel):
    room_id: int = Field(gt=0)
    start_date: date
    end_date: date
    reason: str | None = Field(default=None, max_length=500)


# Schema du lieu tra ve khoa lich phong.
class RoomBlockResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_id: int
    start_date: date
    end_date: date
    reason: str | None = None
    created_by: int
    created_at: datetime


# Schema du lieu tra ve sau khi xoa khoa lich phong.
class DeleteRoomBlockResponse(BaseModel):
    id: int
