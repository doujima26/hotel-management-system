-- Seed data cho hotel-management-system.
--
-- Cach to chuc: du lieu GOC (nguoi dung, khach san, loai phong, nhan su, dich vu,
-- khuyen mai) khai bao tuong minh tung dong de doc va sua duoc; du lieu GIAO DICH
-- (booking, thanh toan, hoa don, check-in, lich ca, nhat ky) sinh bang
-- INSERT ... SELECT tu du lieu goc de cac con so luon khop nhau.
--
-- Moi moc thoi gian deu tinh theo CURRENT_DATE nen du lieu khong cu di theo thoi gian.
--
-- Mat khau dang nhap chung cho MOI tai khoan seed: Password123!
-- (hash bcrypt that, tao tu app.core.security.hash_password - dang nhap duoc ngay).

BEGIN;

-- ============================================================
-- 1. NGUOI DUNG
-- ============================================================
INSERT INTO users (email, password_hash, full_name, phone, role, is_active, is_verified)
SELECT
    email,
    '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um',
    full_name,
    phone,
    role::user_role,
    is_active,
    is_verified
FROM (VALUES
    ('superadmin@gmail.com', 'Super Admin', '0900000001', 'super_admin', true, true),

    ('owner1@gmail.com', 'Nguyen Van Chu KS 1', '0900000101', 'admin', true, true),
    ('owner2@gmail.com', 'Tran Van Chu KS 2', '0900000102', 'admin', true, true),
    ('owner3@gmail.com', 'Le Van Chu KS 3', '0900000103', 'admin', true, true),
    ('owner4@gmail.com', 'Pham Thi Chu KS 4', '0900000104', 'admin', true, true),
    ('owner5@gmail.com', 'Hoang Van Chu KS 5', '0900000105', 'admin', true, true),
    ('owner6@gmail.com', 'Vu Thi Chu KS 6', '0900000106', 'admin', true, true),
    ('owner7@gmail.com', 'Dang Van Chu KS 7', '0900000107', 'admin', true, true),
    ('owner8@gmail.com', 'Bui Thi Chu KS 8', '0900000108', 'admin', true, true),
    ('owner9@gmail.com', 'Do Van Chu KS 9', '0900000109', 'admin', true, true),
    ('owner10@gmail.com', 'Ngo Thi Chu KS 10', '0900000110', 'admin', true, true),
    ('owner11@gmail.com', 'Duong Van Chu KS 11', '0900000111', 'admin', true, true),
    ('owner12@gmail.com', 'Ly Thi Chu KS 12', '0900000112', 'admin', true, true),
    ('owner13@gmail.com', 'Trinh Van Chu KS 13', '0900000113', 'admin', true, true),
    ('owner14@gmail.com', 'Mai Thi Chu KS 14', '0900000114', 'admin', true, true),
    ('owner15@gmail.com', 'Phan Van Chu KS 15', '0900000115', 'admin', true, true),
    -- Chu khach san dang cho duyet / bi tu choi ho so.
    ('owner16@gmail.com', 'Cao Van Chu KS Cho Duyet', '0900000116', 'admin', true, true),
    ('owner17@gmail.com', 'Ha Thi Chu KS Cho Duyet 2', '0900000117', 'admin', true, true),
    ('owner18@gmail.com', 'Ton Van Chu KS Bi Tu Choi', '0900000118', 'admin', true, true),
    -- Tai khoan admin chua dang ky khach san nao.
    ('owner19@gmail.com', 'Kieu Thi Chua Co Khach San', '0900000119', 'admin', true, true),

    ('staff1@gmail.com', 'Le Thi Le Tan 1', '0900000201', 'staff', true, true),
    ('staff2@gmail.com', 'Pham Van Le Tan 2', '0900000202', 'staff', true, true),
    ('staff3@gmail.com', 'Nguyen Thi Buong Phong 3', '0900000203', 'staff', true, true),
    ('staff4@gmail.com', 'Tran Van Le Tan 4', '0900000204', 'staff', true, true),
    ('staff5@gmail.com', 'Hoang Thi Le Tan 5', '0900000205', 'staff', true, true),
    ('staff6@gmail.com', 'Vu Van Buong Phong 6', '0900000206', 'staff', true, true),
    ('staff7@gmail.com', 'Dang Thi Le Tan 7', '0900000207', 'staff', true, true),
    ('staff8@gmail.com', 'Bui Van Le Tan 8', '0900000208', 'staff', true, true),
    ('staff9@gmail.com', 'Do Thi Buong Phong 9', '0900000209', 'staff', true, true),
    ('staff10@gmail.com', 'Ngo Van Le Tan 10', '0900000210', 'staff', true, true),
    ('staff11@gmail.com', 'Duong Thi Le Tan 11', '0900000211', 'staff', true, true),
    ('staff12@gmail.com', 'Ly Van Buong Phong 12', '0900000212', 'staff', true, true),
    ('staff13@gmail.com', 'Trinh Thi Le Tan 13', '0900000213', 'staff', true, true),
    ('staff14@gmail.com', 'Mai Van Le Tan 14', '0900000214', 'staff', true, true),
    ('staff15@gmail.com', 'Phan Thi Buong Phong 15', '0900000215', 'staff', true, true),
    ('staff16@gmail.com', 'Cao Van Le Tan 16', '0900000216', 'staff', true, true),
    -- Nhan vien da nghi viec, va nhan vien con lam nhung bi khoa tai khoan.
    ('staff17@gmail.com', 'Ha Thi Da Nghi Viec', '0900000217', 'staff', true, true),
    ('staff18@gmail.com', 'Ton Van Bi Khoa', '0900000218', 'staff', false, true),

    ('user1@gmail.com', 'Hoang Van Khach', '0900000301', 'user', true, true),
    ('user2@gmail.com', 'Do Thi Khach', '0900000302', 'user', true, true),
    ('user3@gmail.com', 'Nguyen Van Khach 3', '0900000303', 'user', true, true),
    ('user4@gmail.com', 'Tran Thi Khach 4', '0900000304', 'user', true, true),
    ('user5@gmail.com', 'Le Van Khach 5', '0900000305', 'user', true, true),
    ('user6@gmail.com', 'Pham Thi Khach 6', '0900000306', 'user', true, true),
    ('user7@gmail.com', 'Vu Van Khach 7', '0900000307', 'user', true, true),
    ('user8@gmail.com', 'Dang Thi Khach 8', '0900000308', 'user', true, true),
    ('user9@gmail.com', 'Bui Van Khach 9', '0900000309', 'user', true, true),
    ('user10@gmail.com', 'Ngo Thi Khach 10', '0900000310', 'user', true, true),
    -- Khach chua xac thuc email, va khach bi khoa tai khoan.
    ('user11@gmail.com', 'Ly Van Chua Xac Thuc', '0900000311', 'user', true, false),
    ('user12@gmail.com', 'Trinh Thi Bi Khoa', '0900000312', 'user', false, true)
) AS t(email, full_name, phone, role, is_active, is_verified);

