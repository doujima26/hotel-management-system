-- Rollback cho switch_review_rating_to_ten_point.sql: dua diem danh gia tu
-- thang 10 ve lai thang 5 sao.
--
-- KHONG PHAI PHEP NGUOC CHINH XAC: chia 2 roi lam tron nen cac diem LE se lech
-- so voi truoc migration. Vi du 7 -> 4 (thay vi 3.5), 9 -> 5 (thay vi 4.5). Neu
-- can khoi phuc dung du lieu goc thi dung ban sao luu
-- database/backups/before_review_ten_point_scale_20260730.sql.
--
-- GREATEST(1, ...) de diem 1 (thang 10) khong bi lam tron thanh 0 va vi pham
-- CHECK moi.
--
-- Chay: psql -d <db> -f backend/database/migrations/switch_review_rating_to_ten_point_rollback.sql

BEGIN;

ALTER TABLE reviews DROP CONSTRAINT reviews_rating_check;

UPDATE reviews SET rating = GREATEST(1, ROUND(rating / 2.0));

ALTER TABLE reviews ADD CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 5);

CREATE OR REPLACE FUNCTION fn_update_hotel_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE hotels SET
        avg_rating = (
            SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
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

-- Tinh lai diem trung binh theo thang 5 TRUOC khi thu hep cot, neu khong cac
-- gia tri thang 10 dang luu se lam ALTER COLUMN that bai vi tran DECIMAL(3,2).
UPDATE hotels h SET avg_rating = COALESCE(
    (SELECT AVG(r.rating)::DECIMAL(3,2) FROM reviews r WHERE r.hotel_id = h.id), 0
);

ALTER TABLE hotels ALTER COLUMN avg_rating TYPE DECIMAL(3, 2);

COMMIT;
