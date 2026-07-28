-- Rollback drop_booking_rooms_room_id.sql - them lai cot room_id (nullable,
-- khong khoi phuc du lieu cu vi da xoa vinh vien).
-- Chay: psql -d <db> -f backend/database/migrations/drop_booking_rooms_room_id_rollback.sql

ALTER TABLE booking_rooms ADD COLUMN IF NOT EXISTS room_id BIGINT REFERENCES rooms(id);