-- ============================================================
-- 2. DANH MUC VA TIEN NGHI DUNG CHUNG
-- Tien nghi la danh muc chung toan he thong (UNIQUE(name, scope)), khong thuoc
-- rieng khach san nao. Tung khach san chi lien ket qua hotel_amenities va
-- room_type_amenities.
-- ============================================================
INSERT INTO amenity_categories (name, icon)
VALUES
    ('general', 'coffee'),
    ('room', 'flame'),
    ('view', 'waves'),
    ('activity', 'leaf');

-- Pham vi dat theo dung ban chat tien nghi: tien ich cua ca toa nha (be boi,
-- phong gym) khac voi thu co trong phong (minibar, may say toc). Chi cac loai
-- huong nhin moi ton tai o ca 2 pham vi vi khach san va phong deu co huong nhin.
INSERT INTO amenities (name, scope, category_id)
SELECT names.name, scopes.scope::amenity_scope, (SELECT id FROM amenity_categories WHERE name = names.category)
FROM (VALUES
    ('Free WiFi', 'general', 'both'),
    -- Bua sang co the la tien ich cua khach san, cung co the nam trong gia phong.
    ('Breakfast Included', 'general', 'both'),
    ('Gym', 'general', 'hotel'),
    ('Pool', 'general', 'hotel'),
    ('Parking', 'general', 'hotel'),
    ('Spa', 'activity', 'hotel'),
    ('Bike Rental', 'activity', 'hotel'),
    ('Cooking Class', 'activity', 'hotel'),
    ('Air Conditioner', 'room', 'room'),
    ('Mini Bar', 'room', 'room'),
    ('Hair Dryer', 'room', 'room'),
    ('Bathtub', 'room', 'room'),
    ('Safe Box', 'room', 'room'),
    ('Sea View', 'view', 'both'),
    ('Lake View', 'view', 'both'),
    ('City View', 'view', 'both'),
    ('Garden View', 'view', 'both')
) AS names(name, category, applies_to)
JOIN (VALUES ('hotel'), ('room')) AS scopes(scope)
  ON names.applies_to IN ('both', scopes.scope);

-- ============================================================
-- 3. KHACH SAN
-- Trai deu 7 tinh thanh va du 4 trang thai de man hinh duyet cua Super Admin co
-- viec de lam.
-- ============================================================
INSERT INTO hotels (
    owner_id, name, description, address, city, district, latitude, longitude,
    phone, email, star_rating, status, rejection_reason, pets_allowed,
    cancellation_policy, children_policy
)
SELECT
    (SELECT id FROM users WHERE email = t.owner_email),
    t.name, t.description, t.address, t.city, t.district, t.lat, t.lng,
    t.phone, t.email, t.star_rating, t.status::hotel_status, t.rejection_reason, t.pets_allowed,
    'Huy mien phi truoc 24 gio so voi ngay nhan phong.',
    'Tre em duoi 6 tuoi o mien phi khi dung giuong co san.'
