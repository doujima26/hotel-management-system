-- Rollback split_payment_methods.sql - gop payment_methods tro lai cot JSONB tren
-- bang hotels va bo bang noi hotel_payment_methods.
-- Chay: psql -d <db> -f backend/database/migrations/split_payment_methods_rollback.sql

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS payment_methods JSONB NOT NULL DEFAULT '[]';

UPDATE hotels h SET payment_methods = COALESCE(
    (SELECT jsonb_agg(m.method::text ORDER BY m.method) FROM hotel_payment_methods m WHERE m.hotel_id = h.id),
    '[]'::jsonb
);

DROP TABLE IF EXISTS hotel_payment_methods;
