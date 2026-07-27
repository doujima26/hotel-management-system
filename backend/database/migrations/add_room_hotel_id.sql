-- Migration: them cot hotel_id vao bang rooms va doi rang buoc duy nhat tu
-- (room_type_id, room_number) sang (hotel_id, room_number) - dam bao 1 so
-- phong chi ton tai 1 lan trong toan khach san, khong phai rieng tung loai
-- phong (truoc day "Deluxe 101" va "Suite 101" co the cung ton tai o cung 1
-- khach san, khong dung thuc te vi 1 phong vat ly chi co dung 1 so).
-- Chay: psql -d <db> -f backend/database/migrations/add_room_hotel_id.sql
-- Rollback: backend/database/migrations/add_room_hotel_id_rollback.sql

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS hotel_id BIGINT;

-- Backfill hotel_id tu room_type lien ket.
UPDATE rooms r
SET hotel_id = rt.hotel_id
FROM room_types rt
WHERE r.room_type_id = rt.id AND r.hotel_id IS NULL;

ALTER TABLE rooms
    ALTER COLUMN hotel_id SET NOT NULL,
    ADD CONSTRAINT fk_rooms_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE RESTRICT;

ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_room_type_id_room_number_key;
ALTER TABLE rooms ADD CONSTRAINT uq_room_hotel_number UNIQUE (hotel_id, room_number);
