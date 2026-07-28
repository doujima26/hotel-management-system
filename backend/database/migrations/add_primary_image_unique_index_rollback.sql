-- Rollback add_primary_image_unique_index.sql - bo 2 partial unique index.
-- Chay: psql -d <db> -f backend/database/migrations/add_primary_image_unique_index_rollback.sql

DROP INDEX IF EXISTS uq_hotel_primary_img;
DROP INDEX IF EXISTS uq_rt_primary_img;
