-- Migration: tach so luong giuong ra khoi bed_type bang cot moi bed_count.
--
-- Truoc day bed_type la mot cot chu tron gom lan ca LOAI giuong va SO LUONG:
-- "Twin" nghia la 2 giuong don, con "King" nghia la 1 giuong King. Nguoi doc
-- khong biet "Double" la 1 hay 2 giuong, va khong co cach nao ghi "2 giuong
-- King" cho phong gia dinh. Du lieu that dang co 9 loai phong suc chua tu 3
-- khach tro len ma chi ghi mot cai giuong (3 loai phong 4 khach ghi 'King').
--
-- Sau migration: bed_type chi con la LOAI giuong (Single/Double/Queen/King/
-- Bunk/Sofa), bed_count la so luong. Hien cho khach dang "2 x giuong King".
--
-- Ca hai cot deu de trong duoc (thong tin nay chi de mo ta, khong tham gia
-- tinh suc chua hay gia - suc chua van do max_guests quyet dinh). Tang service
-- kiem tra khong cho nhap so luong khi chua chon loai giuong; CHECK duoi day
-- chi chan gia tri phi ly (0, so am).
--
-- LUU Y ve rollback: rollback gop 'Single' + so luong 2 tro lai thanh 'Twin',
-- nhung KHONG the giu lai cac cau hinh moi tao sau migration nay nhu "King x 2"
-- - chung se mat so luong va chi con 'King'. Da sao luu du lieu truoc migration
-- vao database/backups/before_room_type_bed_count_20260730.sql.
--
-- Chay: psql -d <db> -f backend/database/migrations/add_room_type_bed_count.sql
-- Rollback: backend/database/migrations/add_room_type_bed_count_rollback.sql

BEGIN;

ALTER TABLE room_types ADD COLUMN bed_count SMALLINT CHECK (bed_count > 0);

-- 'Twin' khong phai mot loai giuong ma la 2 giuong don - tach dung nghia.
UPDATE room_types SET bed_type = 'Single', bed_count = 2 WHERE bed_type = 'Twin';

-- Cac loai giuong con lai von chi ta 1 chiec giuong.
UPDATE room_types SET bed_count = 1 WHERE bed_type IS NOT NULL AND bed_count IS NULL;

COMMIT;