FROM (VALUES
    ('owner1@gmail.com', 'Sunrise Hotel Da Nang', 'Khach san 4 sao gan bien My Khe', '123 Vo Nguyen Giap', 'Đà Nẵng', 'Sơn Trà', 16.071463, 108.245727, '02361234567', 'sunrisehoteldanang@gmail.com', 4, 'approved', NULL, true),
    ('owner2@gmail.com', 'Hanoi Grand Hotel', 'Khach san 5 sao trung tam pho co', '45 Hang Bong', 'Hà Nội', 'Hoàn Kiếm', 21.028511, 105.804817, '02412345678', 'hanoigrandhotel@gmail.com', 5, 'approved', NULL, false),
    ('owner3@gmail.com', 'Danang Beach Resort', 'Resort 5 sao sat bien My Khe', '68 Vo Nguyen Giap', 'Đà Nẵng', 'Sơn Trà', 16.062000, 108.247000, '02363000003', 'contact3@gmail.com', 5, 'approved', NULL, true),
    ('owner4@gmail.com', 'Han River Boutique Hotel', 'Khach san boutique canh song Han', '12 Bach Dang', 'Đà Nẵng', 'Hải Châu', 16.070000, 108.223000, '02363000004', 'contact4@gmail.com', 3, 'approved', NULL, false),
    ('owner5@gmail.com', 'Old Quarter Charm Hotel', 'Khach san nho giua long pho co', '20 Hang Bac', 'Hà Nội', 'Hoàn Kiếm', 21.033000, 105.850000, '02436000005', 'contact5@gmail.com', 3, 'approved', NULL, false),
    ('owner6@gmail.com', 'Westlake Serenity Hotel', 'Khach san yen tinh canh Ho Tay', '88 Xuan Dieu', 'Hà Nội', 'Tây Hồ', 21.058000, 105.823000, '02436000006', 'contact6@gmail.com', 4, 'approved', NULL, true),
    ('owner7@gmail.com', 'Saigon Central Hotel', 'Khach san trung tam Quan 1', '150 Nguyen Hue', 'TP. Hồ Chí Minh', 'Quận 1', 10.774500, 106.703000, '02839000007', 'contact7@gmail.com', 4, 'approved', NULL, false),
    ('owner8@gmail.com', 'Bitexco View Hotel', 'Khach san 5 sao view Bitexco', '2 Hai Trieu', 'TP. Hồ Chí Minh', 'Quận 1', 10.771500, 106.704000, '02839000008', 'contact8@gmail.com', 5, 'approved', NULL, false),
    ('owner9@gmail.com', 'Pham Ngu Lao Backpacker Inn', 'Nha nghi gia re khu Tay ba lo', '220 Pham Ngu Lao', 'TP. Hồ Chí Minh', 'Quận 1', 10.768000, 106.693000, '02839000009', 'contact9@gmail.com', 2, 'approved', NULL, true),
    ('owner10@gmail.com', 'Dalat Pine Hill Resort', 'Resort giua rung thong Da Lat', '5 Tran Hung Dao', 'Lâm Đồng', 'Đà Lạt', 11.946000, 108.438000, '02633000010', 'contact10@gmail.com', 4, 'approved', NULL, true),
    ('owner11@gmail.com', 'Xuan Huong Lakeside Hotel', 'Khach san canh Ho Xuan Huong', '30 Tran Quoc Toan', 'Lâm Đồng', 'Đà Lạt', 11.941000, 108.442000, '02633000011', 'contact11@gmail.com', 3, 'approved', NULL, false),
    ('owner12@gmail.com', 'Cau Dat Tea Village Homestay', 'Homestay giua doi che Cau Dat', 'Thon Cau Dat', 'Lâm Đồng', 'Xuân Trường', 11.870000, 108.470000, '02633000012', 'contact12@gmail.com', 2, 'approved', NULL, true),
    ('owner13@gmail.com', 'Nha Trang Ocean Pearl Resort', 'Resort 5 sao doc bien Tran Phu', '86 Tran Phu', 'Khánh Hòa', 'Nha Trang', 12.238000, 109.197000, '02583000013', 'contact13@gmail.com', 5, 'approved', NULL, false),
    ('owner14@gmail.com', 'Vinpearl View Hotel', 'Khach san view Vinpearl tu dat lien', '10 Pham Van Dong', 'Khánh Hòa', 'Nha Trang', 12.250000, 109.193000, '02583000014', 'contact14@gmail.com', 4, 'approved', NULL, false),
    -- Bi tam dung: van con don da ban phai phuc vu cho xong.
    ('owner15@gmail.com', 'Beachfront Backpacker Nha Trang', 'Nha nghi gia re sat bien', '88 Nguyen Thien Thuat', 'Khánh Hòa', 'Nha Trang', 12.241000, 109.195000, '02583000015', 'contact15@gmail.com', 2, 'suspended', 'Nhieu khieu nai ve ve sinh phong, tam dung de kiem tra.', true),
    -- Dang cho Super Admin duyet.
    ('owner16@gmail.com', 'Hue Riverside Hotel', 'Khach san moi ben song Huong', '15 Le Loi', 'Thừa Thiên Huế', 'Thành phố Huế', 16.463000, 107.590000, '02343000016', 'contact16@gmail.com', 3, 'pending', NULL, false),
    ('owner17@gmail.com', 'Sapa Cloud Homestay', 'Homestay san may tren doi', 'Ban Ta Van', 'Lào Cai', 'Sa Pa', 22.316000, 103.844000, '02143000017', 'contact17@gmail.com', 2, 'pending', NULL, true),
    -- Bi tu choi ho so dang ky.
    ('owner18@gmail.com', 'Vung Tau Sea Hotel', 'Khach san ven bien Vung Tau', '3 Thuy Van', 'Bà Rịa - Vũng Tàu', 'Vũng Tàu', 10.346000, 107.086000, '02543000018', 'contact18@gmail.com', 3, 'rejected', 'Thieu giay phep kinh doanh luu tru va anh thuc te cua phong.', false)
) AS t(owner_email, name, description, address, city, district, lat, lng, phone, email, star_rating, status, rejection_reason, pets_allowed);

-- Anh khach san: 1 anh dai dien + 2 anh phu cho moi khach san.
INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
SELECT h.id, 'https://picsum.photos/seed/hotel' || h.id || '-' || g.n || '/1200/700', g.n = 1, g.n
FROM hotels h
CROSS JOIN generate_series(1, 3) AS g(n);

-- Tien nghi chung: khach san cang nhieu sao cang nhieu tien nghi.
INSERT INTO hotel_amenities (hotel_id, amenity_id)
SELECT h.id, a.id
FROM hotels h
JOIN amenities a ON a.scope = 'hotel'
WHERE a.name IN ('Free WiFi', 'Parking')
   OR (h.star_rating >= 3 AND a.name = 'Breakfast Included')
   OR (h.star_rating >= 4 AND a.name IN ('Pool', 'Gym'))
   OR (h.star_rating >= 5 AND a.name = 'Spa')
   OR (h.city IN ('Đà Nẵng', 'Khánh Hòa') AND a.name = 'Sea View')
   OR (h.district = 'Tây Hồ' AND a.name = 'Lake View')
   OR (h.city = 'Lâm Đồng' AND a.name IN ('Garden View', 'Bike Rental'));

-- Phuong thuc thanh toan: khach san nao cung nhan chuyen khoan, tu 3 sao them vi dien tu.
INSERT INTO hotel_payment_methods (hotel_id, method)
SELECT h.id, m.method::payment_method
FROM hotels h
JOIN (VALUES ('bank_transfer', 0), ('momo', 3), ('zalopay', 3), ('credit_card', 4)) AS m(method, min_star)
  ON h.star_rating >= m.min_star;

