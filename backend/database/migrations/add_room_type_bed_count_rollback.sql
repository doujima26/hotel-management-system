-- Rollback cho add_room_type_bed_count.sql: gop so luong giuong tro lai vao
-- cot bed_type roi bo cot bed_count.
--
-- KHONG PHAI PHEP NGUOC HOAN TOAN: chi khoi phuc duoc truong hop 'Single' voi
-- so luong 2 (ve lai 'Twin'). Cac cau hinh khac co so luong > 1 duoc tao sau
-- migration (vi du 'King' x 2) se MAT so luong, chi con lai ten loai giuong.
-- Neu can du lieu chinh xac truoc migration thi dung ban sao luu
-- database/backups/before_room_type_bed_count_20260730.sql.
--
-- Chay: psql -d <db> -f backend/database/migrations/add_room_type_bed_count_rollback.sql

BEGIN;

UPDATE room_types SET bed_type = 'Twin' WHERE bed_type = 'Single' AND bed_count = 2;

ALTER TABLE room_types DROP COLUMN bed_count;

COMMIT;
