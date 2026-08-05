-- Migration: them bang sepay_transactions - nhat ky moi giao dich chuyen khoan
-- SePay bao ve qua webhook. Khong dong den bang/du lieu hien co, chi them moi.
--
-- Bang nay giu 2 vai tro:
--
-- 1. Chong trung. SePay gui lai webhook toi 7 lan neu server tra loi, va quan
--    tri vien con bam gui lai tay duoc. Khoa UNIQUE tren sepay_id khien lan
--    ghi thu hai that bai, nho do 1 lan chuyen khoan khong the sinh ra 2
--    thanh toan.
--
-- 2. Luu ca giao dich KHONG khop duoc don. Tien da vao tai khoan thi khong tu
--    choi duoc: khach chuyen muon sau khi don da huy, chuyen thieu tien, hoac
--    go sai noi dung. Nhung ca do van phai luu lai de con biet duong hoan tien,
--    thay vi bi bo qua im lang.
--
-- Chay: psql -d <db> -f backend/database/migrations/add_sepay_transactions.sql
-- Rollback: backend/database/migrations/add_sepay_transactions_rollback.sql

BEGIN;

CREATE TABLE sepay_transactions (
    id                BIGSERIAL PRIMARY KEY,
    -- id giao dich ben SePay. Khong doi qua cac lan gui lai nen dung lam khoa
    -- chong trung.
    sepay_id          BIGINT NOT NULL UNIQUE,
    -- Ma thanh toan SePay boc tach duoc tu noi dung chuyen khoan (chinh la
    -- booking_code). NULL khi noi dung khong khop cau hinh ma.
    payment_code      VARCHAR(20),
    -- Don khop duoc, NULL khi chua khop duoc don nao.
    booking_id        BIGINT REFERENCES bookings(id) ON DELETE RESTRICT,
    -- Thanh toan sinh ra tu giao dich nay, NULL khi chua khop.
    payment_id        BIGINT REFERENCES payments(id) ON DELETE RESTRICT,
    -- So tien khach chuyen that, don vi VND (SePay tra ve so nguyen duong).
    transfer_amount   BIGINT NOT NULL CHECK (transfer_amount > 0),
    gateway           VARCHAR(50) NOT NULL,
    account_number    VARCHAR(50) NOT NULL,
    -- Noi dung chuyen khoan goc tu ngan hang, giu nguyen de doi soat tay.
    content           TEXT NOT NULL,
    reference_code    VARCHAR(100),
    transaction_date  TIMESTAMPTZ NOT NULL,
    -- matched: da khop va tao thanh toan. unmatched: khong tim duoc don hop le,
    -- can nguoi xu ly. refunded: da hoan tien cho khach.
    status            VARCHAR(20) NOT NULL DEFAULT 'unmatched',
    -- Ly do khong khop duoc, de nguoi xu ly biet chuyen gi da xay ra.
    note              TEXT,
    -- Toan bo payload goc, phong khi can dieu tra ve sau.
    raw_payload       JSONB NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_sepay_transactions_status
        CHECK (status IN ('matched', 'unmatched', 'refunded')),

    -- Da khop thi bat buoc co ca don lan thanh toan; chua khop thi khong duoc
    -- co cai nao - tranh trang thai nua voi kho lan.
    CONSTRAINT ck_sepay_transactions_matched
        CHECK (
            (status = 'matched' AND booking_id IS NOT NULL AND payment_id IS NOT NULL)
            OR (status <> 'matched' AND payment_id IS NULL)
        )
);

-- Man hinh doi soat cua Admin loc theo trang thai, moi nhat len truoc.
CREATE INDEX idx_sepay_transactions_status ON sepay_transactions (status, transaction_date DESC);

-- Tra cuu nguoc tu don ve giao dich da tra tien cho don do.
CREATE INDEX idx_sepay_transactions_booking ON sepay_transactions (booking_id);

CREATE TRIGGER trg_sepay_transactions_updated_at
    BEFORE UPDATE ON sepay_transactions FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

COMMIT;
