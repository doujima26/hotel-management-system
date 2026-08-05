-- Rollback add_sepay_transactions.sql - xoa bang nhat ky giao dich SePay.
--
-- Canh bao: bang nay la noi duy nhat luu cac giao dich chuyen khoan KHONG khop
-- duoc don (tien da vao tai khoan nhung chua xu ly). Xoa bang la mat dau vet
-- de doi soat va hoan tien. Sao luu bang truoc khi chay neu da chay that:
--   pg_dump -d <db> -t sepay_transactions -f backups/sepay_transactions_<ngay>.sql
--
-- Cac bang bookings/payments/invoices khong bi anh huong.
-- Chay: psql -d <db> -f backend/database/migrations/add_sepay_transactions_rollback.sql

BEGIN;

DROP TABLE IF EXISTS sepay_transactions;

COMMIT;
