-- Migration: them bang pricing_rules - quy tac dieu chinh gia phong theo mua
-- va ngay le. Khong dong den bang/du lieu hien co, chi them moi.
--
-- Moi dong la 1 quy tac gom: pham vi ap dung (ca khach san hoac 1 loai phong),
-- khoang ngay (co dinh hoac lap lai hang nam), loc theo thu trong tuan, muc
-- dieu chinh tren base_price cua loai phong (phan tram hoac so tien, co dau -
-- am la giam gia, duong la phu thu) va do uu tien khi nhieu quy tac cung khop
-- mot ngay.
--
-- Gia mot dem duoc tinh theo thu tu: gia sua tay trong room_type_rates, roi
-- quy tac dang bat co priority cao nhat, cuoi cung la room_types.base_price.
--
-- Chay: psql -d <db> -f backend/database/migrations/add_pricing_rules.sql
-- Rollback: backend/database/migrations/add_pricing_rules_rollback.sql

BEGIN;

CREATE TABLE pricing_rules (
    id                BIGSERIAL PRIMARY KEY,
    hotel_id          BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    -- NULL nghia la ap cho moi loai phong cua khach san.
    room_type_id      BIGINT REFERENCES room_types(id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    -- one_time dung start_date/end_date; yearly dung start_month/start_day
    -- va end_month/end_day.
    recurrence        VARCHAR(20) NOT NULL DEFAULT 'one_time',
    start_date        DATE,
    end_date          DATE,
    start_month       SMALLINT,
    start_day         SMALLINT,
    end_month         SMALLINT,
    end_day           SMALLINT,
    -- Danh sach thu trong tuan theo quy uoc PostgreSQL EXTRACT(DOW): 0 la chu
    -- nhat den 6 la thu bay. NULL nghia la ap cho moi thu.
    weekdays          SMALLINT[],
    adjustment_type   discount_type NOT NULL,
    adjustment_value  DECIMAL(12, 2) NOT NULL,
    priority          INTEGER NOT NULL DEFAULT 0,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_pricing_rules_recurrence
        CHECK (recurrence IN ('one_time', 'yearly')),

    CONSTRAINT ck_pricing_rules_one_time
        CHECK (
            recurrence <> 'one_time'
            OR (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)
        ),

    CONSTRAINT ck_pricing_rules_yearly
        CHECK (
            recurrence <> 'yearly'
            OR (
                start_month IS NOT NULL AND start_month BETWEEN 1 AND 12
                AND end_month IS NOT NULL AND end_month BETWEEN 1 AND 12
                AND start_day IS NOT NULL AND start_day BETWEEN 1 AND 31
                AND end_day IS NOT NULL AND end_day BETWEEN 1 AND 31
            )
        ),

    -- Mang rong hoac chua gia tri ngoai 0..6 se khong khop duoc ngay nao.
    CONSTRAINT ck_pricing_rules_weekdays
        CHECK (
            weekdays IS NULL
            OR (
                cardinality(weekdays) > 0
                AND array_position(weekdays, NULL) IS NULL
                AND weekdays <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::SMALLINT[]
            )
        ),

    -- Giam tu 100 phan tram tro len se dua gia ve 0 hoac am.
    CONSTRAINT ck_pricing_rules_percentage
        CHECK (adjustment_type <> 'percentage' OR adjustment_value > -100)
);

-- Bo giai gia luon nap quy tac dang bat cua 1 khach san.
CREATE INDEX idx_pricing_rules_hotel_active ON pricing_rules (hotel_id, is_active);

CREATE TRIGGER trg_pricing_rules_updated_at
    BEFORE UPDATE ON pricing_rules FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

COMMIT;
