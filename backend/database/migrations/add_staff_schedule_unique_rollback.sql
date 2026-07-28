-- Rollback add_staff_schedule_unique.sql - bo rang buoc chong xep trung ca.
-- Chay: psql -d <db> -f backend/database/migrations/add_staff_schedule_unique_rollback.sql

ALTER TABLE staff_schedules DROP CONSTRAINT IF EXISTS uq_staff_shift;
