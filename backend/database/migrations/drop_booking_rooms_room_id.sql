-- Migration: xoa cot booking_rooms.room_id (legacy, mau thuan voi
-- booking_room_units) - cot nay chi gan duoc 1 phong/dong nen khong du dung
-- khi quantity > 1, da duoc thay the hoan toan boi booking_room_units.room_id.
-- Da xac minh: khong noi nao trong code doc/ghi BookingRoom.room_id, va
-- BookingRoomResponse (schema tra ve API) cung khong expose cot nay.
-- Chay: psql -d <db> -f backend/database/migrations/drop_booking_rooms_room_id.sql
-- Rollback: backend/database/migrations/drop_booking_rooms_room_id_rollback.sql

ALTER TABLE booking_rooms DROP COLUMN IF EXISTS room_id;
