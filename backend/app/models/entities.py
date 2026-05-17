from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.enums import BookingStatus, HotelStatus, PaymentStatus, UserRole
from app.db.session import Base


class User(Base):
    __tablename__ = 'users'
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name='user_role'), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Hotel(Base):
    __tablename__ = 'hotels'
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    owner_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('users.id', ondelete='RESTRICT'), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str | None] = mapped_column(String(100))
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 8))
    longitude: Mapped[float | None] = mapped_column(Numeric(11, 8))
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    star_rating: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[HotelStatus] = mapped_column(Enum(HotelStatus, name='hotel_status'), nullable=False)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    avg_rating: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False, default=0)
    total_reviews: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class HotelImage(Base):
    __tablename__ = 'hotel_images'
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    hotel_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('hotels.id', ondelete='CASCADE'), nullable=False)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RoomType(Base):
    __tablename__ = 'room_types'
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    hotel_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('hotels.id', ondelete='RESTRICT'), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    base_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    max_guests: Mapped[int] = mapped_column(Integer, nullable=False)
    area_sqm: Mapped[float | None] = mapped_column(Numeric(6, 2))
    bed_type: Mapped[str | None] = mapped_column(String(100))
    total_rooms: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RoomTypeImage(Base):
    __tablename__ = 'room_type_images'
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    room_type_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('room_types.id', ondelete='CASCADE'), nullable=False)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Room(Base):
    __tablename__ = 'rooms'
    __table_args__ = (UniqueConstraint('room_type_id', 'room_number', name='uq_room_type_room_number'),)
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    room_type_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('room_types.id', ondelete='RESTRICT'), nullable=False)
    room_number: Mapped[str] = mapped_column(String(20), nullable=False)
    floor: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Amenity(Base):
    __tablename__ = 'amenities'
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    icon: Mapped[str | None] = mapped_column(String(100))
    category: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RoomTypeAmenity(Base):
    __tablename__ = 'room_type_amenities'
    room_type_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('room_types.id', ondelete='CASCADE'), primary_key=True)
    amenity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('amenities.id', ondelete='CASCADE'), primary_key=True)


class Promotion(Base):
    __tablename__ = 'promotions'
    __table_args__ = (CheckConstraint('end_date >= start_date', name='ck_promotions_dates'),)
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    hotel_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('hotels.id', ondelete='CASCADE'), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    discount_type: Mapped[str] = mapped_column(String(20), nullable=False)
    discount_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    min_booking_amount: Mapped[float | None] = mapped_column(Numeric(12, 2))
    max_discount_amount: Mapped[float | None] = mapped_column(Numeric(12, 2))
    start_date: Mapped[str] = mapped_column(Date, nullable=False)
    end_date: Mapped[str] = mapped_column(Date, nullable=False)
    usage_limit: Mapped[int | None] = mapped_column(Integer)
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Booking(Base):
    __tablename__ = 'bookings'
    __table_args__ = (CheckConstraint('check_out_date > check_in_date', name='ck_bookings_dates'),)
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    booking_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    hotel_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('hotels.id', ondelete='RESTRICT'), nullable=False)
    check_in_date: Mapped[str] = mapped_column(Date, nullable=False)
    check_out_date: Mapped[str] = mapped_column(Date, nullable=False)
    num_guests: Mapped[int] = mapped_column(Integer, nullable=False)
    total_room_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_service_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(Enum(BookingStatus, name='booking_status'), nullable=False)
    cancellation_reason: Mapped[str | None] = mapped_column(Text)
    cancelled_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    cancelled_by: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey('users.id'))
    promotion_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey('promotions.id'))
    special_requests: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class BookingRoom(Base):
    __tablename__ = 'booking_rooms'
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    booking_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False)
    room_type_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('room_types.id', ondelete='RESTRICT'), nullable=False)
    room_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey('rooms.id'))
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    price_per_night: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    num_nights: Mapped[int] = mapped_column(Integer, nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)


class Payment(Base):
    __tablename__ = 'payments'
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    booking_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('bookings.id', ondelete='RESTRICT'), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)
    payment_status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus, name='payment_status'), nullable=False)
    transaction_id: Mapped[str | None] = mapped_column(String(255))
    payment_gateway_response: Mapped[dict | None] = mapped_column(JSONB)
    paid_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Invoice(Base):
    __tablename__ = 'invoices'
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    invoice_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    booking_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('bookings.id', ondelete='RESTRICT'), unique=True, nullable=False)
    payment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('payments.id', ondelete='RESTRICT'), nullable=False)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    hotel_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('hotels.id', ondelete='RESTRICT'), nullable=False)
    total_room_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_service_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    issued_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class HotelService(Base):
    __tablename__ = 'hotel_services'
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    hotel_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('hotels.id', ondelete='CASCADE'), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    unit: Mapped[str | None] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class BookingService(Base):
    __tablename__ = 'booking_services'
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    booking_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False)
    service_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('hotel_services.id', ondelete='RESTRICT'), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    used_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class StaffMember(Base):
    __tablename__ = 'staff_members'
    __table_args__ = (UniqueConstraint('user_id', 'hotel_id', name='uq_staff_member'),)
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    hotel_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('hotels.id', ondelete='RESTRICT'), nullable=False)
    position: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    hired_at: Mapped[str | None] = mapped_column(Date)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class StaffSchedule(Base):
    __tablename__ = 'staff_schedules'
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    staff_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('staff_members.id', ondelete='CASCADE'), nullable=False)
    shift_date: Mapped[str] = mapped_column(Date, nullable=False)
    shift_type: Mapped[str] = mapped_column(String(20), nullable=False)
    start_time: Mapped[str] = mapped_column(Time, nullable=False)
    end_time: Mapped[str] = mapped_column(Time, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CheckInOut(Base):
    __tablename__ = 'check_in_outs'
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    booking_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('bookings.id', ondelete='RESTRICT'), nullable=False)
    staff_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('staff_members.id', ondelete='RESTRICT'), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    performed_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RoomStatusLog(Base):
    __tablename__ = 'room_status_logs'
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    room_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False)
    previous_status: Mapped[str | None] = mapped_column(String(20))
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey('users.id'))
    changed_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)


class Review(Base):
    __tablename__ = 'reviews'
    __table_args__ = (UniqueConstraint('user_id', 'booking_id', name='uq_review_user_booking'),)
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    hotel_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('hotels.id', ondelete='RESTRICT'), nullable=False)
    booking_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('bookings.id', ondelete='RESTRICT'), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Favorite(Base):
    __tablename__ = 'favorites'
    __table_args__ = (UniqueConstraint('user_id', 'hotel_id', name='uq_favorite_user_hotel'),)
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    hotel_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey('hotels.id', ondelete='CASCADE'), nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
