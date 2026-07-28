from sqlalchemy import BigInteger, Boolean, CheckConstraint, Date, DateTime, Enum, ForeignKey, Index, Integer, Numeric, String, Text, Time, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.enums import (
    BookingStatus,
    CheckType,
    DiscountType,
    HotelStatus,
    PaymentMethod,
    PaymentStatus,
    RoomStatus,
    ShiftType,
    UserRole,
)
from app.db.session import Base


# Tra danh sach gia tri enum de map dung voi enum trong PostgreSQL.
def enum_values(enum_cls):
    return [member.value for member in enum_cls]


# Model bang users.
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=enum_values),
        nullable=False,
        default=UserRole.USER,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Phien ban token: JWT mang claim "ver" bang gia tri nay luc cap. Doi/dat lai
    # mat khau se tang len 1 -> moi token cu (access + refresh, tren MOI thiet bi)
    # deu lech "ver" nen bi tu choi ngay lap tuc.
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang hotels.
class Hotel(Base):
    __tablename__ = "hotels"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    owner_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), unique=True, nullable=False)
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
    status: Mapped[HotelStatus] = mapped_column(
        Enum(HotelStatus, name="hotel_status", values_callable=enum_values),
        nullable=False,
        default=HotelStatus.PENDING,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    avg_rating: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False, default=0)
    total_reviews: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Quy tac chung (house rules): gio nhan/tra phong, chinh sach huy/tre em, thu cung.
    check_in_time: Mapped[Time] = mapped_column(Time, nullable=False, server_default=text("'14:00'"))
    check_out_time: Mapped[Time] = mapped_column(Time, nullable=False, server_default=text("'12:00'"))
    cancellation_policy: Mapped[str | None] = mapped_column(Text)
    children_policy: Mapped[str | None] = mapped_column(Text)
    pets_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Phuong thuc thanh toan chap nhan - thuoc tinh da tri nen tach sang bang noi
    # hotel_payment_methods; truy cap qua association_proxy nen hotel.payment_methods
    # van la list[PaymentMethod] (doc/ghi) nhu cu -> API va frontend khong doi.
    payment_method_rows: Mapped[list["HotelPaymentMethod"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin"
    )
    payment_methods = association_proxy(
        "payment_method_rows",
        "method",
        creator=lambda method: HotelPaymentMethod(method=PaymentMethod(method)),
    )


# Model bang hotel_payment_methods - moi phuong thuc thanh toan cua khach san 1 dong.
class HotelPaymentMethod(Base):
    __tablename__ = "hotel_payment_methods"

    hotel_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hotels.id", ondelete="CASCADE"), primary_key=True)
    method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method", values_callable=enum_values),
        primary_key=True,
    )


