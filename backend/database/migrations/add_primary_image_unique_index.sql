-- Migration: dam bao chi 1 anh dai dien (is_primary=true) moi hotel/room_type.
-- Logic ung dung da tu unset cac anh khac truoc khi set anh moi lam dai dien
-- (create_hotel_image_record, set_hotel_image_primary trong hotel_repository.py
-- va tuong tu trong room_repository.py), nhung khong khoa row nen van co khe ho
-- race condition giua 2 request dat dai dien cung luc. Partial unique index la
-- luoi an toan o tang DB.
-- Chay: psql -d <db> -f backend/database/migrations/add_primary_image_unique_index.sql
-- Rollback: backend/database/migrations/add_primary_image_unique_index_rollback.sql

CREATE UNIQUE INDEX IF NOT EXISTS uq_hotel_primary_img ON hotel_images (hotel_id) WHERE is_primary;
CREATE UNIQUE INDEX IF NOT EXISTS uq_rt_primary_img ON room_type_images (room_type_id) WHERE is_primary;