-- Dich vu cua tung khach san.
INSERT INTO hotel_services (hotel_id, name, description, price, unit)
SELECT (SELECT id FROM hotels WHERE name = t.hotel_name), t.name, t.description, t.price, t.unit
FROM (VALUES
    ('Sunrise Hotel Da Nang', 'Airport Pickup', 'Don san bay', 300000, 'chuyen'),
    ('Sunrise Hotel Da Nang', 'Laundry', 'Giat ui', 50000, 'kg'),
    ('Hanoi Grand Hotel', 'Airport Pickup', 'Don san bay', 350000, 'chuyen'),
    ('Hanoi Grand Hotel', 'Spa', 'Dich vu spa thu gian', 500000, 'lan'),
    ('Danang Beach Resort', 'Airport Pickup', 'Don san bay', 350000, 'chuyen'),
    ('Danang Beach Resort', 'Diving Tour', 'Tour lan ngam san ho', 650000, 'luot'),
    ('Han River Boutique Hotel', 'Laundry', 'Giat ui', 40000, 'kg'),
    ('Old Quarter Charm Hotel', 'Airport Pickup', 'Don san bay', 300000, 'chuyen'),
    ('Westlake Serenity Hotel', 'Spa', 'Dich vu spa thu gian', 450000, 'lan'),
    ('Saigon Central Hotel', 'Airport Pickup', 'Don san bay', 400000, 'chuyen'),
    ('Bitexco View Hotel', 'Spa', 'Dich vu spa cao cap', 700000, 'lan'),
    ('Pham Ngu Lao Backpacker Inn', 'Laundry', 'Giat ui', 30000, 'kg'),
    ('Dalat Pine Hill Resort', 'Bonfire Night', 'Dem lua trai', 200000, 'lan'),
    ('Xuan Huong Lakeside Hotel', 'Bike Rental', 'Thue xe dap', 50000, 'ngay'),
    ('Cau Dat Tea Village Homestay', 'Tea Tour', 'Tham quan doi che', 100000, 'luot'),
    ('Nha Trang Ocean Pearl Resort', 'Diving Tour', 'Tour lan bien', 600000, 'luot'),
    ('Vinpearl View Hotel', 'Airport Pickup', 'Don san bay', 300000, 'chuyen'),
    ('Beachfront Backpacker Nha Trang', 'Bike Rental', 'Thue xe may', 120000, 'ngay')
) AS t(hotel_name, name, description, price, unit);

-- ============================================================
-- 4. LOAI PHONG VA PHONG VAT LY
-- Moi khach san co 2-3 loai phong de so sanh duoc gia va doc duoc bieu do xep
-- hang danh gia theo loai phong.
-- ============================================================
INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms)
SELECT (SELECT id FROM hotels WHERE name = t.hotel_name), t.name, t.description, t.base_price, t.max_guests, t.area_sqm, t.bed_type, t.bed_count, t.total_rooms
FROM (VALUES
    ('Sunrise Hotel Da Nang', 'Standard', 'Phong tieu chuan huong pho', 800000, 2, 24, 'Queen', 1, 4),
    ('Sunrise Hotel Da Nang', 'Deluxe', 'Phong cao cap view bien', 1400000, 3, 32, 'King', 2, 3),
    ('Sunrise Hotel Da Nang', 'Family Suite', 'Phong rong cho gia dinh', 2100000, 5, 48, 'King', 3, 2),

    ('Hanoi Grand Hotel', 'Standard', 'Phong tieu chuan pho co', 900000, 2, 22, 'Queen', 1, 4),
    ('Hanoi Grand Hotel', 'Executive', 'Phong hang thuong gia', 1600000, 3, 34, 'King', 2, 3),
    ('Hanoi Grand Hotel', 'Suite', 'Phong suite rong rai', 2200000, 4, 45, 'King', 2, 2),

    ('Danang Beach Resort', 'Ocean View Deluxe', 'Phong nhin thang ra bien', 1600000, 3, 38, 'King', 2, 4),
    ('Danang Beach Resort', 'Garden Villa', 'Villa rieng trong vuon', 2800000, 4, 60, 'King', 2, 2),

    ('Han River Boutique Hotel', 'Standard', 'Phong tieu chuan', 550000, 2, 20, 'Queen', 1, 4),
    ('Han River Boutique Hotel', 'River View', 'Phong nhin ra song Han', 850000, 2, 26, 'Queen', 1, 3),

    ('Old Quarter Charm Hotel', 'Standard', 'Phong tieu chuan pho co', 650000, 2, 18, 'Queen', 1, 4),
    ('Old Quarter Charm Hotel', 'Superior', 'Phong rong hon, co ban lam viec', 900000, 3, 26, 'Queen', 2, 2),

    ('Westlake Serenity Hotel', 'Standard', 'Phong tieu chuan huong vuon', 750000, 2, 22, 'Queen', 1, 3),
    ('Westlake Serenity Hotel', 'Lake View Deluxe', 'Phong nhin ra Ho Tay', 1100000, 3, 30, 'King', 2, 4),

    ('Saigon Central Hotel', 'Standard', 'Phong tieu chuan', 800000, 2, 22, 'Queen', 1, 4),
    ('Saigon Central Hotel', 'Executive', 'Phong cao cap trung tam', 1200000, 3, 32, 'King', 2, 4),

    ('Bitexco View Hotel', 'City View Deluxe', 'Phong cao cap view thanh pho', 1500000, 2, 34, 'King', 1, 4),
    ('Bitexco View Hotel', 'Sky Suite', 'Suite tang cao view thanh pho', 2000000, 4, 48, 'King', 2, 3),

    ('Pham Ngu Lao Backpacker Inn', 'Dormitory', 'Giuong trong phong tap the', 350000, 2, 14, 'Single', 2, 4),
    ('Pham Ngu Lao Backpacker Inn', 'Private Twin', 'Phong rieng 2 giuong don', 600000, 2, 18, 'Single', 2, 3),

    ('Dalat Pine Hill Resort', 'Pine View Deluxe', 'Phong nhin ra rung thong', 1300000, 3, 34, 'King', 2, 4),
    ('Dalat Pine Hill Resort', 'Wooden Cabin', 'Nha go rieng biet', 1800000, 4, 42, 'King', 2, 2),

    ('Xuan Huong Lakeside Hotel', 'Standard', 'Phong tieu chuan', 700000, 2, 22, 'Queen', 1, 4),
    ('Xuan Huong Lakeside Hotel', 'Lake View', 'Phong nhin ra ho', 1000000, 3, 28, 'Queen', 2, 3),

    ('Cau Dat Tea Village Homestay', 'Garden Bungalow', 'Bungalow giua vuon che', 450000, 2, 16, 'Queen', 1, 3),
    ('Cau Dat Tea Village Homestay', 'Family Room', 'Phong gia dinh nhin doi che', 750000, 4, 28, 'Queen', 2, 2),

    ('Nha Trang Ocean Pearl Resort', 'Ocean Suite', 'Suite huong bien', 1900000, 4, 46, 'King', 2, 4),
    ('Nha Trang Ocean Pearl Resort', 'Pool Access', 'Phong buoc thang ra ho boi', 2400000, 3, 40, 'King', 2, 2),

    ('Vinpearl View Hotel', 'Standard', 'Phong tieu chuan', 850000, 2, 22, 'Queen', 1, 3),
    ('Vinpearl View Hotel', 'Deluxe', 'Phong cao cap view vinh', 1250000, 3, 30, 'King', 2, 4),

    ('Beachfront Backpacker Nha Trang', 'Standard', 'Phong tieu chuan sat bien', 380000, 2, 16, 'Single', 2, 4),

    -- Khach san chua duyet van khai bao truoc noi dung se ban.
    ('Hue Riverside Hotel', 'Standard', 'Phong tieu chuan ben song', 700000, 2, 22, 'Queen', 1, 3),
    ('Sapa Cloud Homestay', 'Mountain View', 'Phong nhin ra thung lung', 550000, 2, 20, 'Queen', 1, 3)
) AS t(hotel_name, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms);

