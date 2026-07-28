-- Migration: tach danh muc tien nghi (amenities) thanh 2 pham vi doc lap:
-- HOTEL (tien nghi chung khach san, VD: ho boi, bai do xe, gym) va ROOM (tien
-- nghi rieng loai phong, VD: dieu hoa, TV, minibar). Truoc day 1 dong amenities
-- vua dung de tim kiem khach san (qua amenities.hotel_id) vua dung gan cho loai
-- phong (qua room_type_amenities), moi khach san tu tao rieng nen trung lap ten
-- (vd "Free WiFi" lap lai o hang chuc khach san) khong the loc/gom nhom chuan.
-- Sau migration: amenities la danh muc CHUNG toan he thong (chi Super Admin
-- tao/sua/xoa), hotel_amenities va room_type_amenities la 2 bang lien ket rieng
-- biet tuy theo scope cua tung dong amenities.
--
-- Du lieu cu duoc gop theo ten trung (giu id nho nhat lam canonical), giu
-- nguyen lien ket hien co: moi dong amenities cu -> 1 dong hotel_amenities
-- (bao toan hanh vi tim kiem cu dua tren amenities.hotel_id); ten nao dang
-- duoc gan cho loai phong (room_type_amenities) thi tao them 1 dong catalog
-- rieng scope=room cung ten, roi remap lien ket ve dong do (khong the dung
-- chung 1 dong id cho ca 2 scope). Da sao luu du lieu truoc migration vao
-- database/backups/before_amenity_invoice_split_20260728.sql.
--
-- Chay: psql -d <db> -f backend/database/migrations/add_amenity_scope_split.sql
-- Rollback: backend/database/migrations/add_amenity_scope_split_rollback.sql

BEGIN;

CREATE TYPE amenity_scope AS ENUM ('hotel', 'room');

ALTER TABLE amenities ADD COLUMN scope amenity_scope;
UPDATE amenities SET scope = 'hotel';

-- Xac dinh dong amenities "chinh" (canonical) cho moi ten trung, giu id nho nhat.
CREATE TEMP TABLE amenity_hotel_canonical AS
SELECT name, MIN(id) AS canonical_id
FROM amenities
GROUP BY name;

CREATE TABLE hotel_amenities (
    hotel_id    BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    amenity_id  BIGINT NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (hotel_id, amenity_id)
);

-- Bao toan hanh vi cu: moi khach san dang co dong amenities nao thi duoc gan
-- tien nghi do o cap khach san (qua hotel_amenities).
INSERT INTO hotel_amenities (hotel_id, amenity_id)
SELECT DISTINCT a.hotel_id, c.canonical_id
FROM amenities a
JOIN amenity_hotel_canonical c ON c.name = a.name;

-- hotel_id se bi xoa hoan toan o cuoi migration, cho phep NULL truoc de insert
-- duoc dong catalog scope=room moi (khong thuoc hotel nao ca).
ALTER TABLE amenities ALTER COLUMN hotel_id DROP NOT NULL;

-- Tao danh muc rieng scope=room cho nhung ten dang duoc gan vao loai phong.
INSERT INTO amenities (name, icon, category, scope)
SELECT DISTINCT c.name, a.icon, a.category, 'room'::amenity_scope
FROM room_type_amenities rta
JOIN amenities a ON a.id = rta.amenity_id
JOIN amenity_hotel_canonical c ON c.name = a.name;

-- Remap lien ket loai phong tu dong scope=hotel cu sang dong scope=room moi.
UPDATE room_type_amenities rta
SET amenity_id = room_scope.id
FROM amenities old_a
JOIN amenity_hotel_canonical c ON c.name = old_a.name
JOIN amenities room_scope ON room_scope.name = c.name AND room_scope.scope = 'room'
WHERE rta.amenity_id = old_a.id;

-- Xoa cac dong amenities scope=hotel bi trung ten (da gop ve canonical o tren).
DELETE FROM amenities
WHERE scope = 'hotel' AND id NOT IN (SELECT canonical_id FROM amenity_hotel_canonical);

ALTER TABLE amenities DROP CONSTRAINT uq_amenities_hotel_name;
ALTER TABLE amenities DROP COLUMN hotel_id;
ALTER TABLE amenities ALTER COLUMN scope SET NOT NULL;
ALTER TABLE amenities ADD CONSTRAINT uq_amenities_name_scope UNIQUE (name, scope);

DROP TABLE amenity_hotel_canonical;

COMMIT;
