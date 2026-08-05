-- Va du lieu cu: dien hoa hong cho cac don da co truoc khi he thong co mo hinh
-- hoa hong, va giai ty le hoa hong ra nhieu muc thay vi de tat ca cung 10%.
--
-- Day la script VA DU LIEU, khong doi cau truc bang. Chi chay tren du lieu da
-- co san; du lieu seed moi tu sinh san hoa hong nen khong can chay.
--
-- Vi sao can: migration add_hotel_commission_and_payouts dat mac dinh
-- commission_amount = 0 cho don cu (khong bia so lieu chua tung ton tai). Hop ly
-- ve nguyen tac nhung lam man hinh doi soat hien nen tang no khach san TOAN BO
-- doanh thu voi hoa hong 0 - nhin nhu tinh nang chua chay.
--
-- LUU Y: file dung toan tu % nen phai chay bang psql, khong chay qua psycopg2.
-- Chay: psql -d <db> -f backend/database/migrations/backfill_commission_existing_data.sql
-- Rollback: backend/database/migrations/backfill_commission_existing_data_rollback.sql

BEGIN;

-- Giai ty le hoa hong tu 8 den 12 phan tram theo khach san, giong cach seed lam.
UPDATE hotels SET commission_rate = 8 + (id % 5);

-- Chup ty le cua khach san vao tung don cu.
UPDATE bookings b
SET commission_rate = h.commission_rate
FROM hotels h
WHERE h.id = b.hotel_id;

-- Hoa hong tinh tren TIEN PHONG sau khuyen mai, khong tinh tren dich vu them -
-- giong het cong thuc booking_service._tinh_hoa_hong dung khi tao don that.
UPDATE bookings
SET commission_amount = round((total_room_price - discount_amount) * commission_rate / 100);

-- Ghi vai dot da chi tra bang 60 phan tram so phai tra, de man hinh doi soat
-- con cong no thay vi hien nguyen mot cot chua tra dong nao.
--
-- Bo qua khach san da co BAT KY dot chi tra nao, khong chi dot do script nay
-- sinh ra. Hai buoc UPDATE o tren chay lai bao nhieu lan cung ra cung ket qua,
-- nhung INSERT thi khong: ghi them mot dot cho khach san da duoc chi tra se lam
-- da chi vuot so phai tra va cong no am.
--
-- Kiem theo note cua rieng script la khong du - dot do Super Admin tu ghi qua
-- giao dien khong co note nen se lot qua.
INSERT INTO hotel_payouts (hotel_id, amount, period_from, period_to, reference, note, created_by, created_at)
SELECT
    x.hotel_id,
    round(x.phai_tra * 0.6),
    CURRENT_DATE - 60,
    CURRENT_DATE - 30,
    'FT' || lpad(x.hotel_id::text, 8, '0'),
    'Doi soat ky thang truoc',
    (SELECT id FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1),
    now() - INTERVAL '20 days'
FROM (
    SELECT b.hotel_id, sum(b.total_amount - b.commission_amount) AS phai_tra
    FROM bookings b
    JOIN payments p ON p.booking_id = b.id AND p.payment_status = 'completed'
    GROUP BY b.hotel_id
) x
WHERE x.phai_tra > 0
  AND NOT EXISTS (SELECT 1 FROM hotel_payouts hp WHERE hp.hotel_id = x.hotel_id);

COMMIT;