-- Anh loai phong: 2 anh moi loai.
INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
SELECT rt.id, 'https://picsum.photos/seed/roomtype' || rt.id || '-' || g.n || '/1200/700', g.n = 1, g.n
FROM room_types rt
CROSS JOIN generate_series(1, 2) AS g(n);

-- Tien nghi trong phong: goi co ban cho moi loai, them theo gia va theo ten loai phong.
INSERT INTO room_type_amenities (room_type_id, amenity_id)
SELECT rt.id, a.id
FROM room_types rt
JOIN amenities a ON a.scope = 'room'
WHERE a.name IN ('Free WiFi', 'Air Conditioner')
   OR (rt.base_price >= 700000 AND a.name IN ('Hair Dryer', 'Safe Box'))
   OR (rt.base_price >= 1200000 AND a.name IN ('Mini Bar', 'Breakfast Included'))
   OR (rt.base_price >= 1800000 AND a.name = 'Bathtub')
   OR (rt.name ILIKE '%Ocean%' AND a.name = 'Sea View')
   OR (rt.name ILIKE '%Lake%' AND a.name = 'Lake View')
   OR (rt.name ILIKE '%City%' AND a.name = 'City View')
   OR (rt.name ILIKE '%Garden%' AND a.name = 'Garden View');

-- Phong vat ly: tao dung so phong da khai bao o total_rooms.
-- Loai phong thu k cua khach san nam o tang k, so phong dang k01, k02...
INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status)
SELECT
    rt.hotel_id,
    rt.id,
    (rt.floor_no + 1) || lpad(g.n::text, 2, '0'),
    rt.floor_no + 1,
    'available'
FROM (
    SELECT id, hotel_id, total_rooms, row_number() OVER (PARTITION BY hotel_id ORDER BY id) AS floor_no
    FROM room_types
) rt
CROSS JOIN LATERAL generate_series(1, rt.total_rooms) AS g(n);

-- ============================================================
-- 5. NHAN SU VA LICH CA LAM VIEC
-- ============================================================
INSERT INTO staff_members (user_id, hotel_id, position, hired_at, is_active)
SELECT
    (SELECT id FROM users WHERE email = t.staff_email),
    (SELECT id FROM hotels WHERE name = t.hotel_name),
    t.position,
    CURRENT_DATE - (t.months_ago * 30),
    t.is_active
FROM (VALUES
    ('staff1@gmail.com', 'Sunrise Hotel Da Nang', 'Le tan', 14, true),
    ('staff2@gmail.com', 'Sunrise Hotel Da Nang', 'Le tan', 8, true),
    ('staff3@gmail.com', 'Sunrise Hotel Da Nang', 'Buong phong', 5, true),
    ('staff4@gmail.com', 'Hanoi Grand Hotel', 'Le tan', 20, true),
    ('staff5@gmail.com', 'Hanoi Grand Hotel', 'Le tan', 11, true),
    ('staff6@gmail.com', 'Hanoi Grand Hotel', 'Buong phong', 6, true),
    ('staff7@gmail.com', 'Danang Beach Resort', 'Le tan', 9, true),
    ('staff8@gmail.com', 'Han River Boutique Hotel', 'Le tan', 7, true),
    ('staff9@gmail.com', 'Old Quarter Charm Hotel', 'Buong phong', 4, true),
    ('staff10@gmail.com', 'Westlake Serenity Hotel', 'Le tan', 12, true),
    ('staff11@gmail.com', 'Saigon Central Hotel', 'Le tan', 10, true),
    ('staff12@gmail.com', 'Bitexco View Hotel', 'Buong phong', 3, true),
    ('staff13@gmail.com', 'Dalat Pine Hill Resort', 'Le tan', 15, true),
    ('staff14@gmail.com', 'Nha Trang Ocean Pearl Resort', 'Le tan', 13, true),
    ('staff15@gmail.com', 'Nha Trang Ocean Pearl Resort', 'Buong phong', 2, true),
    ('staff16@gmail.com', 'Vinpearl View Hotel', 'Le tan', 6, true),
    -- Da nghi viec nhung tai khoan van mo.
    ('staff17@gmail.com', 'Sunrise Hotel Da Nang', 'Le tan', 24, false),
    -- Con lam viec nhung tai khoan bi Super Admin khoa.
    ('staff18@gmail.com', 'Hanoi Grand Hotel', 'Bao ve', 18, true)
) AS t(staff_email, hotel_name, position, months_ago, is_active);

-- Lich ca 4 tuan: 2 tuan truoc va 2 tuan toi. Ca xoay vong theo tuan de moi nguoi
-- deu tung lam ca Sang, Chieu, Dem; moi nguoi nghi 1 ngay co dinh trong tuan.
INSERT INTO staff_schedules (staff_id, shift_date, shift_type, start_time, end_time)
SELECT
    s.id,
    d.shift_date::date,
    band.shift_type::shift_type,
    band.start_time::time,
    band.end_time::time
FROM (
    SELECT id, hotel_id, row_number() OVER (PARTITION BY hotel_id ORDER BY id) AS staff_no
    FROM staff_members WHERE is_active
) s
CROSS JOIN generate_series(CURRENT_DATE - 14, CURRENT_DATE + 13, INTERVAL '1 day') AS d(shift_date)
CROSS JOIN LATERAL (
    SELECT * FROM (VALUES
        ('morning', '06:00', '14:00', 0),
        ('afternoon', '14:00', '22:00', 1),
        ('night', '22:00', '06:00', 2)
    ) AS b(shift_type, start_time, end_time, idx)
    WHERE b.idx = (s.staff_no - 1 + floor((d.shift_date::date - CURRENT_DATE + 14) / 7)::int) % 3
) AS band
WHERE extract(dow FROM d.shift_date) <> (s.staff_no % 7);

