from enum import StrEnum


# Dinh nghia vai tro nguoi dung trong he thong.
class UserRole(StrEnum):
    SUPER_ADMIN = 'super_admin'
    ADMIN = 'admin'
    STAFF = 'staff'
    USER = 'user'


# Dinh nghia trang thai duyet khach san.
class HotelStatus(StrEnum):
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    SUSPENDED = 'suspended'


# Dinh nghia trang thai don dat phong.
class BookingStatus(StrEnum):
    PENDING = 'pending'
    CONFIRMED = 'confirmed'
    CHECKED_IN = 'checked_in'
    CHECKED_OUT = 'checked_out'
    CANCELLED = 'cancelled'
    NO_SHOW = 'no_show'


# Dinh nghia trang thai thanh toan.
class PaymentStatus(StrEnum):
    PENDING = 'pending'
    COMPLETED = 'completed'
    FAILED = 'failed'
    REFUNDED = 'refunded'


# Dinh nghia trang thai phong vat ly.
class RoomStatus(StrEnum):
    AVAILABLE = 'available'
    OCCUPIED = 'occupied'
    CLEANING = 'cleaning'
    MAINTENANCE = 'maintenance'


# Dinh nghia phuong thuc thanh toan.
class PaymentMethod(StrEnum):
    ZALOPAY = 'zalopay'
    MOMO = 'momo'
    CREDIT_CARD = 'credit_card'
    BANK_TRANSFER = 'bank_transfer'


# Dinh nghia loai giam gia khuyen mai.
class DiscountType(StrEnum):
    PERCENTAGE = 'percentage'
    FIXED_AMOUNT = 'fixed_amount'


# Dinh nghia ca lam viec cua nhan vien.
class ShiftType(StrEnum):
    MORNING = 'morning'
    AFTERNOON = 'afternoon'
    NIGHT = 'night'


# Dinh nghia loai thao tac check-in/check-out.
class CheckType(StrEnum):
    CHECK_IN = 'check_in'
    CHECK_OUT = 'check_out'


# Dinh nghia cach sap xep ket qua tim kiem khach san.
class HotelSortOption(StrEnum):
    RECOMMENDED = 'recommended'
    PRICE_ASC = 'price_asc'
    PRICE_DESC = 'price_desc'
    RATING_DESC = 'rating_desc'
    STAR_DESC = 'star_desc'
    STAR_ASC = 'star_asc'
