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