-- ============================================================
-- 6. KHUYEN MAI, QUY TAC GIA THEO MUA, GIA THEO NGAY, KHOA LICH PHONG
-- ============================================================
INSERT INTO promotions (hotel_id, name, description, discount_type, discount_value, min_booking_amount, max_discount_amount, start_date, end_date, usage_limit, used_count)
SELECT
    h.id,
    t.name, t.description, t.discount_type::discount_type, t.discount_value,
    t.min_amount, t.max_discount,
    CURRENT_DATE - t.started_days_ago,
    CURRENT_DATE + t.ends_in_days,
    t.usage_limit, 0
FROM hotels h
JOIN (VALUES
    ('Uu dai he', 'Giam 15% cho ky nghi he', 'percentage', 15, 1000000, 500000, 20, 40, 100),
    ('Dat som', 'Giam thang 200k khi dat truoc', 'fixed_amount', 200000, 1500000, NULL, 10, 60, 50)
) AS t(name, description, discount_type, discount_value, min_amount, max_discount, started_days_ago, ends_in_days, usage_limit) ON true
WHERE h.status = 'approved' AND h.star_rating >= 3;

-- Quy tac gia theo mua cua tung khach san dang hoat dong. Cac quy tac nay tu
-- ap khi tinh gia tung dem, khong sinh san dong nao trong room_type_rates.
INSERT INTO pricing_rules (hotel_id, name, description, recurrence, start_date, end_date, start_month, start_day, end_month, end_day, weekdays, adjustment_type, adjustment_value, priority)
SELECT
    h.id,
    t.name, t.description, t.recurrence,
    CASE WHEN t.recurrence = 'one_time' THEN CURRENT_DATE + t.starts_in_days END,
    CASE WHEN t.recurrence = 'one_time' THEN CURRENT_DATE + t.ends_in_days END,
    t.start_month, t.start_day, t.end_month, t.end_day,
    t.weekdays,
    t.adjustment_type::discount_type, t.adjustment_value, t.priority
FROM hotels h
JOIN (VALUES
    ('Cao diem Tet Duong lich', 'Tu 28/12 den 02/01 tang 30 phan tram',
     'yearly', NULL::int, NULL::int, 12, 28, 1, 2, NULL::smallint[], 'percentage', 30, 40),
    ('Cuoi tuan cao diem', 'Thu 6 va thu 7 tang 20 phan tram',
     'yearly', NULL, NULL, 1, 1, 12, 31, ARRAY[5, 6]::smallint[], 'percentage', 20, 30),
    ('Uu dai thang nay', 'Giam 100k trong 30 ngay toi',
     'one_time', 0, 30, NULL, NULL, NULL, NULL, NULL::smallint[], 'fixed_amount', -100000, 20),
    ('Giam gia mua he', 'Thang 6 den thang 8 giam 15 phan tram',
     'yearly', NULL, NULL, 6, 1, 8, 31, NULL::smallint[], 'percentage', -15, 10)
) AS t(name, description, recurrence, starts_in_days, ends_in_days, start_month, start_day, end_month, end_day, weekdays, adjustment_type, adjustment_value, priority) ON true
WHERE h.status = 'approved';

-- Gia sua tay cho 3 ngay sap toi cua moi loai phong. Gia sua tay duoc uu tien
-- hon quy tac theo mua nen day la vi du de doi chieu tren lich gia.
INSERT INTO room_type_rates (room_type_id, rate_date, price)
SELECT rt.id, d.rate_date::date, round(rt.base_price * 1.35, -3)
FROM room_types rt
JOIN hotels h ON h.id = rt.hotel_id AND h.status = 'approved'
CROSS JOIN generate_series(CURRENT_DATE + 3, CURRENT_DATE + 5, INTERVAL '1 day') AS d(rate_date);

-- Khoa lich bao tri: phong dau tien cua moi khach san 5 sao, 3 ngay tu tuan sau.
INSERT INTO room_blocks (room_id, start_date, end_date, reason, created_by)
SELECT r.id, CURRENT_DATE + 7, CURRENT_DATE + 9, 'Bao tri dieu hoa dinh ky', h.owner_id
FROM hotels h
JOIN LATERAL (SELECT id FROM rooms WHERE hotel_id = h.id ORDER BY id LIMIT 1) r ON true
WHERE h.status = 'approved' AND h.star_rating = 5;

-- ============================================================
-- 7. BOOKING
-- Moi loai phong dang ban sinh 8 don, moi don mot trang thai, trai tu 60 ngay
-- truoc den 17 ngay toi. Nho vay man hinh nao cung co du lieu dung trang thai can
-- thiet: don cho xac nhan, don cho check-in, khach dang luu tru, lich su.
-- ============================================================
INSERT INTO bookings (
    booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
    total_room_price, total_service_price, discount_amount, total_amount, status,
    cancellation_reason, cancelled_at, cancelled_by, special_requests, created_at
)
SELECT
    'BK' || lpad(rt.rt_no::text, 3, '0') || lpad(v.n::text, 2, '0'),
    cust.id,
    rt.hotel_id,
    CURRENT_DATE + v.check_in_offset + (sign(v.spread) * (rt.rt_no % abs(v.spread)))::int,
    CURRENT_DATE + v.check_in_offset + (sign(v.spread) * (rt.rt_no % abs(v.spread)))::int + v.nights,
    least(rt.max_guests, 1 + (rt.rt_no + v.n) % 3),
    rt.base_price * v.nights,
    0,
    0,
    rt.base_price * v.nights,
    v.status::booking_status,
    CASE WHEN v.status = 'cancelled' THEN 'Khach doi lich, huy truoc ngay nhan phong' END,
    CASE WHEN v.status = 'cancelled' THEN now() - ((abs(v.check_in_offset) + 3) * INTERVAL '1 day') END,
    CASE WHEN v.status = 'cancelled' THEN cust.id END,
    CASE WHEN (rt.rt_no + v.n) % 4 = 0 THEN 'Xin phong tang cao, yen tinh.'
         WHEN (rt.rt_no + v.n) % 4 = 1 THEN 'Toi den muon sau 22h, nho giu phong.'
    END,
    now() - ((abs(v.check_in_offset) + 7) * INTERVAL '1 day')
