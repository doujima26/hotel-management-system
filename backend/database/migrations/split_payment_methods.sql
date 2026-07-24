-- Migration: tach payment_methods (mang JSONB tren hotels) thanh bang noi 1-nhieu
-- hotel_payment_methods (chuan hoa thuoc tinh da tri).
-- Chay: psql -d <db> -f backend/database/migrations/split_payment_methods.sql
-- Rollback: backend/database/migrations/split_payment_methods_rollback.sql

CREATE TABLE IF NOT EXISTS hotel_payment_methods (
    hotel_id BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    method   payment_method NOT NULL,
    PRIMARY KEY (hotel_id, method)
);

-- Chuyen du lieu dang co tu cot JSONB payment_methods sang bang noi (neu co).
INSERT INTO hotel_payment_methods (hotel_id, method)
SELECT id, elem::payment_method
FROM hotels, jsonb_array_elements_text(payment_methods) AS elem
ON CONFLICT DO NOTHING;

ALTER TABLE hotels DROP COLUMN IF EXISTS payment_methods;
