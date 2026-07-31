-- Rollback cho add_admin_action_logs.sql: bo bang nhat ky hanh dong quan tri.
--
-- CANH BAO: xoa bang nay la MAT TOAN BO nhat ky kiem toan da ghi, khong khoi
-- phuc duoc bang bat ky script nao. Neu chi muon tam ngung ghi nhat ky thi sua
-- code, dung chay rollback nay. Ban sao luu cau truc truoc migration nam o
-- database/backups/before_admin_action_logs_20260731.sql (chi la schema, khong
-- chua du lieu nhat ky vi luc do bang chua ton tai).
--
-- Chay: psql -d <db> -f backend/database/migrations/add_admin_action_logs_rollback.sql

BEGIN;

DROP TABLE IF EXISTS admin_action_logs;

COMMIT;
