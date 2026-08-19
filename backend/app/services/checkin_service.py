from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.enums import BookingStatus, CheckType, RoomStatus
from app.core.timeutils import business_today
from app.models.entities import User
from app.repositories.booking_repository import (
    get_booking_by_id_for_update,
    list_booking_room_units,
    list_booking_rooms,
)
from app.repositories.checkin_repository import (
    create_check_in_out_record,
    create_room_status_log,
    get_active_booking_for_room,
)
from app.repositories.room_repository import (
    get_active_room_blocks_for_hotel,
    get_room_blocks_for_stay,
    get_room_by_id_for_update,
    get_room_by_id_locking_room_type,
    list_rooms_with_type_by_hotel,
)
from app.repositories.staff_repository import get_staff_member_by_user_id
from app.schemas.checkin import CheckInRequest, CheckOutRequest, RoomStatusItemResponse, SetRoomMaintenanceRequest
from app.schemas.rooms import RoomResponse
from app.services.booking_service import serialize_booking
from app.services.hotel_service import get_operational_hotel


# Xu ly lay so do phong cua khach san Admin/Staff dang van hanh.
def get_room_status_board(db: Session, current_user: User) -> list[dict]:
    hotel = get_operational_hotel(db, current_user)
    rows = list_rooms_with_type_by_hotel(db, hotel.id)
    active_blocks = get_active_room_blocks_for_hotel(db, hotel.id, business_today())

    items = []
    for room, room_type in rows:
        current_booking_code = None
        expected_check_out = None
        if room.status == RoomStatus.OCCUPIED:
            booking = get_active_booking_for_room(db, room.id)
            if booking:
                current_booking_code = booking.booking_code
                expected_check_out = booking.check_out_date

        block = active_blocks.get(room.id)

        items.append(
            RoomStatusItemResponse(
                room_id=room.id,
                room_number=room.room_number,
                floor=room.floor,
                room_type_id=room_type.id,
                room_type_name=room_type.name,
                status=room.status,
                current_booking_code=current_booking_code,
                expected_check_out=expected_check_out,
                is_blocked=block is not None,
                block_reason=block.reason if block else None,
            )
        )
    return [item.model_dump(mode="json") for item in items]


# Kiem tra tai khoan dang dang nhap la nhan vien cua 1 khach san, tra ve StaffMember.
def _require_staff(db: Session, current_user: User):
    staff = get_staff_member_by_user_id(db, current_user.id)
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản chưa được gán làm nhân viên của khách sạn nào",
        )
    return staff


# Xu ly Staff check-in 1 booking: gan phong vat ly cu the cho tung suat phong
# da dat (booking_room_units), chuyen phong sang occupied, booking sang checked_in.
def check_in_booking(db: Session, current_user: User, booking_id: int, payload: CheckInRequest) -> dict:
    staff = _require_staff(db, current_user)

    booking = get_booking_by_id_for_update(db, booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Đơn đặt phòng không tồn tại")
    if booking.hotel_id != staff.hotel_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn chỉ được check-in đơn đặt phòng của khách sạn mình")
    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Đơn đặt phòng phải ở trạng thái đã xác nhận mới được nhận phòng")
    # Chan check-in truoc ngay nhan phong. Check-in tre van duoc phep.
    if business_today() < booking.check_in_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chưa đến ngày nhận phòng, không thể check-in trước hạn",
        )

    booking_rooms = {br.id: br for br in list_booking_rooms(db, booking.id)}
    units_by_booking_room: dict[int, list] = {}
    for unit in list_booking_room_units(db, booking.id):
        units_by_booking_room.setdefault(unit.booking_room_id, []).append(unit)

    covered_ids = {item.booking_room_id for item in payload.assignments}
    if covered_ids != set(booking_rooms.keys()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phải gán phòng cho đủ tất cả các dòng đã đặt trong đơn",
        )

    assigned_room_ids: set[int] = set()
    for item in payload.assignments:
        booking_room = booking_rooms[item.booking_room_id]
        unassigned_units = [u for u in units_by_booking_room.get(booking_room.id, []) if u.room_id is None]
        if len(item.room_ids) != len(unassigned_units):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Dòng booking_room {booking_room.id} cần gán đủ {len(unassigned_units)} phòng",
            )
        if len(set(item.room_ids)) != len(item.room_ids):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Danh sách phòng bị trùng lặp")

        for unit, room_id in zip(unassigned_units, item.room_ids):
            if room_id in assigned_room_ids:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể gán trùng 1 phòng cho nhiều suất")

            room = get_room_by_id_for_update(db, room_id)
            if not room or room.room_type_id != booking_room.room_type_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Phòng {room_id} không thuộc đúng loại phòng đã đặt",
                )
            if not room.is_active or room.status != RoomStatus.AVAILABLE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Phòng {room.room_number} hiện không sẵn sàng để nhận phòng",
                )
            overlapping_blocks = get_room_blocks_for_stay(db, room.id, booking.check_in_date, booking.check_out_date)
            if overlapping_blocks:
                reason = overlapping_blocks[0].reason or "khong ro ly do"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Phòng {room.room_number} đang bị khóa lịch ({reason}) trong khoảng ngày này",
                )
            assigned_room_ids.add(room_id)

            unit.room_id = room.id
            db.add(unit)

            previous_status = room.status.value
            room.status = RoomStatus.OCCUPIED
            db.add(room)
            create_room_status_log(
                db,
                room_id=room.id,
                previous_status=previous_status,
                new_status=room.status.value,
                changed_by=current_user.id,
                reason=f"Check-in booking {booking.booking_code}",
            )

    booking.status = BookingStatus.CHECKED_IN
    db.add(booking)
    create_check_in_out_record(db, booking_id=booking.id, staff_id=staff.id, check_type=CheckType.CHECK_IN, notes=payload.notes)

    db.commit()
    db.refresh(booking)

    rooms = list_booking_rooms(db, booking.id)
    return serialize_booking(db, booking, rooms)


