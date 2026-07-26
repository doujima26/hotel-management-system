import secrets
from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.enums import UserRole
from app.core.security import hash_password
from app.models.entities import StaffMember, StaffSchedule, User
from app.repositories.staff_repository import (
    create_staff_member_record,
    create_staff_schedule_record,
    delete_staff_schedule_record,
    get_staff_member_by_id,
    get_staff_member_by_user_id,
    get_staff_schedule_by_id,
    list_schedules_with_staff_by_hotel,
    list_staff_schedules,
    list_staff_with_user_by_hotel,
    save_staff_member,
    save_staff_schedule,
)
from app.repositories.user_repository import create_user, get_user_by_email, get_user_by_id
from app.schemas.staff import (
    CreateStaffRequest,
    CreateStaffResponse,
    CreateStaffScheduleRequest,
    StaffMemberResponse,
    StaffScheduleResponse,
    UpdateStaffRequest,
    UpdateStaffScheduleRequest,
    StaffScheduleCalendarResponse,
    StaffScheduleCalendarRow,
    StaffScheduleCalendarShift,
)
from app.services.hotel_service import get_approved_admin_hotel


# Sinh mat khau tam thoi (mock) cho tai khoan nhan vien moi tao.
def _generate_temp_password() -> str:
    return secrets.token_urlsafe(9)


# Chuyen StaffMember + User thanh du lieu tra ve.
def _serialize_staff(staff: StaffMember, user: User) -> dict:
    return StaffMemberResponse(
        id=staff.id,
        user_id=staff.user_id,
        hotel_id=staff.hotel_id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        position=staff.position,
        is_active=staff.is_active,
        hired_at=staff.hired_at,
    ).model_dump(mode="json")


# Xu ly Admin tao nhan vien moi: tao tai khoan User (role staff) va gan vao khach
# san minh. Mat khau tam duoc mock tra ve thang trong response, chua gui email
# that (Gmail SMTP that se lam o Phase 8).
def create_staff(db: Session, current_user: User, payload: CreateStaffRequest) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)

    existing_user = get_user_by_email(db, payload.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email da ton tai",
        )

    temp_password = _generate_temp_password()
    user = create_user(
        db,
        email=payload.email,
        password_hash=hash_password(temp_password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=UserRole.STAFF,
        is_active=True,
        is_verified=True,
    )

    staff = create_staff_member_record(
        db,
        user_id=user.id,
        hotel_id=hotel.id,
        position=payload.position,
        hired_at=payload.hired_at,
    )

    data = _serialize_staff(staff, user)
    return CreateStaffResponse(**data, temp_password_mock=temp_password).model_dump(mode="json")


# Xu ly lay danh sach nhan vien cua khach san Admin dang quan ly.
def list_staff(db: Session, current_user: User) -> list[dict]:
    hotel = get_approved_admin_hotel(db, current_user)
    rows = list_staff_with_user_by_hotel(db, hotel.id)
    return [_serialize_staff(staff, user) for staff, user in rows]


# Xu ly Admin cap nhat chuc vu/trang thai lam viec/ngay vao lam cua nhan vien.
def update_staff(db: Session, current_user: User, staff_id: int, payload: UpdateStaffRequest) -> dict:
    hotel = get_approved_admin_hotel(db, current_user)
    staff = get_staff_member_by_id(db, staff_id)
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nhan vien khong ton tai",
        )
    if staff.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly nhan vien cua khach san minh",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(staff, field, value)

    staff = save_staff_member(db, staff)
    user = get_user_by_id(db, staff.user_id)
    return _serialize_staff(staff, user)


# Chuyen ca lam viec thanh du lieu tra ve.
def _serialize_schedule(schedule: StaffSchedule) -> dict:
    return StaffScheduleResponse.model_validate(schedule).model_dump(mode="json")


# Kiem tra nhan vien ton tai va thuoc khach san cua Admin hien tai.
def _get_owned_staff_member(db: Session, current_user: User, staff_id: int) -> StaffMember:
    hotel = get_approved_admin_hotel(db, current_user)
    staff = get_staff_member_by_id(db, staff_id)
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nhan vien khong ton tai",
        )
    if staff.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly nhan vien cua khach san minh",
        )
    return staff


# Kiem tra ca lam viec ton tai va thuoc nhan vien cua khach san Admin hien tai.
def _get_owned_schedule(db: Session, current_user: User, schedule_id: int) -> StaffSchedule:
    hotel = get_approved_admin_hotel(db, current_user)
    schedule = get_staff_schedule_by_id(db, schedule_id)
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ca lam viec khong ton tai",
        )
    staff = get_staff_member_by_id(db, schedule.staff_id)
    if not staff or staff.hotel_id != hotel.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc quan ly ca lam viec cua khach san minh",
        )
    return schedule


