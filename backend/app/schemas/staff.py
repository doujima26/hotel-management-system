from datetime import date, time

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.enums import ShiftType


# Schema du lieu dau vao cho Admin tao nhan vien moi.
class CreateStaffRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    position: str = Field(min_length=2, max_length=100)
    hired_at: date | None = None


# Schema du lieu dau vao cho Admin cap nhat nhan vien.
class UpdateStaffRequest(BaseModel):
    position: str | None = Field(default=None, min_length=2, max_length=100)
    is_active: bool | None = None
    hired_at: date | None = None


# Schema du lieu tra ve thong tin nhan vien (ghep tu StaffMember + User).
class StaffMemberResponse(BaseModel):
    id: int
    user_id: int
    hotel_id: int
    email: EmailStr
    full_name: str
    phone: str | None = None
    position: str
    is_active: bool
    hired_at: date | None = None


# Schema du lieu tra ve sau khi tao nhan vien. temp_password_mock chi co gia tri
# khi he thong chua cau hinh SMTP, da gui mail that thi la None.
class CreateStaffResponse(StaffMemberResponse):
    temp_password_mock: str | None = None


# Schema du lieu dau vao cho Admin xep ca lam viec cho nhan vien.
class CreateStaffScheduleRequest(BaseModel):
    shift_date: date
    shift_type: ShiftType
    start_time: time
    end_time: time
    notes: str | None = None


# Schema du lieu dau vao cho Admin cap nhat ca lam viec.
class UpdateStaffScheduleRequest(BaseModel):
    shift_date: date | None = None
    shift_type: ShiftType | None = None
    start_time: time | None = None
    end_time: time | None = None
    notes: str | None = None


# Schema du lieu tra ve 1 ca lam viec.
class StaffScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    staff_id: int
    shift_date: date
    shift_type: ShiftType
    start_time: time
    end_time: time
    notes: str | None = None


# Schema 1 ca lam viec trong khung lich (gan voi 1 nhan vien, 1 ngay).
class StaffScheduleCalendarShift(BaseModel):
    schedule_id: int
    shift_date: date
    shift_type: ShiftType
    start_time: time
    end_time: time
    notes: str | None = None


# Schema 1 hang trong khung lich: 1 nhan vien kem cac ca trong khoang ngay.
class StaffScheduleCalendarRow(BaseModel):
    staff_id: int
    full_name: str
    position: str
    is_active: bool
    shifts: list[StaffScheduleCalendarShift]


# Schema khung lich ca lam viec: truc ngay (cot) x nhan vien (hang).
# viewer_staff_id la id nhan vien cua nguoi dang xem, null neu nguoi xem la Admin.
class StaffScheduleCalendarResponse(BaseModel):
    from_date: date
    to_date: date
    dates: list[date]
    viewer_staff_id: int | None = None
    items: list[StaffScheduleCalendarRow]
