-- ============================================================
-- HỆ THỐNG QUẢN LÝ NGHIỆP VỤ KHÁCH SẠN - DATABASE MIGRATION
-- PostgreSQL 13+ | Author: Hoàng Hà Dũng (22010344)
-- Generated: 2026-04-25
-- Dựa trên: phanquyenvachucnang.pdf
-- ============================================================

-- ============================================================
-- PHẦN 1: EXTENSIONS & ENUM TYPES
-- ============================================================


-- Vai trò người dùng
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'staff', 'user');

-- Trạng thái duyệt khách sạn
CREATE TYPE hotel_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Trạng thái phòng vật lý
CREATE TYPE room_status AS ENUM ('available', 'occupied', 'cleaning', 'maintenance');

-- Trạng thái đơn đặt phòng
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');

-- Phương thức thanh toán (chỉ online)
CREATE TYPE payment_method AS ENUM ('zalopay', 'momo', 'credit_card', 'bank_transfer');

-- Trạng thái thanh toán
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Loại giảm giá
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');

-- Ca làm việc
CREATE TYPE shift_type AS ENUM ('morning', 'afternoon', 'night');

-- Loại check-in/check-out
CREATE TYPE check_type AS ENUM ('check_in', 'check_out');

-- ============================================================
-- PHẦN 2: BẢNG DỮ LIỆU (21 bảng)
-- ============================================================

-- -------------------------------------------------------
-- 1. users - Quản lý người dùng & phân quyền
-- -------------------------------------------------------
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    avatar_url      TEXT,
    role            user_role NOT NULL DEFAULT 'user',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Tất cả người dùng: Super Admin, Admin, Staff, User';

