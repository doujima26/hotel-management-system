-- Migration: chuyen icon tu tung TIEN NGHI len DANH MUC tien nghi. Truoc day
-- moi dong amenities co icon rieng (wifi, coffee, dumbbell...), gio icon thuoc
-- ve danh muc (amenity_categories) - moi tien nghi trong cung 1 danh muc dung
-- chung icon cua danh muc do, hien o tieu de nhom.
--
-- Icon cua danh muc duoc SUY RA tu icon pho bien nhat trong cac tien nghi
-- dang thuoc danh muc do (thay vi bo trang), de khong mat het cong nhap lieu
-- cu. Truong hop hoa: neu nhieu icon cung so luong thi lay theo thu tu ten
-- icon de ket qua on dinh, khong phu thuoc thu tu dong trong bang.
--
-- LUU Y ve rollback: icon rieng cua tung tien nghi se MAT sau migration nay
-- (cot bi drop). Script rollback chi khoi phuc duoc icon o muc danh muc - moi
-- tien nghi se nhan icon cua danh muc no thuoc ve, khong tro lai icon rieng
-- ban dau. Da sao luu du lieu truoc migration vao
-- database/backups/before_move_icon_to_category_20260730.sql (dung file nay
-- neu can khoi phuc chinh xac icon cu cua tung tien nghi).
--
-- Chay: psql -d <db> -f backend/database/migrations/move_amenity_icon_to_category.sql
-- Rollback: backend/database/migrations/move_amenity_icon_to_category_rollback.sql

BEGIN;

ALTER TABLE amenity_categories ADD COLUMN icon VARCHAR(100);

-- Suy icon cho tung danh muc tu icon pho bien nhat cua cac tien nghi ben trong.
UPDATE amenity_categories c
SET icon = (
    SELECT a.icon
    FROM amenities a
    WHERE a.category_id = c.id AND a.icon IS NOT NULL AND a.icon <> ''
    GROUP BY a.icon
    ORDER BY COUNT(*) DESC, a.icon ASC
    LIMIT 1
);

ALTER TABLE amenities DROP COLUMN icon;

COMMIT;