FROM (
    SELECT rt.id, rt.hotel_id, rt.base_price, rt.max_guests,
           row_number() OVER (ORDER BY rt.hotel_id, rt.id) AS rt_no
    FROM room_types rt
    JOIN hotels h ON h.id = rt.hotel_id
    WHERE h.status IN ('approved', 'suspended') AND rt.is_active
) rt
-- spread giai ngay nhan phong ra nhieu ngay quanh moc: am la lui ve qua khu,
-- duong la day ve tuong lai. Neu khong giai thi moi don deu roi vao dung mot so
-- it ngay, bieu do doanh thu theo ngay se chi con vai cot dung dung.
CROSS JOIN (VALUES
    (1, 'checked_out', -75, 3, -12),
    (2, 'checked_out', -52, 2, -11),
    (3, 'checked_out', -33, 3, -10),
    (4, 'checked_out', -11, 2,  -7),
    (5, 'cancelled',   -30, 2, -13),
    (6, 'no_show',      -9, 2,  -6),
    -- Khach dang luu tru: chi lui toi da 2 ngay de ngay tra phong van o tuong lai.
    (7, 'checked_in',   -1, 3,  -2),
    (8, 'confirmed',     6, 2,   8),
    (9, 'pending',      15, 2,  10)
) AS v(n, status, check_in_offset, nights, spread)
-- Trai khach hang deu ra cac don thay vi don nao cung mot nguoi.
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role = 'user' AND is_active
    ORDER BY id OFFSET (rt.rt_no * 3 + v.n) % 10 LIMIT 1
) cust;

-- Dong loai phong cua tung don: lay dung loai phong da dung de tinh tien.
INSERT INTO booking_rooms (booking_id, room_type_id, quantity, price_per_night, num_nights, subtotal)
SELECT b.id, rt.id, 1, rt.base_price, b.check_out_date - b.check_in_date, b.total_room_price
FROM bookings b
JOIN LATERAL (
    SELECT id, base_price FROM room_types
    WHERE hotel_id = b.hotel_id AND is_active
      AND base_price * (b.check_out_date - b.check_in_date) = b.total_room_price
    ORDER BY id LIMIT 1
) rt ON true;

-- Gan phong vat ly cho cac don da nhan phong (dang o hoac da tra phong).
INSERT INTO booking_room_units (booking_room_id, room_id)
SELECT br.id, r.id
FROM booking_rooms br
JOIN bookings b ON b.id = br.booking_id AND b.status IN ('checked_in', 'checked_out')
JOIN LATERAL (
    SELECT id FROM rooms WHERE room_type_id = br.room_type_id ORDER BY id OFFSET br.id % (
        SELECT count(*) FROM rooms WHERE room_type_id = br.room_type_id
    ) LIMIT 1
) r ON true;

-- Dich vu di kem: cu 3 don thi 1 don co dung 1 dich vu cua khach san do.
INSERT INTO booking_services (booking_id, service_id, quantity, unit_price, subtotal, used_at)
SELECT b.id, s.id, 1, s.price, s.price,
       CASE WHEN b.status IN ('checked_in', 'checked_out') THEN b.check_in_date + INTERVAL '18 hours' END
FROM bookings b
JOIN LATERAL (
    SELECT id, price FROM hotel_services WHERE hotel_id = b.hotel_id AND is_active ORDER BY id LIMIT 1
) s ON true
WHERE b.id % 3 = 0;

-- Cong tien dich vu vao tong don.
UPDATE bookings b
SET total_service_price = x.total,
    total_amount = b.total_room_price + x.total - b.discount_amount
FROM (SELECT booking_id, sum(subtotal) AS total FROM booking_services GROUP BY booking_id) x
WHERE x.booking_id = b.id;

-- Ap khuyen mai cho mot phan cac don da hoan tat, tru thang vao tong tien.
UPDATE bookings b
SET promotion_id = p.id,
    discount_amount = round(b.total_room_price * p.discount_value / 100, -3),
    total_amount = b.total_room_price + b.total_service_price - round(b.total_room_price * p.discount_value / 100, -3)
FROM promotions p
WHERE p.hotel_id = b.hotel_id
  AND p.discount_type = 'percentage'
  AND b.status IN ('checked_out', 'checked_in')
  AND b.id % 5 = 0
  AND b.total_room_price >= p.min_booking_amount;

-- Dem so lan tung khuyen mai da duoc dung.
UPDATE promotions p
SET used_count = x.total
FROM (SELECT promotion_id, count(*) AS total FROM bookings WHERE promotion_id IS NOT NULL GROUP BY promotion_id) x
WHERE x.promotion_id = p.id;

-- ============================================================
-- 8. THANH TOAN VA HOA DON
-- Don da tra phong / dang o / da xac nhan la da thu tien; don huy la da hoan
-- tien; don cho xac nhan thi chua thu duoc dong nao.
-- ============================================================
INSERT INTO payments (booking_id, amount, payment_method, payment_status, transaction_id, paid_at)
SELECT
    b.id,
    b.total_amount,
    (ARRAY['bank_transfer', 'momo', 'zalopay', 'credit_card'])[1 + b.id % 4]::payment_method,
    CASE WHEN b.status = 'cancelled' THEN 'refunded' ELSE 'completed' END::payment_status,
    'TXN' || lpad(b.id::text, 10, '0'),
    -- Tien vao truoc ngay nhan phong 1 ngay de bao cao doanh thu theo ngay co so
    -- lieu trai deu thay vi don cuc vao mot moc.
    (b.check_in_date - 1) + INTERVAL '10 hours'
FROM bookings b
WHERE b.status IN ('checked_out', 'checked_in', 'confirmed', 'cancelled');