-- -------------------------------------------------------
-- 2. hotels - Khách sạn do Admin đăng ký
-- -------------------------------------------------------
CREATE TABLE hotels (
    id                BIGSERIAL PRIMARY KEY,
    owner_id          BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    address           TEXT NOT NULL,
    city              VARCHAR(100) NOT NULL,
    district          VARCHAR(100),
    latitude          DECIMAL(10, 8),
    longitude         DECIMAL(11, 8),
    phone             VARCHAR(20),
    email             VARCHAR(255),
    star_rating       SMALLINT CHECK (star_rating BETWEEN 1 AND 5),
    status            hotel_status NOT NULL DEFAULT 'pending',
    rejection_reason  TEXT,
    avg_rating        DECIMAL(3, 2) NOT NULL DEFAULT 0,
    total_reviews     INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hotels IS '1 Admin = 1 Hotel (UNIQUE owner_id). Cần Super Admin duyệt.';

-- -------------------------------------------------------
-- 3. hotel_images - Hình ảnh khách sạn
-- -------------------------------------------------------
CREATE TABLE hotel_images (
    id          BIGSERIAL PRIMARY KEY,
    hotel_id    BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    image_url   TEXT NOT NULL,
    is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 4. room_types - Loại phòng (Standard, Deluxe, Suite...)
-- -------------------------------------------------------
CREATE TABLE room_types (
    id           BIGSERIAL PRIMARY KEY,
    hotel_id     BIGINT NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    base_price   DECIMAL(12, 2) NOT NULL CHECK (base_price > 0),
    max_guests   INTEGER NOT NULL CHECK (max_guests > 0),
    area_sqm     DECIMAL(6, 2),
    bed_type     VARCHAR(100),
    total_rooms  INTEGER NOT NULL CHECK (total_rooms > 0),
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 5. room_type_images - Hình ảnh loại phòng
-- -------------------------------------------------------
CREATE TABLE room_type_images (
    id            BIGSERIAL PRIMARY KEY,
    room_type_id  BIGINT NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    image_url     TEXT NOT NULL,
    is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 6. rooms - Phòng vật lý (theo dõi trạng thái từng phòng)
-- -------------------------------------------------------
CREATE TABLE rooms (
    id            BIGSERIAL PRIMARY KEY,
    room_type_id  BIGINT NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
    room_number   VARCHAR(20) NOT NULL,
    floor         INTEGER,
    status        room_status NOT NULL DEFAULT 'available',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(room_type_id, room_number)
);

COMMENT ON TABLE rooms IS 'Phòng vật lý - tách khỏi room_types để theo dõi trạng thái';

-- -------------------------------------------------------
-- 7. amenities - Danh mục tiện nghi theo khách sạn
-- -------------------------------------------------------
CREATE TABLE amenities (
    id          BIGSERIAL PRIMARY KEY,
    hotel_id    BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    icon        VARCHAR(100),
    category    VARCHAR(50),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(hotel_id, name)
);

-- -------------------------------------------------------
-- 8. room_type_amenities - Liên kết N:N loại phòng ↔ tiện nghi
-- -------------------------------------------------------
CREATE TABLE room_type_amenities (
    room_type_id  BIGINT NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    amenity_id    BIGINT NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (room_type_id, amenity_id)
);

-- -------------------------------------------------------
-- 9. promotions - Chương trình khuyến mãi
-- -------------------------------------------------------
CREATE TABLE promotions (
    id                  BIGSERIAL PRIMARY KEY,
    hotel_id            BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    discount_type       discount_type NOT NULL,
    discount_value      DECIMAL(12, 2) NOT NULL CHECK (discount_value > 0),
    min_booking_amount  DECIMAL(12, 2),
    max_discount_amount DECIMAL(12, 2),
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    usage_limit         INTEGER,
    used_count          INTEGER NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- -------------------------------------------------------
-- 10. bookings - Đơn đặt phòng
-- -------------------------------------------------------
CREATE TABLE bookings (
    id                   BIGSERIAL PRIMARY KEY,
    booking_code         VARCHAR(20) NOT NULL UNIQUE,
    user_id              BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    hotel_id             BIGINT NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
    check_in_date        DATE NOT NULL,
    check_out_date       DATE NOT NULL,
    num_guests           INTEGER NOT NULL CHECK (num_guests > 0),
    total_room_price     DECIMAL(12, 2) NOT NULL,
    total_service_price  DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount      DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_amount         DECIMAL(12, 2) NOT NULL,
    status               booking_status NOT NULL DEFAULT 'pending',
    cancellation_reason  TEXT,
    cancelled_at         TIMESTAMPTZ,
    cancelled_by         BIGINT REFERENCES users(id),
    promotion_id         BIGINT REFERENCES promotions(id),
    special_requests     TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (check_out_date > check_in_date)
);

-- -------------------------------------------------------
-- 11. booking_rooms - Chi tiết phòng trong đơn đặt
-- -------------------------------------------------------
CREATE TABLE booking_rooms (
    id               BIGSERIAL PRIMARY KEY,
    booking_id       BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    room_type_id     BIGINT NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
    room_id          BIGINT REFERENCES rooms(id),  -- Gán phòng cụ thể khi check-in
    quantity         INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price_per_night  DECIMAL(12, 2) NOT NULL,    -- Snapshot giá tại thời điểm đặt
    num_nights       INTEGER NOT NULL CHECK (num_nights > 0),
    subtotal         DECIMAL(12, 2) NOT NULL
);

-- -------------------------------------------------------
-- 12. payments - Thanh toán online
-- -------------------------------------------------------
CREATE TABLE payments (
    id                       BIGSERIAL PRIMARY KEY,
    booking_id               BIGINT NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    amount                   DECIMAL(12, 2) NOT NULL,
    payment_method           payment_method NOT NULL,
    payment_status           payment_status NOT NULL DEFAULT 'pending',
    transaction_id           VARCHAR(255),
    payment_gateway_response JSONB,
    paid_at                  TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 13. invoices - Hóa đơn (tự động tạo sau thanh toán thành công)
-- -------------------------------------------------------
CREATE TABLE invoices (
    id                   BIGSERIAL PRIMARY KEY,
    invoice_number       VARCHAR(30) NOT NULL UNIQUE,
    booking_id           BIGINT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
    payment_id           BIGINT NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    user_id              BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    hotel_id             BIGINT NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
    total_room_price     DECIMAL(12, 2) NOT NULL,
    total_service_price  DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount      DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_amount         DECIMAL(12, 2) NOT NULL,
    issued_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invoices IS 'Tự động tạo khi payment_status = completed';

-- -------------------------------------------------------
-- 14. hotel_services - Dịch vụ đi kèm khách sạn
-- -------------------------------------------------------
CREATE TABLE hotel_services (
    id          BIGSERIAL PRIMARY KEY,
    hotel_id    BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    price       DECIMAL(12, 2) NOT NULL CHECK (price > 0),
    unit        VARCHAR(50),  -- lần, kg, chuyến...
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 15. booking_services - Dịch vụ sử dụng trong booking
-- -------------------------------------------------------
CREATE TABLE booking_services (
    id          BIGSERIAL PRIMARY KEY,
    booking_id  BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    service_id  BIGINT NOT NULL REFERENCES hotel_services(id) ON DELETE RESTRICT,
    quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price  DECIMAL(12, 2) NOT NULL,  -- Snapshot giá tại thời điểm sử dụng
    subtotal    DECIMAL(12, 2) NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 16. staff_members - Nhân viên khách sạn
-- -------------------------------------------------------
CREATE TABLE staff_members (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    hotel_id    BIGINT NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
    position    VARCHAR(100) NOT NULL,  -- Lễ tân, Housekeeping...
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    hired_at    DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, hotel_id)
);

COMMENT ON TABLE staff_members IS 'Staff bắt buộc gắn liền với 1 khách sạn';

-- -------------------------------------------------------
-- 17. staff_schedules - Ca làm việc nhân viên
-- -------------------------------------------------------
CREATE TABLE staff_schedules (
    id          BIGSERIAL PRIMARY KEY,
    staff_id    BIGINT NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
    shift_date  DATE NOT NULL,
    shift_type  shift_type NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 18. check_in_outs - Nghiệp vụ check-in/check-out
-- -------------------------------------------------------
CREATE TABLE check_in_outs (
    id            BIGSERIAL PRIMARY KEY,
    booking_id    BIGINT NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    staff_id      BIGINT NOT NULL REFERENCES staff_members(id) ON DELETE RESTRICT,
    type          check_type NOT NULL,
    performed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- 19. room_status_logs - Lịch sử thay đổi trạng thái phòng
-- -------------------------------------------------------
CREATE TABLE room_status_logs (
    id               BIGSERIAL PRIMARY KEY,
    room_id          BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    previous_status  VARCHAR(20),
    new_status       VARCHAR(20) NOT NULL,
    changed_by       BIGINT REFERENCES users(id),
    changed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason           TEXT
);

-- -------------------------------------------------------
-- 20. reviews - Đánh giá khách sạn
-- -------------------------------------------------------
CREATE TABLE reviews (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    hotel_id    BIGINT NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
    booking_id  BIGINT NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, booking_id)  -- 1 user chỉ đánh giá 1 lần/booking
);

-- -------------------------------------------------------
-- 21. favorites - Danh sách yêu thích
-- -------------------------------------------------------
CREATE TABLE favorites (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hotel_id    BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, hotel_id)  -- Tránh trùng lặp
);



-- ============================================================
-- PHẦN 3: INDEXES
-- ============================================================

-- Tìm kiếm khách sạn
CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_hotels_status ON hotels(status);
CREATE INDEX idx_hotels_avg_rating ON hotels(avg_rating DESC);

-- Đặt phòng & kiểm tra trùng lịch
CREATE INDEX idx_bookings_dates ON bookings(hotel_id, check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_user ON bookings(user_id);

-- Phòng
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_room_type ON rooms(room_type_id);
CREATE INDEX idx_amenities_hotel ON amenities(hotel_id);

-- Loại phòng theo giá
CREATE INDEX idx_room_types_hotel_price ON room_types(hotel_id, base_price);

-- Đánh giá & yêu thích
CREATE INDEX idx_reviews_hotel ON reviews(hotel_id);
CREATE INDEX idx_favorites_user ON favorites(user_id);

-- Nhân sự & ca làm
CREATE INDEX idx_staff_schedules_date ON staff_schedules(staff_id, shift_date);
CREATE INDEX idx_staff_members_hotel ON staff_members(hotel_id);

-- Thanh toán
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_booking ON payments(booking_id);

-- Khuyến mãi
CREATE INDEX idx_promotions_dates ON promotions(hotel_id, start_date, end_date);

-- GIN index cho JSONB
CREATE INDEX idx_payments_gateway ON payments USING GIN(payment_gateway_response);

-- ============================================================
-- PHẦN 4: TRIGGERS & FUNCTIONS
-- ============================================================

-- -------------------------------------------------------
-- Trigger: Tự động cập nhật updated_at
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng cho các bảng có cột updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_hotels_updated_at
    BEFORE UPDATE ON hotels FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_room_types_updated_at
    BEFORE UPDATE ON room_types FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_rooms_updated_at
    BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_hotel_services_updated_at
    BEFORE UPDATE ON hotel_services FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_staff_members_updated_at
    BEFORE UPDATE ON staff_members FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_staff_schedules_updated_at
    BEFORE UPDATE ON staff_schedules FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_reviews_updated_at
    BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_promotions_updated_at
    BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- -------------------------------------------------------
-- Trigger: Cập nhật avg_rating & total_reviews khi có review mới
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_hotel_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE hotels SET
        avg_rating = (
            SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
            FROM reviews WHERE hotel_id = COALESCE(NEW.hotel_id, OLD.hotel_id)
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews WHERE hotel_id = COALESCE(NEW.hotel_id, OLD.hotel_id)
        )
    WHERE id = COALESCE(NEW.hotel_id, OLD.hotel_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_update_rating
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION fn_update_hotel_rating();

-- -------------------------------------------------------
-- Trigger: Log thay đổi trạng thái phòng
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_log_room_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO room_status_logs (room_id, previous_status, new_status)
        VALUES (NEW.id, OLD.status::VARCHAR, NEW.status::VARCHAR);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rooms_status_log
    AFTER UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION fn_log_room_status_change();

-- ============================================================
-- HOÀN TẤT MIGRATION
-- ============================================================