# Xu ly Staff check-out 1 booking: phong da gan chuyen OCCUPIED -> CLEANING,
# booking sang checked_out.
def check_out_booking(db: Session, current_user: User, booking_id: int, payload: CheckOutRequest) -> dict:
    staff = _require_staff(db, current_user)

    booking = get_booking_by_id_for_update(db, booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Đơn đặt phòng không tồn tại")
    if booking.hotel_id != staff.hotel_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn chỉ được check-out đơn đặt phòng của khách sạn mình")
    if booking.status != BookingStatus.CHECKED_IN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Đơn đặt phòng phải đang ở trạng thái đã nhận phòng mới được trả phòng")

    units = list_booking_room_units(db, booking.id)
    for unit in units:
        if unit.room_id is None:
            continue
        room = get_room_by_id_for_update(db, unit.room_id)
        previous_status = room.status.value
        # Chuyen sang CLEANING, ve AVAILABLE khi Staff bam da don xong.
        room.status = RoomStatus.CLEANING
        db.add(room)
        create_room_status_log(
            db,
            room_id=room.id,
            previous_status=previous_status,
            new_status=room.status.value,
            changed_by=current_user.id,
            reason=f"Check-out booking {booking.booking_code}",
        )

    booking.status = BookingStatus.CHECKED_OUT
    db.add(booking)
    create_check_in_out_record(db, booking_id=booking.id, staff_id=staff.id, check_type=CheckType.CHECK_OUT, notes=payload.notes)

    db.commit()
    db.refresh(booking)

    rooms = list_booking_rooms(db, booking.id)
    return serialize_booking(db, booking, rooms)


# Lay phong vat ly va kiem tra thuoc dung khach san cua staff hien tai.
def _get_staff_room(db: Session, staff, room_id: int):
    room = get_room_by_id_for_update(db, room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phòng không tồn tại")
    if room.hotel_id != staff.hotel_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn chỉ được thao tác phòng của khách sạn mình")
    return room


# Lay phong vat ly va kiem tra thuoc dung khach san dang van hanh, dung chung
# cho Admin va Staff. Khoa ca loai phong cha.
def _get_operational_room(db: Session, current_user: User, room_id: int):
    hotel = get_operational_hotel(db, current_user)
    room = get_room_by_id_locking_room_type(db, room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phòng không tồn tại")
    if room.hotel_id != hotel.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn chỉ được thao tác phòng của khách sạn mình")
    return room


# Ghi log doi trang thai phong roi commit, tra ve du lieu phong moi nhat.
def _apply_room_status_change(db: Session, current_user: User, room, new_status: RoomStatus, reason: str) -> dict:
    previous_status = room.status.value
    room.status = new_status
    db.add(room)
    create_room_status_log(
        db,
        room_id=room.id,
        previous_status=previous_status,
        new_status=new_status.value,
        changed_by=current_user.id,
        reason=reason,
    )
    db.commit()
    db.refresh(room)
    return RoomResponse.model_validate(room).model_dump(mode="json")


# Xu ly Staff danh dau 1 phong da don xong: CLEANING -> AVAILABLE.
def mark_room_cleaned(db: Session, current_user: User, room_id: int) -> dict:
    staff = _require_staff(db, current_user)
    room = _get_staff_room(db, staff, room_id)
    if room.status != RoomStatus.CLEANING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phòng {room.room_number} không ở trạng thái đang dọn, không thể đánh dấu đã dọn xong",
        )
    return _apply_room_status_change(db, current_user, room, RoomStatus.AVAILABLE, "Da don xong")


# Xu ly dat 1 phong vao trang thai bao tri, chi cho tu AVAILABLE hoac CLEANING.
def set_room_maintenance(db: Session, current_user: User, room_id: int, payload: SetRoomMaintenanceRequest) -> dict:
    room = _get_operational_room(db, current_user, room_id)
    if room.status == RoomStatus.OCCUPIED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phòng {room.room_number} đang có khách, không thể đặt bảo trì",
        )
    if room.status == RoomStatus.MAINTENANCE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phòng {room.room_number} đã đang bảo trì",
        )
    return _apply_room_status_change(db, current_user, room, RoomStatus.MAINTENANCE, payload.reason)


# Xu ly hoan tat bao tri 1 phong: MAINTENANCE -> AVAILABLE.
def clear_room_maintenance(db: Session, current_user: User, room_id: int) -> dict:
    room = _get_operational_room(db, current_user, room_id)
    if room.status != RoomStatus.MAINTENANCE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phòng {room.room_number} không ở trạng thái bảo trì",
        )
    return _apply_room_status_change(db, current_user, room, RoomStatus.AVAILABLE, "Hoan tat bao tri")