# Model bang hotel_images.
class HotelImage(Base):
    __tablename__ = "hotel_images"
    # Dam bao chi 1 anh dai dien moi hotel (luoi an toan cap DB, tang ung dung
    # da tu unset anh khac truoc khi set anh moi nhung khong khoa row).
    __table_args__ = (
        Index("uq_hotel_primary_img", "hotel_id", unique=True, postgresql_where=text("is_primary")),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    hotel_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang room_types.
class RoomType(Base):
    __tablename__ = "room_types"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    hotel_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hotels.id", ondelete="RESTRICT"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    base_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    max_guests: Mapped[int] = mapped_column(Integer, nullable=False)
    area_sqm: Mapped[float | None] = mapped_column(Numeric(6, 2))
    bed_type: Mapped[str | None] = mapped_column(String(100))
    total_rooms: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang room_type_images.
class RoomTypeImage(Base):
    __tablename__ = "room_type_images"
    # Dam bao chi 1 anh dai dien moi loai phong (luoi an toan cap DB, tuong tu HotelImage).
    __table_args__ = (
        Index("uq_rt_primary_img", "room_type_id", unique=True, postgresql_where=text("is_primary")),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    room_type_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("room_types.id", ondelete="CASCADE"), nullable=False)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang rooms.
class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (UniqueConstraint("hotel_id", "room_number", name="uq_room_hotel_number"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    hotel_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hotels.id", ondelete="RESTRICT"), nullable=False)
    room_type_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("room_types.id", ondelete="RESTRICT"), nullable=False)
    room_number: Mapped[str] = mapped_column(String(20), nullable=False)
    floor: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[RoomStatus] = mapped_column(
        Enum(RoomStatus, name="room_status", values_callable=enum_values),
        nullable=False,
        default=RoomStatus.AVAILABLE,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang amenities.
class Amenity(Base):
    __tablename__ = "amenities"
    __table_args__ = (UniqueConstraint("hotel_id", "name", name="uq_amenities_hotel_name"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    hotel_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(100))
    category: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang room_type_amenities.
class RoomTypeAmenity(Base):
    __tablename__ = "room_type_amenities"

    room_type_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("room_types.id", ondelete="CASCADE"), primary_key=True)
    amenity_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True)


# Model bang promotions.
class Promotion(Base):
    __tablename__ = "promotions"
    __table_args__ = (CheckConstraint("end_date >= start_date", name="ck_promotions_dates"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    hotel_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    discount_type: Mapped[DiscountType] = mapped_column(
        Enum(DiscountType, name="discount_type", values_callable=enum_values),
        nullable=False,
    )
    discount_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    min_booking_amount: Mapped[float | None] = mapped_column(Numeric(12, 2))
    max_discount_amount: Mapped[float | None] = mapped_column(Numeric(12, 2))
    start_date: Mapped[Date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Date] = mapped_column(Date, nullable=False)
    usage_limit: Mapped[int | None] = mapped_column(Integer)
    used_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang bookings.
class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (CheckConstraint("check_out_date > check_in_date", name="ck_bookings_dates"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    booking_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    hotel_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hotels.id", ondelete="RESTRICT"), nullable=False)
    check_in_date: Mapped[Date] = mapped_column(Date, nullable=False)
    check_out_date: Mapped[Date] = mapped_column(Date, nullable=False)
    num_guests: Mapped[int] = mapped_column(Integer, nullable=False)
    total_room_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_service_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="booking_status", values_callable=enum_values),
        nullable=False,
        default=BookingStatus.PENDING,
    )
    cancellation_reason: Mapped[str | None] = mapped_column(Text)
    cancelled_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    cancelled_by: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id"))
    promotion_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("promotions.id"))
    special_requests: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang booking_rooms.
class BookingRoom(Base):
    __tablename__ = "booking_rooms"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    booking_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    room_type_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("room_types.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    price_per_night: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    num_nights: Mapped[int] = mapped_column(Integer, nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)


# Model bang booking_room_units. Moi dong = 1 suat phong trong booking_rooms.quantity,
# ho tro gan nhieu phong vat ly rieng biet khi quantity > 1 (booking_rooms.room_id cu
# chi gan duoc 1 phong/dong nen khong du dung cho truong hop nay).
class BookingRoomUnit(Base):
    __tablename__ = "booking_room_units"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    booking_room_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("booking_rooms.id", ondelete="CASCADE"), nullable=False)
    room_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("rooms.id", ondelete="RESTRICT"))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang payments.
class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    booking_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("bookings.id", ondelete="RESTRICT"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method", values_callable=enum_values),
        nullable=False,
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status", values_callable=enum_values),
        nullable=False,
        default=PaymentStatus.PENDING,
    )
    transaction_id: Mapped[str | None] = mapped_column(String(255))
    payment_gateway_response: Mapped[dict | None] = mapped_column(JSONB)
    paid_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang invoices.
class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    invoice_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    booking_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("bookings.id", ondelete="RESTRICT"), unique=True, nullable=False)
    payment_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("payments.id", ondelete="RESTRICT"), nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    hotel_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hotels.id", ondelete="RESTRICT"), nullable=False)
    total_room_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_service_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    issued_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang hotel_services.
class HotelService(Base):
    __tablename__ = "hotel_services"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    hotel_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    unit: Mapped[str | None] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang booking_services.
class BookingService(Base):
    __tablename__ = "booking_services"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    booking_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    service_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hotel_services.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    used_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang staff_members.
class StaffMember(Base):
    __tablename__ = "staff_members"
    __table_args__ = (UniqueConstraint("user_id", "hotel_id", name="uq_staff_member"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    hotel_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hotels.id", ondelete="RESTRICT"), nullable=False)
    position: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    hired_at: Mapped[Date | None] = mapped_column(Date)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang staff_schedules.
class StaffSchedule(Base):
    __tablename__ = "staff_schedules"
    # Khoa theo TUNG NHAN VIEN - khong chan nhieu nhan vien khac nhau cung lam
    # chung 1 ca (binh thuong), chi chan 1 nhan vien bi xep trung dung 1 ca,
    # dung 1 ngay (loi nhap lieu).
    __table_args__ = (UniqueConstraint("staff_id", "shift_date", "shift_type", name="uq_staff_shift"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("staff_members.id", ondelete="CASCADE"), nullable=False)
    shift_date: Mapped[Date] = mapped_column(Date, nullable=False)
    shift_type: Mapped[ShiftType] = mapped_column(
        Enum(ShiftType, name="shift_type", values_callable=enum_values),
        nullable=False,
    )
    start_time: Mapped[Time] = mapped_column(Time, nullable=False)
    end_time: Mapped[Time] = mapped_column(Time, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang check_in_outs.
class CheckInOut(Base):
    __tablename__ = "check_in_outs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    booking_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("bookings.id", ondelete="RESTRICT"), nullable=False)
    staff_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("staff_members.id", ondelete="RESTRICT"), nullable=False)
    type: Mapped[CheckType] = mapped_column(
        Enum(CheckType, name="check_type", values_callable=enum_values),
        nullable=False,
    )
    performed_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang room_status_logs.
class RoomStatusLog(Base):
    __tablename__ = "room_status_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    room_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    previous_status: Mapped[str | None] = mapped_column(String(20))
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id"))
    changed_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    reason: Mapped[str | None] = mapped_column(Text)


# Model bang reviews.
class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("user_id", "booking_id", name="uq_review_user_booking"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    hotel_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hotels.id", ondelete="RESTRICT"), nullable=False)
    booking_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("bookings.id", ondelete="RESTRICT"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Model bang favorites.
class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "hotel_id", name="uq_favorite_user_hotel"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    hotel_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
