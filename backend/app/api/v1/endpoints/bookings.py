from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import BookingStatus, UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.schemas.bookings import CancelBookingRequest, CheckoutRequest
from app.schemas.checkin import CheckInRequest, CheckOutRequest
from app.services.booking_service import (
    admin_cancel_booking as admin_cancel_booking_action,
    cancel_booking as cancel_booking_action,
    checkout as checkout_action,
    confirm_booking as confirm_booking_action,
    get_booking_detail as get_booking_detail_action,
    get_payment_instructions as get_payment_instructions_action,
    list_hotel_bookings as list_hotel_bookings_action,
    list_my_bookings as list_my_bookings_action,
    mark_booking_no_show as mark_booking_no_show_action,
)
from app.services.checkin_service import (
    check_in_booking as check_in_booking_action,
    check_out_booking as check_out_booking_action,
)
from app.services.payment_service import get_invoice_by_booking as get_invoice_by_booking_action

router = APIRouter(prefix="/bookings", tags=["bookings"])


# Khach dat phong va thanh toan trong 1 buoc: hoac xong ca don lan hoa don,
# hoac khong tao gi.
@router.post("/checkout")
def checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = checkout_action(db, current_user, payload)
    return ok(data, "Dat phong va thanh toan thanh cong")


# Khach xem danh sach booking cua minh.
@router.get("")
def list_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = list_my_bookings_action(db, current_user)
    return ok(data, "Danh sach booking")


# Admin/Staff xem danh sach booking cua khach san minh, co the loc theo trang thai.
# Dat truoc route "/{booking_id}" de tranh bi route dong nuot mat.
@router.get("/hotel")
def list_hotel_bookings(
    status_filter: BookingStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
):
    data = list_hotel_bookings_action(db, current_user, status_filter)
    return ok(data, "Danh sach booking cua khach san")


# Admin xac nhan hoa don, chuyen booking sang confirmed va gui email cho khach.
@router.patch("/{booking_id}/confirm")
def confirm_booking(
    booking_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = confirm_booking_action(db, current_user, booking_id, background_tasks)
    return ok(data, "Xac nhan don dat phong thanh cong, da gui email thong bao toi khach")


# Admin huy booking thay khach (vd overbooking), khong ap chinh sach 24h.
@router.patch("/{booking_id}/admin-cancel")
def admin_cancel_booking(
    booking_id: int,
    payload: CancelBookingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    data = admin_cancel_booking_action(db, current_user, booking_id, payload)
    return ok(data, "Huy booking thanh cong")


# Admin/Staff danh dau booking la khach khong den (no-show) - booking phai
# confirmed va da qua ngay nhan phong ma chua check-in.
@router.patch("/{booking_id}/no-show")
def mark_booking_no_show(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
):
    data = mark_booking_no_show_action(db, current_user, booking_id)
    return ok(data, "Da danh dau booking khong den")


# Khach xem chi tiet booking cua minh, hoac Admin/Staff xem booking cua khach san minh
# (can cho man hinh check-in/check-out). Dat cuoi file de khong nuot route "/hotel".
@router.get("/{booking_id}")
def get_booking_detail(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)),
):
    data = get_booking_detail_action(db, current_user, booking_id)
    return ok(data, "Chi tiet booking")


# Khach xem hoa don cua booking minh.
@router.get("/{booking_id}/invoice")
def get_booking_invoice(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = get_invoice_by_booking_action(db, current_user, booking_id)
    return ok(data, "Hoa don booking")


# Khach lay lai thong tin chuyen khoan cua don dang cho tra tien - man hinh QR
# chi ton tai trong bo nho trinh duyet nen tai lai trang la mat, trong khi don
# van dang giu phong.
@router.get("/{booking_id}/payment-instructions")
def get_booking_payment_instructions(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = get_payment_instructions_action(db, current_user, booking_id)
    return ok(data, "Thong tin chuyen khoan")


# Khach tu huy booking cua minh (con cach gio nhan phong toi thieu 24h).
@router.patch("/{booking_id}/cancel")
def cancel_booking(
    booking_id: int,
    payload: CancelBookingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = cancel_booking_action(db, current_user, booking_id, payload)
    return ok(data, "Huy booking thanh cong")


# Staff check-in booking: gan phong vat ly cu the cho tung suat phong da dat.
@router.patch("/{booking_id}/check-in")
def check_in_booking(
    booking_id: int,
    payload: CheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STAFF)),
):
    data = check_in_booking_action(db, current_user, booking_id, payload)
    return ok(data, "Check-in thanh cong")


# Staff check-out booking: nha lai phong ve trong.
@router.patch("/{booking_id}/check-out")
def check_out_booking(
    booking_id: int,
    payload: CheckOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STAFF)),
):
    data = check_out_booking_action(db, current_user, booking_id, payload)
    return ok(data, "Check-out thanh cong")
