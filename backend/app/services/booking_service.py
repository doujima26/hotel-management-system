import secrets
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.enums import HotelStatus
from app.models.entities import Booking, BookingRoom, User
from app.repositories.booking_repository import (
    create_booking_record,
    create_booking_room_record,
    get_booked_quantity_for_room_type,
    get_booking_by_id,
    list_booking_rooms,
    list_bookings_by_user,
)
from app.repositories.hotel_repository import get_hotel_by_id
from app.repositories.room_repository import get_room_type_by_id_for_update
from app.schemas.bookings import BookingResponse, BookingRoomResponse, CreateBookingRequest


# Sinh ma booking dang BK-YYYYMMDD-xxxxxx.
def _generate_booking_code() -> str:
    today = date.today()
    suffix = f"{secrets.randbelow(1_000_000):06d}"
    return f"BK-{today:%Y%m%d}-{suffix}"


# Chuyen booking va cac dong phong thanh du lieu tra ve.
def serialize_booking(booking: Booking, rooms: list[BookingRoom]) -> dict:
    return BookingResponse(
        id=booking.id,
        booking_code=booking.booking_code,
        hotel_id=booking.hotel_id,
        check_in_date=booking.check_in_date,
        check_out_date=booking.check_out_date,
        num_guests=booking.num_guests,
        total_room_price=float(booking.total_room_price),
        total_service_price=float(booking.total_service_price),
        discount_amount=float(booking.discount_amount),
        total_amount=float(booking.total_amount),
        status=booking.status,
        special_requests=booking.special_requests,
        rooms=[BookingRoomResponse.model_validate(room) for room in rooms],
    ).model_dump(mode="json")


# Xu ly tao booking moi: kiem tra trung lich, snapshot gia, chua ap dung khuyen mai.
def create_booking(db: Session, current_user: User, payload: CreateBookingRequest) -> dict:
    if payload.check_out_date <= payload.check_in_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngay tra phong phai sau ngay nhan phong",
        )

    hotel = get_hotel_by_id(db, payload.hotel_id)
    if not hotel or hotel.status != HotelStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khach san khong ton tai hoac chua duoc duyet",
        )

    num_nights = (payload.check_out_date - payload.check_in_date).days

    # Khoa tung room_type va kiem tra phong trong truoc khi tao booking, tranh dat trung phong.
    booking_room_plans = []
    total_room_price = 0.0
    for item in payload.rooms:
        room_type = get_room_type_by_id_for_update(db, item.room_type_id)
        if not room_type or room_type.hotel_id != hotel.id or not room_type.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Loai phong {item.room_type_id} khong thuoc khach san nay",
            )

        booked = get_booked_quantity_for_room_type(db, item.room_type_id, payload.check_in_date, payload.check_out_date)
        available = room_type.total_rooms - booked
        if item.quantity > available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Loai phong {room_type.name} chi con {available} phong trong",
            )

        price_per_night = float(room_type.base_price)
        subtotal = price_per_night * item.quantity * num_nights
        total_room_price += subtotal
        booking_room_plans.append(
            {
                "room_type_id": room_type.id,
                "quantity": item.quantity,
                "price_per_night": price_per_night,
                "num_nights": num_nights,
                "subtotal": subtotal,
            }
        )

    # Chua ap dung khuyen mai o buoc nay, tong tien bang tong tien phong.
    total_amount = total_room_price

    try:
        booking = create_booking_record(
            db,
            user_id=current_user.id,
            hotel_id=hotel.id,
            booking_code=_generate_booking_code(),
            check_in_date=payload.check_in_date,
            check_out_date=payload.check_out_date,
            num_guests=payload.num_guests,
            total_room_price=total_room_price,
            total_amount=total_amount,
            special_requests=payload.special_requests,
        )

        rooms = [create_booking_room_record(db, booking_id=booking.id, **plan) for plan in booking_room_plans]

        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Khong the tao booking, vui long thu lai",
        ) from exc

    db.refresh(booking)
    return serialize_booking(booking, rooms)


# Xu ly lay danh sach booking cua nguoi dung hien tai.
def list_my_bookings(db: Session, current_user: User) -> list[dict]:
    bookings = list_bookings_by_user(db, current_user.id)
    return [serialize_booking(booking, list_booking_rooms(db, booking.id)) for booking in bookings]


# Xu ly lay chi tiet 1 booking, chi cho chinh chu xem.
def get_booking_detail(db: Session, current_user: User, booking_id: int) -> dict:
    booking = get_booking_by_id(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking khong ton tai",
        )
    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc xem booking cua minh",
        )

    rooms = list_booking_rooms(db, booking.id)
    return serialize_booking(booking, rooms)
