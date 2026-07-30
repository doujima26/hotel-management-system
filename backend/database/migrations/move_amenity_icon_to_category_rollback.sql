-- Rollback cho move_amenity_icon_to_category.sql: dua icon tro lai cap tien
-- nghi, bo icon cua danh muc.
--
-- LUU Y: khong khoi phuc duoc icon RIENG ban dau cua tung tien nghi (da bi
-- drop o migration xuoi). Script nay gan icon cua danh muc cho tat ca tien
-- nghi thuoc danh muc do. Neu can dung y icon cu cua tung tien nghi, khoi
-- phuc tu database/backups/before_move_icon_to_category_20260730.sql.
--
-- Chay: psql -d <db> -f backend/database/migrations/move_amenity_icon_to_category_rollback.sql

BEGIN;

ALTER TABLE amenities ADD COLUMN icon VARCHAR(100);

UPDATE amenities a
SET icon = c.icon
FROM amenity_categories c
WHERE a.category_id = c.id;

ALTER TABLE amenity_categories DROP COLUMN icon;

COMMIT;
