from sqlalchemy.orm import Session

from app.core.enums import HotelStatus, UserRole
from app.repositories.hotel_repository import list_hotel_records_for_admin
from app.repositories.user_repository import list_user_records
from app.schemas.admin import AdminHotelListResponse, AdminUserListResponse
from app.schemas.auth import UserPublicResponse
from app.schemas.hotels import HotelResponse


# Xu ly lay danh sach khach san cho super admin duyet, loc theo trang thai.
def list_hotels_for_admin(
    db: Session,
    *,
    status_filter: HotelStatus | None,
    page: int,
    page_size: int,
) -> dict:
    hotels, total = list_hotel_records_for_admin(
        db,
        status_filter=status_filter,
        page=page,
        page_size=page_size,
    )
    items = [HotelResponse.model_validate(hotel) for hotel in hotels]
    total_pages = (total + page_size - 1) // page_size if total else 0
    return AdminHotelListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    ).model_dump(mode="json")


# Xu ly lay danh sach nguoi dung cho super admin quan ly, loc theo role/is_active.
def list_users_for_admin(
    db: Session,
    *,
    role_filter: UserRole | None,
    is_active_filter: bool | None,
    page: int,
    page_size: int,
) -> dict:
    users, total = list_user_records(
        db,
        role_filter=role_filter,
        is_active_filter=is_active_filter,
        page=page,
        page_size=page_size,
    )
    items = [UserPublicResponse.model_validate(user) for user in users]
    total_pages = (total + page_size - 1) // page_size if total else 0
    return AdminUserListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    ).model_dump(mode="json")
