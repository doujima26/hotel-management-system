-- Migration: doi diem danh gia (reviews.rating) tu thang 5 sao sang thang 10
-- diem. Truoc day khach chon 1-5 sao nhung cac trang cong khai lai nhan 2 de
-- hien thi thang 10 - moi noi mot kieu, va khach khong the cho diem le (7, 9).
-- Sau migration nay ca he thong chi con MOT thang duy nhat la 1-10.
--
-- THU TU CAC BUOC KHONG DUOC DOI CHO:
--  1. Noi hotels.avg_rating truoc: DECIMAL(3,2) chi chua toi 9.99 nen khong
--     luu duoc diem trung binh 10.00 (DB thuc te da co khach san avg = 5.00,
--     nhan 2 la tran ngay).
--  2. Sua ham trigger truoc khi nhan doi du lieu: fn_update_hotel_rating cast
--     cung DECIMAL(3,2) ben trong nen du cot da noi van tran.
--  3. Bo CHECK cu truoc khi UPDATE: rating * 2 se vuot nguong 5 cua CHECK cu.
--
-- LUU Y ve rollback: chia 2 khong phai phep nguoc chinh xac. Cac diem LE (1, 3,
-- 5, 7, 9) khi hoan nguyen se bi lam tron, khong tro lai duoc gia tri goc. Da
-- sao luu du lieu truoc migration vao
-- database/backups/before_review_ten_point_scale_20260730.sql (dung file nay
-- neu can khoi phuc chinh xac diem cu).
--
-- Khong lien quan hotels.star_rating: cot do la HANG SAO cua khach san (khach
-- san 4 sao, 5 sao) chu khong phai diem danh gia, van giu thang 1-5.
--
-- Chay: psql -d <db> -f backend/database/migrations/switch_review_rating_to_ten_point.sql
-- Rollback: backend/database/migrations/switch_review_rating_to_ten_point_rollback.sql

BEGIN;

-- 1. Noi cot diem trung binh de chua duoc 10.00.
ALTER TABLE hotels ALTER COLUMN avg_rating TYPE DECIMAL(4, 2);

-- 2. Sua cast trong ham trigger cho khop kieu cot moi.
CREATE OR REPLACE FUNCTION fn_update_hotel_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE hotels SET
        avg_rating = (
            SELECT COALESCE(AVG(rating)::DECIMAL(4,2), 0)
            FROM reviews WHERE hotel_id = COALESCE(NEW.hotel_id, OLD.hotel_id)
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews WHERE hotel_id = COALESCE(NEW.hotel_id, OLD.hotel_id)
        )
    WHERE id = COALESCE(NEW.hotel_id, OLD.hotel_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Doi nguong diem va quy doi du lieu dang co sang thang 10.
ALTER TABLE reviews DROP CONSTRAINT reviews_rating_check;

UPDATE reviews SET rating = rating * 2;

ALTER TABLE reviews ADD CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 10);

-- 4. Tinh lai diem trung binh cho moi khach san. Trigger o buoc 3 da chay theo
-- tung dong nhung tinh lai o day de chac chan khong con khach san nao ket lai
-- gia tri thang 5 (vi du khach san da bi xoa het danh gia truoc do).
UPDATE hotels h SET avg_rating = COALESCE(
    (SELECT AVG(r.rating)::DECIMAL(4,2) FROM reviews r WHERE r.hotel_id = h.id), 0
);

COMMIT;