INSERT INTO invoices (
    invoice_number, booking_id, payment_id, user_id, hotel_id,
    buyer_name, buyer_email, buyer_phone,
    seller_name, seller_address, seller_phone, seller_email,
    total_room_price, total_service_price, discount_amount, total_amount, issued_at
)
SELECT
    'INV' || to_char(p.paid_at, 'YYYYMMDD') || lpad(b.id::text, 5, '0'),
    b.id, p.id, b.user_id, b.hotel_id,
    u.full_name, u.email, u.phone,
    h.name, h.address || ', ' || h.city, h.phone, h.email,
    b.total_room_price, b.total_service_price, b.discount_amount, b.total_amount,
    p.paid_at
FROM payments p
JOIN bookings b ON b.id = p.booking_id
JOIN users u ON u.id = b.user_id
JOIN hotels h ON h.id = b.hotel_id
WHERE p.payment_status = 'completed';

-- ============================================================
-- 9. NGHIEP VU LUU TRU: CHECK-IN / CHECK-OUT VA TRANG THAI PHONG
-- ============================================================
INSERT INTO check_in_outs (booking_id, staff_id, type, performed_at, notes)
SELECT b.id, s.id, 'check_in'::check_type, b.check_in_date + INTERVAL '14 hours', 'Khach nhan phong dung gio'
FROM bookings b
JOIN LATERAL (
    SELECT id FROM staff_members WHERE hotel_id = b.hotel_id AND is_active ORDER BY id LIMIT 1
) s ON true
WHERE b.status IN ('checked_in', 'checked_out');

INSERT INTO check_in_outs (booking_id, staff_id, type, performed_at, notes)
SELECT b.id, s.id, 'check_out'::check_type, b.check_out_date + INTERVAL '11 hours', 'Da kiem tra phong, khong phat sinh'
FROM bookings b
JOIN LATERAL (
    SELECT id FROM staff_members WHERE hotel_id = b.hotel_id AND is_active ORDER BY id LIMIT 1
) s ON true
WHERE b.status = 'checked_out';

-- Phong cua khach dang luu tru phai o trang thai co khach.
UPDATE rooms r
SET status = 'occupied'
FROM booking_room_units bru
JOIN booking_rooms br ON br.id = bru.booking_room_id
JOIN bookings b ON b.id = br.booking_id AND b.status = 'checked_in'
WHERE r.id = bru.room_id;

-- Mot vai phong dang don dep va bao tri de so do phong khong toan mot mau.
UPDATE rooms SET status = 'cleaning' WHERE status = 'available' AND id % 11 = 0;
UPDATE rooms SET status = 'maintenance' WHERE status = 'available' AND id % 17 = 0;

-- Nhat ky doi trang thai cho cac phong khong con trong.
INSERT INTO room_status_logs (room_id, previous_status, new_status, changed_by, changed_at, reason)
SELECT
    r.id,
    'available',
    r.status::text,
    (SELECT user_id FROM staff_members WHERE hotel_id = r.hotel_id AND is_active ORDER BY id LIMIT 1),
    now() - ((r.id % 5) * INTERVAL '1 hour'),
    CASE r.status
        WHEN 'occupied' THEN 'Khach nhan phong'
        WHEN 'cleaning' THEN 'Don phong sau khi khach tra'
        ELSE 'Bao tri thiet bi trong phong'
    END
FROM rooms r
WHERE r.status <> 'available';

-- ============================================================
-- 10. DANH GIA
-- Chi don DA TRA PHONG moi duoc danh gia, va khong phai don nao cung co danh gia.
--
-- Diem phu thuoc hang sao khach san VA thu hang gia cua loai phong trong khach
-- san do: loai phong re nhat bi cham thap hon loai phong dat nhat. Nho vay bang
-- xep hang danh gia theo loai phong moi co cao co thap de doc.
-- ============================================================
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment, created_at)
SELECT
    b.user_id,
    b.hotel_id,
    b.id,
    greatest(1, least(10, h.star_rating * 2 - 3 + rt.price_rank + (b.id % 2))),
    CASE (b.id % 5)
        WHEN 0 THEN 'Phong sach, nhan vien than thien, se quay lai.'
        WHEN 1 THEN 'Vi tri thuan tien, di lai de dang.'
        WHEN 2 THEN 'On trong tam gia, buoi sang hoi on ao.'
        WHEN 3 THEN 'Do an sang phong phu, phong rong rai.'
        ELSE 'Nhan phong nhanh, dung nhu mo ta.'
    END,
    b.check_out_date + INTERVAL '1 day'
FROM bookings b
JOIN hotels h ON h.id = b.hotel_id
JOIN booking_rooms br ON br.booking_id = b.id
JOIN (
    SELECT id, rank() OVER (PARTITION BY hotel_id ORDER BY base_price) AS price_rank
    FROM room_types
) rt ON rt.id = br.room_type_id
WHERE b.status = 'checked_out' AND b.id % 4 <> 3;

-- ============================================================
-- 11. YEU THICH
-- ============================================================
INSERT INTO favorites (user_id, hotel_id)
SELECT u.id, h.id
FROM (SELECT id, row_number() OVER (ORDER BY id) AS user_no FROM users WHERE role = 'user' AND is_active) u
JOIN (SELECT id, row_number() OVER (ORDER BY avg_rating DESC, id) AS hotel_no FROM hotels WHERE status = 'approved') h
  ON h.hotel_no <= 3 OR (h.hotel_no % 5) = (u.user_no % 5);

-- ============================================================
-- 12. NHAT KY HANH DONG QUAN TRI
-- ============================================================
INSERT INTO admin_action_logs (actor_id, action, target_type, target_id, target_label, reason, created_at)
SELECT
    (SELECT id FROM users WHERE email = 'superadmin@gmail.com'),
    CASE h.status
        WHEN 'approved' THEN 'hotel_approved'
        WHEN 'rejected' THEN 'hotel_rejected'
        ELSE 'hotel_suspended'
    END,
    'hotel',
    h.id,
    h.name,
    h.rejection_reason,
    now() - ((h.id % 30 + 1) * INTERVAL '1 day')
FROM hotels h
WHERE h.status <> 'pending';

INSERT INTO admin_action_logs (actor_id, action, target_type, target_id, target_label, reason, created_at)
SELECT
    (SELECT id FROM users WHERE email = 'superadmin@gmail.com'),
    'user_locked',
    'user',
    u.id,
    u.email,
    NULL,
    now() - INTERVAL '3 days'
FROM users u
WHERE NOT u.is_active;

COMMIT;
