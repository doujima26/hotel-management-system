-- Rollback add_room_type_rates_and_room_blocks.sql - xoa 2 bang moi.
-- Chay: psql -d <db> -f backend/database/migrations/add_room_type_rates_and_room_blocks_rollback.sql

BEGIN;

DROP TABLE IF EXISTS room_blocks;
DROP TABLE IF EXISTS room_type_rates;

COMMIT;
