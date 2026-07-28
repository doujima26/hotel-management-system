-- Rollback add_invoice_buyer_seller_snapshot.sql - bo cac cot snapshot
-- buyer/seller tren invoices.
-- Chay: psql -d <db> -f backend/database/migrations/add_invoice_buyer_seller_snapshot_rollback.sql

ALTER TABLE invoices
    DROP COLUMN IF EXISTS buyer_name,
    DROP COLUMN IF EXISTS buyer_email,
    DROP COLUMN IF EXISTS buyer_phone,
    DROP COLUMN IF EXISTS seller_name,
    DROP COLUMN IF EXISTS seller_address,
    DROP COLUMN IF EXISTS seller_phone,
    DROP COLUMN IF EXISTS seller_email;
