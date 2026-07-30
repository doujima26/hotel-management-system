-- Rollback cho add_amenity_categories.sql: dua danh muc con cua tien nghi tro
-- lai thanh 1 cot chu tu do tren bang amenities, bo bang amenity_categories.
-- Du lieu duoc bao toan: ten danh muc duoc chep nguoc lai vao cot category
-- truoc khi bo cot category_id va xoa bang.
--
-- Chay: psql -d <db> -f backend/database/migrations/add_amenity_categories_rollback.sql

BEGIN;

ALTER TABLE amenities ADD COLUMN category VARCHAR(50);

UPDATE amenities a
SET category = c.name
FROM amenity_categories c
WHERE a.category_id = c.id;

ALTER TABLE amenities DROP COLUMN category_id;

DROP TABLE amenity_categories;

COMMIT;
