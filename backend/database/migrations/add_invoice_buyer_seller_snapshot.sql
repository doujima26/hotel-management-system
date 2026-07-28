-- Migration: them cot chup lai (snapshot) thong tin nguoi mua/khach san vao
-- invoices tai thoi diem xuat hoa don, thay vi doc lai users/hotels luc hien
-- thi. Tranh hoa don cu bi doi noi dung neu sau nay user doi ten hoac khach san
-- doi ten/dia chi/lien he.
-- Du lieu cu (8 dong invoices hien co) duoc backfill tu users/hotels hien tai
-- (gan dung nhat co the, vi du cu khong luu snapshot that su tai thoi diem do).
-- Da sao luu du lieu truoc migration vao
-- database/backups/before_amenity_invoice_split_20260728.sql.
-- Chay: psql -d <db> -f backend/database/migrations/add_invoice_buyer_seller_snapshot.sql
-- Rollback: backend/database/migrations/add_invoice_buyer_seller_snapshot_rollback.sql

BEGIN;

ALTER TABLE invoices
    ADD COLUMN buyer_name     VARCHAR(255),
    ADD COLUMN buyer_email    VARCHAR(255),
    ADD COLUMN buyer_phone    VARCHAR(20),
    ADD COLUMN seller_name    VARCHAR(255),
    ADD COLUMN seller_address TEXT,
    ADD COLUMN seller_phone   VARCHAR(20),
    ADD COLUMN seller_email   VARCHAR(255);

UPDATE invoices i
SET buyer_name = u.full_name,
    buyer_email = u.email,
    buyer_phone = u.phone
FROM users u
WHERE u.id = i.user_id;

UPDATE invoices i
SET seller_name = h.name,
    seller_address = h.address || COALESCE(', ' || h.district, '') || ', ' || h.city,
    seller_phone = h.phone,
    seller_email = h.email
FROM hotels h
WHERE h.id = i.hotel_id;

ALTER TABLE invoices
    ALTER COLUMN buyer_name SET NOT NULL,
    ALTER COLUMN buyer_email SET NOT NULL,
    ALTER COLUMN seller_name SET NOT NULL,
    ALTER COLUMN seller_address SET NOT NULL;

COMMIT;
