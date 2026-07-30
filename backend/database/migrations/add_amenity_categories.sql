-- Migration: tach danh muc con cua tien nghi (amenities.category) thanh 1 bang
-- rieng amenity_categories. Truoc day category chi la 1 cot chu tu do
-- VARCHAR(50) do Super Admin go tay, dan den 2 van de: (1) khong the tao truoc
-- 1 danh muc rong roi gan tien nghi vao - danh muc chi ton tai khi da co it
-- nhat 1 tien nghi mang chuoi do; (2) go tay nen du lieu lech nhau (DB dang co
-- 'general'/'view'/'room'/'activity' tieng Anh chu thuong lan voi 'Bep' tieng
-- Viet viet hoa), trong khi trang Admin gom tien nghi THEO category nen moi
-- bien the chinh ta se thanh 1 nhom rieng.
--
-- Sau migration: amenity_categories la danh muc dung chung cho CA 2 pham vi
-- tien nghi (hotel va room - khop du lieu hien tai, cac danh muc general/view/
-- room dang duoc dung o ca 2 scope). amenities.category_id tham chieu sang
-- bang nay voi ON DELETE RESTRICT (chan xoa danh muc dang con tien nghi - tang
-- service kiem tra truoc de tra thong bao tieng Viet, rang buoc DB la luoi an
-- toan cuoi). Hop dong API khong doi: AmenityResponse.category VAN tra ve
-- chuoi ten danh muc (lay qua quan he), chi them category_id.
--
-- Da sao luu du lieu truoc migration vao
-- database/backups/before_amenity_categories_20260729.sql.
--
-- Chay: psql -d <db> -f backend/database/migrations/add_amenity_categories.sql
-- Rollback: backend/database/migrations/add_amenity_categories_rollback.sql

BEGIN;

CREATE TABLE amenity_categories (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chuyen cac gia tri category dang chu hien co thanh dong trong bang danh muc.
INSERT INTO amenity_categories (name)
SELECT DISTINCT TRIM(category)
FROM amenities
WHERE category IS NOT NULL AND TRIM(category) <> '';

ALTER TABLE amenities
    ADD COLUMN category_id BIGINT REFERENCES amenity_categories(id) ON DELETE RESTRICT;

UPDATE amenities a
SET category_id = c.id
FROM amenity_categories c
WHERE TRIM(a.category) = c.name;

ALTER TABLE amenities DROP COLUMN category;

COMMIT;
