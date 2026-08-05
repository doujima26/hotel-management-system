-- Migration: them hoa hong nen tang va so ghi cac dot chi tra cho khach san.
--
-- He thong thu tien theo mo hinh thuong nhan: khach chuyen khoan vao 1 tai
-- khoan duy nhat cua nen tang, nen tang giu ho roi chi tra lai cho khach san
-- sau khi tru hoa hong. Truoc migration nay he thong khong ghi lai khoan no do
-- o dau ca.
--
-- Cong no voi 1 khach san = tong (tien don - hoa hong) cua cac don DA THU TIEN,
-- tru di tong cac dot da chi tra.
--
-- Chay: psql -d <db> -f backend/database/migrations/add_hotel_commission_and_payouts.sql
-- Rollback: backend/database/migrations/add_hotel_commission_and_payouts_rollback.sql

BEGIN;

-- Ty le hoa hong hien tai cua khach san, do Super Admin dat. Chi dung cho don
-- MOI; don da tao giu ty le da chup o bang bookings.
ALTER TABLE hotels
    ADD COLUMN commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00;

ALTER TABLE hotels
    ADD CONSTRAINT ck_hotels_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 100);

-- Chup ty le va so tien hoa hong ngay luc tao don, giong cach booking_rooms
-- chup gia phong. Neu chi luu ty le o bang hotels roi nhan nguoc de tinh cong
-- no thi moi lan Super Admin doi ty le se lam sai lech toan bo don cu.
--
-- Mac dinh 0 cho don da co: chung duoc tao truoc khi co mo hinh hoa hong, gan
-- nguoc ty le vao la bia ra so lieu chua tung ton tai.
ALTER TABLE bookings
    ADD COLUMN commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE bookings
    ADD COLUMN commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE bookings
    ADD CONSTRAINT ck_bookings_commission CHECK (
        commission_rate >= 0 AND commission_rate <= 100
        AND commission_amount >= 0
        AND commission_amount <= total_amount
    );

-- -------------------------------------------------------
-- hotel_payouts - Cac dot nen tang chi tra tien cho khach san
-- -------------------------------------------------------
-- Viec chuyen tien that lam ngoai he thong (Super Admin chuyen khoan tay); bang
-- nay chi ghi nhan lai de tinh duoc con no bao nhieu.
CREATE TABLE hotel_payouts (
    id           BIGSERIAL PRIMARY KEY,
    hotel_id     BIGINT NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
    amount       DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    -- Ky doi soat cua dot chi tra, de trong neu khong gan voi ky nao.
    period_from  DATE,
    period_to    DATE,
    -- Ma giao dich chuyen khoan hoac ghi chu doi soat.
    reference    VARCHAR(255),
    note         TEXT,
    -- Super Admin ghi nhan dot chi tra nay.
    created_by   BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_hotel_payouts_period CHECK (
        period_from IS NULL OR period_to IS NULL OR period_to >= period_from
    )
);

-- Man hinh doi soat cong tong tien da chi cho tung khach san.
CREATE INDEX idx_hotel_payouts_hotel ON hotel_payouts (hotel_id, created_at DESC);

COMMIT;