# Xu ly Admin xep ca lam viec moi cho 1 nhan vien cua khach san minh.
def create_staff_schedule(db: Session, current_user: User, staff_id: int, payload: CreateStaffScheduleRequest) -> dict:
    staff = _get_owned_staff_member(db, current_user, staff_id)
    if payload.end_time <= payload.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gio ket thuc ca phai sau gio bat dau",
        )

    schedule = create_staff_schedule_record(
        db,
        staff_id=staff.id,
        shift_date=payload.shift_date,
        shift_type=payload.shift_type,
        start_time=payload.start_time,
        end_time=payload.end_time,
        notes=payload.notes,
    )
    return _serialize_schedule(schedule)


# Xu ly Admin xem lich lam viec cua 1 nhan vien cu the.
def list_staff_schedules_for_admin(db: Session, current_user: User, staff_id: int) -> list[dict]:
    staff = _get_owned_staff_member(db, current_user, staff_id)
    schedules = list_staff_schedules(db, staff.id)
    return [_serialize_schedule(item) for item in schedules]


# Xu ly Staff xem lich lam viec cua chinh minh.
def list_my_schedules(db: Session, current_user: User) -> list[dict]:
    staff = get_staff_member_by_user_id(db, current_user.id)
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tai khoan chua duoc gan lam nhan vien cua khach san nao",
        )
    schedules = list_staff_schedules(db, staff.id)
    return [_serialize_schedule(item) for item in schedules]


# Xu ly Admin cap nhat 1 ca lam viec.
def update_staff_schedule(db: Session, current_user: User, schedule_id: int, payload: UpdateStaffScheduleRequest) -> dict:
    schedule = _get_owned_schedule(db, current_user, schedule_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schedule, field, value)

    if schedule.end_time <= schedule.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gio ket thuc ca phai sau gio bat dau",
        )

    schedule = save_staff_schedule(db, schedule)
    return _serialize_schedule(schedule)


# Xu ly Admin xoa 1 ca lam viec da xep nham.
def delete_staff_schedule(db: Session, current_user: User, schedule_id: int) -> dict:
    schedule = _get_owned_schedule(db, current_user, schedule_id)
    delete_staff_schedule_record(db, schedule)
    return {"id": schedule_id}


# So ngay toi da cho 1 lan xem khung lich ca (tranh tra ve qua nhieu du lieu).
_MAX_SCHEDULE_CALENDAR_DAYS = 31


# Xu ly dung khung lich ca lam viec cua ca khach san: truc ngay x nhan vien.
# Nhan vien chua co ca nao trong khoang van hien (hang rong) de Admin thay ai
# dang chua duoc xep lich.
def get_staff_schedule_calendar(db: Session, current_user: User, from_date: date, to_date: date) -> dict:
    if to_date < from_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngay ket thuc phai lon hon hoac bang ngay bat dau",
        )
    num_days = (to_date - from_date).days + 1
    if num_days > _MAX_SCHEDULE_CALENDAR_DAYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chi xem toi da {_MAX_SCHEDULE_CALENDAR_DAYS} ngay moi lan",
        )

    hotel = get_approved_admin_hotel(db, current_user)
    staff_rows = list_staff_with_user_by_hotel(db, hotel.id)
    schedules = list_schedules_with_staff_by_hotel(db, hotel.id, from_date, to_date)

    shifts_by_staff: dict[int, list[StaffScheduleCalendarShift]] = {}
    for schedule, staff, _user in schedules:
        shifts_by_staff.setdefault(staff.id, []).append(
            StaffScheduleCalendarShift(
                schedule_id=schedule.id,
                shift_date=schedule.shift_date,
                shift_type=schedule.shift_type,
                start_time=schedule.start_time,
                end_time=schedule.end_time,
                notes=schedule.notes,
            )
        )

    items = [
        StaffScheduleCalendarRow(
            staff_id=staff.id,
            full_name=user.full_name,
            position=staff.position,
            is_active=staff.is_active,
            shifts=shifts_by_staff.get(staff.id, []),
        )
        for staff, user in staff_rows
    ]

    return StaffScheduleCalendarResponse(
        from_date=from_date,
        to_date=to_date,
        dates=[from_date + timedelta(days=offset) for offset in range(num_days)],
        items=items,
    ).model_dump(mode="json")
