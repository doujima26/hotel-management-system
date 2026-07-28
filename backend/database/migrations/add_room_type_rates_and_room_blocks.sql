-- Migration: them 2 bang moi cho Dot C (rut gon) - gia phong theo ngay va
-- khoa lich phong vat ly. Khong dong den bang/du lieu hien co, chi them moi.
--
-- room_type_rates: gia ghi de theo tung ngay cu the cua 1 loai phong. Khong
-- co dong nao cho 1 ngay thi dung room_types.base_price lam gia mac dinh.
-- Ung dung con ho tro "ap gia theo mua" (tinh 1 lan roi ghi de hang loat vao
-- bang nay, khong luu lai quy tac nao rieng).
--
-- room_blocks: khoa 1 phong vat ly cu the trong 1 khoang ngay (dong ca 2 dau)
-- - dung cho bao tri da len lich truoc hoac giu phong ngoai muc dich ban
-- thong thuong. Tich hop vao luc tao booking (loai phong dang bi khoa khoi
-- ton kho ban duoc cho dung khoang ngay do) va luc check-in (chan gan dung
-- phong dang bi khoa).
--
-- Chay: psql -d <db> -f backend/database/migrations/add_room_type_rates_and_room_blocks.sql
-- Rollback: backend/database/migrations/add_room_type_rates_and_room_blocks_rollback.sql

BEGIN;

CREATE TABLE room_type_rates (
    id            BIGSERIAL PRIMARY KEY,
    room_type_id  BIGINT NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    rate_date     DATE NOT NULL,
    price         DECIMAL(12, 2) NOT NULL CHECK (price > 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (room_type_id, rate_date)
);

CREATE TABLE room_blocks (
    id          BIGSERIAL PRIMARY KEY,
    room_id     BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    reason      TEXT,
    created_by  BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_room_blocks_dates CHECK (end_date >= start_date)
);

-- Ho tro tra cuu nhanh khoa lich giao voi 1 khoang ngay theo tung phong.
CREATE INDEX idx_room_blocks_room_dates ON room_blocks (room_id, start_date, end_date);

COMMIT;
