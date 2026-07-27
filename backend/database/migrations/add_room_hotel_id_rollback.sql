-- Rollback add_room_hotel_id.sql - bo cot hotel_id, tra rang buoc duy nhat ve
-- (room_type_id, room_number) nhu truoc.
-- Chay: psql -d <db> -f backend/database/migrations/add_room_hotel_id_rollback.sql

ALTER TABLE rooms DROP CONSTRAINT IF EXISTS uq_room_hotel_number;
ALTER TABLE rooms ADD CONSTRAINT rooms_room_type_id_room_number_key UNIQUE (room_type_id, room_number);

ALTER TABLE rooms DROP CONSTRAINT IF EXISTS fk_rooms_hotel;
ALTER TABLE rooms DROP COLUMN IF EXISTS hotel_id;
