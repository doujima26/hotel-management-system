-- Migration: chan xep trung ca cho 1 nhan vien. Khoa theo TUNG NHAN VIEN
-- (staff_id, shift_date, shift_type) - khong chan nhieu nhan vien khac nhau
-- cung lam chung 1 ca (van la nghiep vu binh thuong), chi chan 1 nhan vien bi
-- xep trung dung 1 ca, dung 1 ngay (loi nhap lieu).
-- Chay: psql -d <db> -f backend/database/migrations/add_staff_schedule_unique.sql
-- Rollback: backend/database/migrations/add_staff_schedule_unique_rollback.sql

ALTER TABLE staff_schedules
    ADD CONSTRAINT uq_staff_shift UNIQUE (staff_id, shift_date, shift_type);
