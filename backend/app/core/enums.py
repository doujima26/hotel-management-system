from enum import StrEnum


class UserRole(StrEnum):
    SUPER_ADMIN = 'super_admin'
    ADMIN = 'admin'
    STAFF = 'staff'
    USER = 'user'


class HotelStatus(StrEnum):
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    SUSPENDED = 'suspended'


class BookingStatus(StrEnum):
    PENDING = 'pending'
    CONFIRMED = 'confirmed'
    CHECKED_IN = 'checked_in'
    CHECKED_OUT = 'checked_out'
    CANCELLED = 'cancelled'
    NO_SHOW = 'no_show'


class PaymentStatus(StrEnum):
    PENDING = 'pending'
    COMPLETED = 'completed'
    FAILED = 'failed'
    REFUNDED = 'refunded'
