-- Rollback backfill_commission_existing_data.sql - dua du lieu ve dung trang
-- thai ngay sau khi chay migration add_hotel_commission_and_payouts.
--
-- Canh bao: chi xoa cac dot chi tra do script va sinh ra (nhan dien qua note
-- 'Doi soat ky thang truoc'). Dot chi tra Super Admin tu ghi qua giao dien co
-- note khac nen khong bi dung toi - nhung neu ai do ghi tay dung y het chuoi do
-- thi ban ghi that cung se bi xoa. Kiem lai truoc khi chay neu da dung mot thoi
-- gian:
--   SELECT * FROM hotel_payouts WHERE note = 'Doi soat ky thang truoc';
--
-- Chay: psql -d <db> -f backend/database/migrations/backfill_commission_existing_data_rollback.sql

BEGIN;

DELETE FROM hotel_payouts WHERE note = 'Doi soat ky thang truoc';

UPDATE bookings SET commission_rate = 0, commission_amount = 0;

UPDATE hotels SET commission_rate = 10.00;

COMMIT;
