-- Rollback add_hotel_commission_and_payouts.sql
--
-- Canh bao: hotel_payouts la noi duy nhat ghi cac dot nen tang da chi tra cho
-- khach san. Xoa bang la mat toan bo lich su chi tra, khong con tinh lai duoc
-- cong no. Sao luu truoc khi chay neu da chay that:
--   pg_dump -d <db> -t hotel_payouts -f backups/hotel_payouts_<ngay>.sql
--
-- Cac cot hoa hong tren bookings cung bi xoa theo, nghia la mat ty le da chup
-- cua tung don.
--
-- Chay: psql -d <db> -f backend/database/migrations/add_hotel_commission_and_payouts_rollback.sql

BEGIN;

DROP TABLE IF EXISTS hotel_payouts;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ck_bookings_commission;
ALTER TABLE bookings DROP COLUMN IF EXISTS commission_amount;
ALTER TABLE bookings DROP COLUMN IF EXISTS commission_rate;

ALTER TABLE hotels DROP CONSTRAINT IF EXISTS ck_hotels_commission_rate;
ALTER TABLE hotels DROP COLUMN IF EXISTS commission_rate;

COMMIT;
