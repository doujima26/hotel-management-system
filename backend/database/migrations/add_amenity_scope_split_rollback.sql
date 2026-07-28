-- Rollback add_amenity_scope_split.sql - dua schema amenities/room_type_amenities
-- ve dang truoc khi tach scope. KHONG khoi phuc du lieu da gop/xoa trong qua
-- trinh migrate (hotel_id se NULL het) - dung file backup
-- database/backups/before_amenity_invoice_split_20260728.sql neu can khoi phuc
-- du lieu that.
-- Chay: psql -d <db> -f backend/database/migrations/add_amenity_scope_split_rollback.sql

ALTER TABLE amenities DROP CONSTRAINT IF EXISTS uq_amenities_name_scope;
ALTER TABLE amenities ADD COLUMN IF NOT EXISTS hotel_id BIGINT REFERENCES hotels(id) ON DELETE CASCADE;
ALTER TABLE amenities DROP COLUMN IF EXISTS scope;
DROP TABLE IF EXISTS hotel_amenities;
DROP TYPE IF EXISTS amenity_scope;
ALTER TABLE amenities ADD CONSTRAINT uq_amenities_hotel_name UNIQUE (hotel_id, name);
