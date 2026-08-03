-- Seed data cho hotel-management-system (BIGSERIAL/BIGINT version).
-- Phan 1 (2 khach san dau, Sunrise + Hanoi Grand): du lieu kho hang day du
-- (khach san/loai phong/phong vat ly/tien nghi/dich vu/khuyen mai), KHONG co
-- san booking/thanh toan/danh gia - de tu tay test tron ven luong tim -> dat ->
-- thanh toan -> xac nhan.
-- Phan 2 (13 khach san bo sung ben duoi, moi statement doc lap): them du lieu
-- trai rong 5 thanh pho thinh hanh + mot so khuyen mai/danh gia lich su (booking
-- checked_out qua khu, KHONG anh huong luong dat phong moi bang ngay tuong lai)
-- de test day du cac muc trang chu (uu dai giam sau / duoc yeu thich).
-- Mat khau dang nhap chung cho MOI tai khoan seed: Password123!
-- (hash bcrypt that, tao tu app.core.security.hash_password - dang nhap duoc ngay).

BEGIN;

-- ============================================================
-- DANH MUC TIEN NGHI + TIEN NGHI DUNG CHUNG
-- Tien nghi la danh muc CHUNG toan he thong (UNIQUE(name, scope)), khong thuoc
-- rieng khach san nao. Vi vay phai tao mot lan o day, roi tung khach san chi
-- LIEN KET qua hotel_amenities (tien nghi chung cua khach san) va
-- room_type_amenities (tien nghi trong phong). Phai tach thanh statement rieng
-- dat truoc cac khoi khach san: dong vua chen trong CTE khong the SELECT lai
-- duoc o cung mot statement.
-- ============================================================
INSERT INTO amenity_categories (name, icon)
VALUES
    ('general', 'coffee'),
    ('room', 'flame'),
    ('view', 'waves'),
    ('activity', 'leaf');

-- Cung mot ten duoc tao o ca 2 pham vi: ban cua khach san (scope=hotel) va ban
-- cua phong (scope=room) la 2 dong khac nhau theo rang buoc UNIQUE(name, scope).
INSERT INTO amenities (name, scope, category_id)
SELECT names.name, scopes.scope, (SELECT id FROM amenity_categories WHERE name = names.category)
FROM (VALUES
    ('Free WiFi', 'general'),
    ('Breakfast Included', 'general'),
    ('Gym', 'general'),
    ('Pool', 'general'),
    ('Air Conditioner', 'room'),
    ('Fireplace', 'room'),
    ('Sea View', 'view'),
    ('Lake View', 'view'),
    ('Tea Garden Tour', 'activity')
) AS names(name, category)
CROSS JOIN (VALUES ('hotel'::amenity_scope), ('room'::amenity_scope)) AS scopes(scope);

WITH seeded_users AS (
    INSERT INTO users (email, password_hash, full_name, phone, role, is_active, is_verified)
    VALUES
        ('superadmin@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Super Admin', '0900000001', 'super_admin', true, true),
        ('owner1@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Nguyen Van Chu KS 1', '0900000002', 'admin', true, true),
        ('owner2@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Tran Van Chu KS 2', '0900000003', 'admin', true, true),
        ('staff1@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Le Thi Le Tan 1', '0900000004', 'staff', true, true),
        ('staff2@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Pham Van Le Tan 2', '0900000005', 'staff', true, true),
        ('user1@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Hoang Van Khach', '0900000006', 'user', true, true),
        ('user2@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Do Thi Khach', '0900000007', 'user', true, true)
    RETURNING id, email
),
owner1 AS (SELECT id FROM seeded_users WHERE email = 'owner1@gmail.com'),
owner2 AS (SELECT id FROM seeded_users WHERE email = 'owner2@gmail.com'),
staff_user1 AS (SELECT id FROM seeded_users WHERE email = 'staff1@gmail.com'),
staff_user2 AS (SELECT id FROM seeded_users WHERE email = 'staff2@gmail.com'),

-- ============================================================
-- KHACH SAN 1: Sunrise Hotel Da Nang (Da Nang)
-- ============================================================
hotel1 AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM owner1),
        'Sunrise Hotel Da Nang',
        'Khach san 4 sao gan bien My Khe',
        '123 Vo Nguyen Giap',
        'Đà Nẵng',
        'Sơn Trà',
        16.071463,
        108.245727,
        '02361234567',
        'sunrisehoteldanang@gmail.com',
        4,
        'approved',
        0,
        0
    )
    RETURNING id
),
hotel1_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM hotel1), 'https://picsum.photos/1200/700?hotel1=1', true, 1),
        ((SELECT id FROM hotel1), 'https://picsum.photos/1200/700?hotel1=2', false, 2)
),
hotel1_room_types AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES
        ((SELECT id FROM hotel1), 'Standard', 'Phong tieu chuan huong pho', 800000, 2, 24, 'Queen', 1, 3, true),
        ((SELECT id FROM hotel1), 'Deluxe', 'Phong cao cap view bien', 1400000, 3, 32, 'King', 2, 2, true)
    RETURNING id, name
),
hotel1_standard AS (SELECT id FROM hotel1_room_types WHERE name = 'Standard'),
hotel1_deluxe AS (SELECT id FROM hotel1_room_types WHERE name = 'Deluxe'),
hotel1_room_type_images AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM hotel1_standard), 'https://picsum.photos/1200/700?hotel1-standard=1', true, 1),
        ((SELECT id FROM hotel1_deluxe), 'https://picsum.photos/1200/700?hotel1-deluxe=1', true, 1)
),
hotel1_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM hotel1), (SELECT id FROM hotel1_standard), '201', 2, 'available', true),
        ((SELECT id FROM hotel1), (SELECT id FROM hotel1_standard), '202', 2, 'available', true),
        ((SELECT id FROM hotel1), (SELECT id FROM hotel1_standard), '203', 2, 'available', true),
        ((SELECT id FROM hotel1), (SELECT id FROM hotel1_deluxe), '301', 3, 'available', true),
        ((SELECT id FROM hotel1), (SELECT id FROM hotel1_deluxe), '302', 3, 'available', true)
),
-- Tro toi cac tien nghi dung chung da tao o dau file (khong tao moi).
hotel1_wifi AS (SELECT id FROM amenities WHERE name = 'Free WiFi' AND scope = 'room'),
hotel1_ac AS (SELECT id FROM amenities WHERE name = 'Air Conditioner' AND scope = 'room'),
hotel1_sea_view AS (SELECT id FROM amenities WHERE name = 'Sea View' AND scope = 'room'),
hotel1_ha AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM hotel1), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi', 'Pool', 'Sea View')
),
hotel1_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    VALUES
        ((SELECT id FROM hotel1_standard), (SELECT id FROM hotel1_wifi)),
        ((SELECT id FROM hotel1_standard), (SELECT id FROM hotel1_ac)),
        ((SELECT id FROM hotel1_deluxe), (SELECT id FROM hotel1_wifi)),
        ((SELECT id FROM hotel1_deluxe), (SELECT id FROM hotel1_ac)),
        ((SELECT id FROM hotel1_deluxe), (SELECT id FROM hotel1_sea_view))
),
hotel1_services AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES
        ((SELECT id FROM hotel1), 'Airport Pickup', 'Don san bay', 300000, 'chuyen', true),
        ((SELECT id FROM hotel1), 'Laundry', 'Giat ui', 50000, 'kg', true)
),
hotel1_promo AS (
    INSERT INTO promotions (
        hotel_id, name, description, discount_type, discount_value,
        min_booking_amount, max_discount_amount, start_date, end_date,
        usage_limit, used_count, is_active
    )
    VALUES (
        (SELECT id FROM hotel1),
        'Summer Sale',
        'Giam 10% cho don tu 1.5 trieu',
        'percentage',
        10,
        1500000,
        500000,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        100,
        0,
        true
    )
),
hotel1_staff AS (
    INSERT INTO staff_members (user_id, hotel_id, position, is_active, hired_at)
    VALUES ((SELECT id FROM staff_user1), (SELECT id FROM hotel1), 'Le tan', true, CURRENT_DATE - INTERVAL '90 days')
),

-- ============================================================
-- KHACH SAN 2: Hanoi Grand Hotel (Ha Noi)
-- ============================================================
hotel2 AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM owner2),
        'Hanoi Grand Hotel',
        'Khach san 5 sao trung tam pho co',
        '45 Hang Bong',
        'Hà Nội',
        'Hoàn Kiếm',
        21.028511,
        105.804817,
        '02412345678',
        'hanoigrandhotel@gmail.com',
        5,
        'approved',
        0,
        0
    )
    RETURNING id
),
hotel2_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM hotel2), 'https://picsum.photos/1200/700?hotel2=1', true, 1),
        ((SELECT id FROM hotel2), 'https://picsum.photos/1200/700?hotel2=2', false, 2)
),
hotel2_room_types AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES
        ((SELECT id FROM hotel2), 'Standard', 'Phong tieu chuan pho co', 900000, 2, 22, 'Queen', 1, 3, true),
        ((SELECT id FROM hotel2), 'Suite', 'Phong suite rong rai', 2200000, 4, 45, 'King', 2, 2, true)
    RETURNING id, name
),
hotel2_standard AS (SELECT id FROM hotel2_room_types WHERE name = 'Standard'),
hotel2_suite AS (SELECT id FROM hotel2_room_types WHERE name = 'Suite'),
hotel2_room_type_images AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM hotel2_standard), 'https://picsum.photos/1200/700?hotel2-standard=1', true, 1),
        ((SELECT id FROM hotel2_suite), 'https://picsum.photos/1200/700?hotel2-suite=1', true, 1)
),
hotel2_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM hotel2), (SELECT id FROM hotel2_standard), '101', 1, 'available', true),
        ((SELECT id FROM hotel2), (SELECT id FROM hotel2_standard), '102', 1, 'available', true),
        ((SELECT id FROM hotel2), (SELECT id FROM hotel2_standard), '103', 1, 'available', true),
        ((SELECT id FROM hotel2), (SELECT id FROM hotel2_suite), '501', 5, 'available', true),
        ((SELECT id FROM hotel2), (SELECT id FROM hotel2_suite), '502', 5, 'available', true)
),
hotel2_wifi AS (SELECT id FROM amenities WHERE name = 'Free WiFi' AND scope = 'room'),
hotel2_breakfast AS (SELECT id FROM amenities WHERE name = 'Breakfast Included' AND scope = 'room'),
hotel2_gym AS (SELECT id FROM amenities WHERE name = 'Gym' AND scope = 'room'),
hotel2_ha AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM hotel2), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi', 'Breakfast Included', 'Gym')
),
hotel2_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    VALUES
        ((SELECT id FROM hotel2_standard), (SELECT id FROM hotel2_wifi)),
        ((SELECT id FROM hotel2_standard), (SELECT id FROM hotel2_breakfast)),
        ((SELECT id FROM hotel2_suite), (SELECT id FROM hotel2_wifi)),
        ((SELECT id FROM hotel2_suite), (SELECT id FROM hotel2_breakfast)),
        ((SELECT id FROM hotel2_suite), (SELECT id FROM hotel2_gym))
),
hotel2_services AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES
        ((SELECT id FROM hotel2), 'Airport Pickup', 'Don san bay', 350000, 'chuyen', true),
        ((SELECT id FROM hotel2), 'Spa', 'Dich vu spa thu gian', 500000, 'lan', true)
),
hotel2_promo AS (
    INSERT INTO promotions (
        hotel_id, name, description, discount_type, discount_value,
        min_booking_amount, max_discount_amount, start_date, end_date,
        usage_limit, used_count, is_active
    )
    VALUES (
        (SELECT id FROM hotel2),
        'Uu dai khai truong',
        'Giam thang 200.000 cho moi don dat phong',
        'fixed_amount',
        200000,
        NULL,
        NULL,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        NULL,
        0,
        true
    )
),
hotel2_staff AS (
    INSERT INTO staff_members (user_id, hotel_id, position, is_active, hired_at)
    VALUES ((SELECT id FROM staff_user2), (SELECT id FROM hotel2), 'Le tan', true, CURRENT_DATE - INTERVAL '60 days')
)
SELECT 'Seed completed' AS result;

-- ============================================================
-- Bo sung 13 khach san moi (tong 15) + user + danh gia lien quan
-- de test day du cac muc trang chu (uu dai giam sau / duoc yeu
-- thich / diem den thinh hanh). Moi statement doc lap, tra cuu
-- cheo bang email/ten (khong dung chung 1 chuoi CTE khong lo).
-- ============================================================

-- Them tai khoan chu khach san (owner3-15) va khach hang (user3-6) moi.
INSERT INTO users (email, password_hash, full_name, phone, role, is_active, is_verified)
VALUES
    ('owner3@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Chu KS 3', '0900000103', 'admin', true, true),
    ('owner4@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Chu KS 4', '0900000104', 'admin', true, true),
    ('owner5@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Chu KS 5', '0900000105', 'admin', true, true),
    ('owner6@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Chu KS 6', '0900000106', 'admin', true, true),
    ('owner7@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Chu KS 7', '0900000107', 'admin', true, true),
    ('owner8@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Chu KS 8', '0900000108', 'admin', true, true),
    ('owner9@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Chu KS 9', '0900000109', 'admin', true, true),
    ('owner10@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Chu KS 10', '0900000110', 'admin', true, true),
    ('owner11@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Chu KS 11', '0900000111', 'admin', true, true),
    ('owner12@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Chu KS 12', '0900000112', 'admin', true, true),
    ('owner13@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Chu KS 13', '0900000113', 'admin', true, true),
    ('owner14@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Chu KS 14', '0900000114', 'admin', true, true),
    ('owner15@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Chu KS 15', '0900000115', 'admin', true, true),
    ('user3@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Khach Hang 3', '0900000203', 'user', true, true),
    ('user4@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Khach Hang 4', '0900000204', 'user', true, true),
    ('user5@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Khach Hang 5', '0900000205', 'user', true, true),
    ('user6@gmail.com', '$2b$12$/lPdvh0JDnYp5nv/kANFUOTdfzUS4eQPUYcHqDxHxy.qtIbuC/0Um', 'Khach Hang 6', '0900000206', 'user', true, true);

-- ------------------------------------------------------------
-- Khach san: Danang Beach Resort (Đà Nẵng)
-- ------------------------------------------------------------
WITH new_hotel AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM users WHERE email = 'owner3@gmail.com'),
        'Danang Beach Resort',
        'Resort 5 sao sat bien My Khe',
        '68 Vo Nguyen Giap',
        'Đà Nẵng',
        'Sơn Trà',
        16.062,
        108.247,
        '02363000003',
        'contact3@gmail.com',
        5,
        'approved',
        0,
        0
    )
    RETURNING id
),
new_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h3=1', true, 1),
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h3=2', false, 2)
),
new_room_type AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES (
        (SELECT id FROM new_hotel),
        'Ocean View Deluxe',
        'Phong huong bien rong rai',
        1600000,
        3,
        38,
        'King',
        2,
        3,
        true
    )
    RETURNING id
),
new_room_type_image AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES ((SELECT id FROM new_room_type), 'https://picsum.photos/1200/700?h3-room=1', true, 1)
),
new_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '601', 6, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '602', 6, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '603', 6, 'available', true)
),
new_hotel_amenities AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM new_hotel), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi', 'Pool', 'Sea View')
),
new_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    SELECT (SELECT id FROM new_room_type), id FROM amenities
    WHERE scope = 'room' AND name IN ('Free WiFi', 'Pool', 'Sea View')
),
new_service AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES ((SELECT id FROM new_hotel), 'Airport Pickup', 'Don san bay', 350000, 'chuyen', true)
)
,
new_promo AS (
    INSERT INTO promotions (
        hotel_id, name, description, discount_type, discount_value,
        min_booking_amount, max_discount_amount, start_date, end_date,
        usage_limit, used_count, is_active
    )
    VALUES (
        (SELECT id FROM new_hotel),
        'Ocean Deal',
        'Giam 20% cho don tu 1 trieu',
        'percentage',
        20,
        1000000,
        800000,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        100,
        0,
        true
    )
)
SELECT 1;

-- ------------------------------------------------------------
-- Khach san: Han River Boutique Hotel (Đà Nẵng)
-- ------------------------------------------------------------
WITH new_hotel AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM users WHERE email = 'owner4@gmail.com'),
        'Han River Boutique Hotel',
        'Khach san boutique canh song Han',
        '12 Bach Dang',
        'Đà Nẵng',
        'Hải Châu',
        16.07,
        108.223,
        '02363000004',
        'contact4@gmail.com',
        3,
        'approved',
        0,
        0
    )
    RETURNING id
),
new_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h4=1', true, 1),
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h4=2', false, 2)
),
new_room_type AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES (
        (SELECT id FROM new_hotel),
        'Standard',
        'Phong tieu chuan view song',
        550000,
        2,
        20,
        'Queen',
        1,
        3,
        true
    )
    RETURNING id
),
new_room_type_image AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES ((SELECT id FROM new_room_type), 'https://picsum.photos/1200/700?h4-room=1', true, 1)
),
new_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '101', 1, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '102', 1, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '103', 1, 'available', true)
),
new_hotel_amenities AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM new_hotel), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi', 'Air Conditioner')
),
new_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    SELECT (SELECT id FROM new_room_type), id FROM amenities
    WHERE scope = 'room' AND name IN ('Free WiFi', 'Air Conditioner')
),
new_service AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES ((SELECT id FROM new_hotel), 'Laundry', 'Giat ui', 40000, 'kg', true)
)
,
new_promo AS (
    INSERT INTO promotions (
        hotel_id, name, description, discount_type, discount_value,
        min_booking_amount, max_discount_amount, start_date, end_date,
        usage_limit, used_count, is_active
    )
    VALUES (
        (SELECT id FROM new_hotel),
        'Uu dai song Han',
        'Giam thang 100k',
        'fixed_amount',
        100000,
        NULL,
        NULL,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        100,
        0,
        true
    )
)
SELECT 1;

-- ------------------------------------------------------------
-- Khach san: Old Quarter Charm Hotel (Hà Nội)
-- ------------------------------------------------------------
WITH new_hotel AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM users WHERE email = 'owner5@gmail.com'),
        'Old Quarter Charm Hotel',
        'Khach san nho giua long pho co',
        '20 Hang Bac',
        'Hà Nội',
        'Hoàn Kiếm',
        21.033,
        105.85,
        '02436000005',
        'contact5@gmail.com',
        3,
        'approved',
        0,
        0
    )
    RETURNING id
),
new_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h5=1', true, 1),
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h5=2', false, 2)
),
new_room_type AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES (
        (SELECT id FROM new_hotel),
        'Standard',
        'Phong tieu chuan pho co',
        650000,
        2,
        18,
        'Queen',
        1,
        3,
        true
    )
    RETURNING id
),
new_room_type_image AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES ((SELECT id FROM new_room_type), 'https://picsum.photos/1200/700?h5-room=1', true, 1)
),
new_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '201', 2, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '202', 2, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '203', 2, 'available', true)
),
new_hotel_amenities AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM new_hotel), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi', 'Breakfast Included')
),
new_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    SELECT (SELECT id FROM new_room_type), id FROM amenities
    WHERE scope = 'room' AND name IN ('Free WiFi', 'Breakfast Included')
),
new_service AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES ((SELECT id FROM new_hotel), 'Airport Pickup', 'Don san bay', 300000, 'chuyen', true)
)
,
new_promo AS (
    INSERT INTO promotions (
        hotel_id, name, description, discount_type, discount_value,
        min_booking_amount, max_discount_amount, start_date, end_date,
        usage_limit, used_count, is_active
    )
    VALUES (
        (SELECT id FROM new_hotel),
        'Kham pha pho co',
        'Giam 15% cho don tu 500k',
        'percentage',
        15,
        500000,
        NULL,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        100,
        0,
        true
    )
)
SELECT 1;

-- ------------------------------------------------------------
-- Khach san: Westlake Serenity Hotel (Hà Nội)
-- ------------------------------------------------------------
WITH new_hotel AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM users WHERE email = 'owner6@gmail.com'),
        'Westlake Serenity Hotel',
        'Khach san yen tinh canh Ho Tay',
        '88 Xuan Dieu',
        'Hà Nội',
        'Tây Hồ',
        21.058,
        105.823,
        '02436000006',
        'contact6@gmail.com',
        4,
        'approved',
        0,
        0
    )
    RETURNING id
),
new_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h6=1', true, 1),
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h6=2', false, 2)
),
new_room_type AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES (
        (SELECT id FROM new_hotel),
        'Lake View Deluxe',
        'Phong huong ho',
        1100000,
        3,
        30,
        'King',
        2,
        3,
        true
    )
    RETURNING id
),
new_room_type_image AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES ((SELECT id FROM new_room_type), 'https://picsum.photos/1200/700?h6-room=1', true, 1)
),
new_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '301', 3, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '302', 3, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '303', 3, 'available', true)
),
new_hotel_amenities AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM new_hotel), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi', 'Gym', 'Lake View')
),
new_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    SELECT (SELECT id FROM new_room_type), id FROM amenities
    WHERE scope = 'room' AND name IN ('Free WiFi', 'Gym', 'Lake View')
),
new_service AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES ((SELECT id FROM new_hotel), 'Spa', 'Dich vu spa thu gian', 450000, 'lan', true)
)
,
new_promo AS (
    INSERT INTO promotions (
        hotel_id, name, description, discount_type, discount_value,
        min_booking_amount, max_discount_amount, start_date, end_date,
        usage_limit, used_count, is_active
    )
    VALUES (
        (SELECT id FROM new_hotel),
        'Uu dai Ho Tay',
        'Giam thang 300k cho don tu 2 trieu',
        'fixed_amount',
        300000,
        2000000,
        NULL,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        100,
        0,
        true
    )
)
SELECT 1;

-- ------------------------------------------------------------
-- Khach san: Saigon Central Hotel (TP. Hồ Chí Minh)
-- ------------------------------------------------------------
WITH new_hotel AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM users WHERE email = 'owner7@gmail.com'),
        'Saigon Central Hotel',
        'Khach san trung tam Quan 1',
        '150 Nguyen Hue',
        'TP. Hồ Chí Minh',
        'Quận 1',
        10.7745,
        106.703,
        '02839000007',
        'contact7@gmail.com',
        4,
        'approved',
        0,
        0
    )
    RETURNING id
),
new_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h7=1', true, 1),
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h7=2', false, 2)
),
new_room_type AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES (
        (SELECT id FROM new_hotel),
        'Executive',
        'Phong cao cap trung tam',
        1200000,
        3,
        32,
        'King',
        2,
        3,
        true
    )
    RETURNING id
),
new_room_type_image AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES ((SELECT id FROM new_room_type), 'https://picsum.photos/1200/700?h7-room=1', true, 1)
),
new_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '401', 4, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '402', 4, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '403', 4, 'available', true)
),
new_hotel_amenities AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM new_hotel), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi', 'Gym', 'Breakfast Included')
),
new_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    SELECT (SELECT id FROM new_room_type), id FROM amenities
    WHERE scope = 'room' AND name IN ('Free WiFi', 'Gym', 'Breakfast Included')
),
new_service AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES ((SELECT id FROM new_hotel), 'Airport Pickup', 'Don san bay', 400000, 'chuyen', true)
)
,
new_promo AS (
    INSERT INTO promotions (
        hotel_id, name, description, discount_type, discount_value,
        min_booking_amount, max_discount_amount, start_date, end_date,
        usage_limit, used_count, is_active
    )
    VALUES (
        (SELECT id FROM new_hotel),
        'Sai Gon Sale',
        'Giam 25%, toi da 400k',
        'percentage',
        25,
        NULL,
        400000,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        100,
        0,
        true
    )
)
SELECT 1;

-- ------------------------------------------------------------
-- Khach san: Bitexco View Hotel (TP. Hồ Chí Minh)
-- ------------------------------------------------------------
WITH new_hotel AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM users WHERE email = 'owner8@gmail.com'),
        'Bitexco View Hotel',
        'Khach san 5 sao view Bitexco',
        '2 Hai Trieu',
        'TP. Hồ Chí Minh',
        'Quận 1',
        10.7715,
        106.704,
        '02839000008',
        'contact8@gmail.com',
        5,
        'approved',
        0,
        0
    )
    RETURNING id
),
new_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h8=1', true, 1),
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h8=2', false, 2)
),
new_room_type AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES (
        (SELECT id FROM new_hotel),
        'Sky Suite',
        'Phong suite tren cao view thanh pho',
        2000000,
        4,
        48,
        'King',
        2,
        3,
        true
    )
    RETURNING id
),
new_room_type_image AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES ((SELECT id FROM new_room_type), 'https://picsum.photos/1200/700?h8-room=1', true, 1)
),
new_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '2001', 20, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '2002', 20, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '2003', 20, 'available', true)
),
new_hotel_amenities AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM new_hotel), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi', 'Pool', 'Gym')
),
new_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    SELECT (SELECT id FROM new_room_type), id FROM amenities
    WHERE scope = 'room' AND name IN ('Free WiFi', 'Pool', 'Gym')
),
new_service AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES ((SELECT id FROM new_hotel), 'Spa', 'Dich vu spa cao cap', 700000, 'lan', true)
)
,
new_promo AS (
    INSERT INTO promotions (
        hotel_id, name, description, discount_type, discount_value,
        min_booking_amount, max_discount_amount, start_date, end_date,
        usage_limit, used_count, is_active
    )
    VALUES (
        (SELECT id FROM new_hotel),
        'Sky Deal',
        'Giam 10%',
        'percentage',
        10,
        NULL,
        NULL,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        100,
        0,
        true
    )
)
SELECT 1;

-- ------------------------------------------------------------
-- Khach san: Pham Ngu Lao Backpacker Inn (TP. Hồ Chí Minh)
-- ------------------------------------------------------------
WITH new_hotel AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM users WHERE email = 'owner9@gmail.com'),
        'Pham Ngu Lao Backpacker Inn',
        'Nha nghi gia re khu Tay ba lo',
        '220 Pham Ngu Lao',
        'TP. Hồ Chí Minh',
        'Quận 1',
        10.768,
        106.693,
        '02839000009',
        'contact9@gmail.com',
        2,
        'approved',
        0,
        0
    )
    RETURNING id
),
new_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h9=1', true, 1),
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h9=2', false, 2)
),
new_room_type AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES (
        (SELECT id FROM new_hotel),
        'Dormitory',
        'Phong tap the gia re',
        350000,
        2,
        14,
        'Single',
        2,
        3,
        true
    )
    RETURNING id
),
new_room_type_image AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES ((SELECT id FROM new_room_type), 'https://picsum.photos/1200/700?h9-room=1', true, 1)
),
new_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '11', 1, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '12', 1, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '13', 1, 'available', true)
),
new_hotel_amenities AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM new_hotel), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi')
),
new_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    SELECT (SELECT id FROM new_room_type), id FROM amenities
    WHERE scope = 'room' AND name IN ('Free WiFi')
),
new_service AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES ((SELECT id FROM new_hotel), 'Laundry', 'Giat ui', 30000, 'kg', true)
)
SELECT 1;

-- ------------------------------------------------------------
-- Khach san: Dalat Pine Hill Resort (Lâm Đồng)
-- ------------------------------------------------------------
WITH new_hotel AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM users WHERE email = 'owner10@gmail.com'),
        'Dalat Pine Hill Resort',
        'Resort giua rung thong Da Lat',
        '5 Tran Hung Dao',
        'Lâm Đồng',
        'Đà Lạt',
        11.946,
        108.438,
        '02633000010',
        'contact10@gmail.com',
        4,
        'approved',
        0,
        0
    )
    RETURNING id
),
new_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h10=1', true, 1),
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h10=2', false, 2)
),
new_room_type AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES (
        (SELECT id FROM new_hotel),
        'Pine View Deluxe',
        'Phong huong rung thong',
        1300000,
        3,
        34,
        'King',
        2,
        3,
        true
    )
    RETURNING id
),
new_room_type_image AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES ((SELECT id FROM new_room_type), 'https://picsum.photos/1200/700?h10-room=1', true, 1)
),
new_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '101', 1, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '102', 1, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '103', 1, 'available', true)
),
new_hotel_amenities AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM new_hotel), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi', 'Breakfast Included', 'Fireplace')
),
new_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    SELECT (SELECT id FROM new_room_type), id FROM amenities
    WHERE scope = 'room' AND name IN ('Free WiFi', 'Breakfast Included', 'Fireplace')
),
new_service AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES ((SELECT id FROM new_hotel), 'Bonfire Night', 'Dem lua trai', 200000, 'lan', true)
)
,
new_promo AS (
    INSERT INTO promotions (
        hotel_id, name, description, discount_type, discount_value,
        min_booking_amount, max_discount_amount, start_date, end_date,
        usage_limit, used_count, is_active
    )
    VALUES (
        (SELECT id FROM new_hotel),
        'Thong Xanh Sale',
        'Giam thang 250k cho don tu 1 trieu',
        'fixed_amount',
        250000,
        1000000,
        NULL,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        100,
        0,
        true
    )
)
SELECT 1;

-- ------------------------------------------------------------
-- Khach san: Xuan Huong Lakeside Hotel (Lâm Đồng)
-- ------------------------------------------------------------
WITH new_hotel AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM users WHERE email = 'owner11@gmail.com'),
        'Xuan Huong Lakeside Hotel',
        'Khach san canh Ho Xuan Huong',
        '30 Tran Quoc Toan',
        'Lâm Đồng',
        'Đà Lạt',
        11.941,
        108.442,
        '02633000011',
        'contact11@gmail.com',
        3,
        'approved',
        0,
        0
    )
    RETURNING id
),
new_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h11=1', true, 1),
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h11=2', false, 2)
),
new_room_type AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES (
        (SELECT id FROM new_hotel),
        'Standard',
        'Phong tieu chuan huong ho',
        700000,
        2,
        22,
        'Queen',
        1,
        3,
        true
    )
    RETURNING id
),
new_room_type_image AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES ((SELECT id FROM new_room_type), 'https://picsum.photos/1200/700?h11-room=1', true, 1)
),
new_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '201', 2, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '202', 2, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '203', 2, 'available', true)
),
new_hotel_amenities AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM new_hotel), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi', 'Breakfast Included')
),
new_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    SELECT (SELECT id FROM new_room_type), id FROM amenities
    WHERE scope = 'room' AND name IN ('Free WiFi', 'Breakfast Included')
),
new_service AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES ((SELECT id FROM new_hotel), 'Bike Rental', 'Thue xe dap', 50000, 'ngay', true)
)
SELECT 1;

-- ------------------------------------------------------------
-- Khach san: Cau Dat Tea Village Homestay (Lâm Đồng)
-- ------------------------------------------------------------
WITH new_hotel AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM users WHERE email = 'owner12@gmail.com'),
        'Cau Dat Tea Village Homestay',
        'Homestay giua doi che Cau Dat',
        'Thon Cau Dat',
        'Lâm Đồng',
        'Xuân Trường',
        11.87,
        108.47,
        '02633000012',
        'contact12@gmail.com',
        2,
        'approved',
        0,
        0
    )
    RETURNING id
),
new_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h12=1', true, 1),
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h12=2', false, 2)
),
new_room_type AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES (
        (SELECT id FROM new_hotel),
        'Garden Bungalow',
        'Bungalow giua doi che',
        450000,
        2,
        16,
        'Queen',
        1,
        2,
        true
    )
    RETURNING id
),
new_room_type_image AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES ((SELECT id FROM new_room_type), 'https://picsum.photos/1200/700?h12-room=1', true, 1)
),
new_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), 'B1', 1, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), 'B2', 1, 'available', true)
),
new_hotel_amenities AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM new_hotel), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi', 'Tea Garden Tour')
),
new_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    SELECT (SELECT id FROM new_room_type), id FROM amenities
    WHERE scope = 'room' AND name IN ('Free WiFi', 'Tea Garden Tour')
),
new_service AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES ((SELECT id FROM new_hotel), 'Tea Tour', 'Tham quan doi che', 100000, 'luot', true)
)
,
new_promo AS (
    INSERT INTO promotions (
        hotel_id, name, description, discount_type, discount_value,
        min_booking_amount, max_discount_amount, start_date, end_date,
        usage_limit, used_count, is_active
    )
    VALUES (
        (SELECT id FROM new_hotel),
        'Doi Che Sale',
        'Giam 30% cho don tu 300k',
        'percentage',
        30,
        300000,
        NULL,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        100,
        0,
        true
    )
)
SELECT 1;

-- ------------------------------------------------------------
-- Khach san: Nha Trang Ocean Pearl Resort (Khánh Hòa)
-- ------------------------------------------------------------
WITH new_hotel AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM users WHERE email = 'owner13@gmail.com'),
        'Nha Trang Ocean Pearl Resort',
        'Resort 5 sao doc bien Tran Phu',
        '86 Tran Phu',
        'Khánh Hòa',
        'Nha Trang',
        12.238,
        109.197,
        '02583000013',
        'contact13@gmail.com',
        5,
        'approved',
        0,
        0
    )
    RETURNING id
),
new_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h13=1', true, 1),
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h13=2', false, 2)
),
new_room_type AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES (
        (SELECT id FROM new_hotel),
        'Ocean Suite',
        'Suite huong bien',
        1900000,
        4,
        46,
        'King',
        2,
        3,
        true
    )
    RETURNING id
),
new_room_type_image AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES ((SELECT id FROM new_room_type), 'https://picsum.photos/1200/700?h13-room=1', true, 1)
),
new_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '1501', 15, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '1502', 15, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '1503', 15, 'available', true)
),
new_hotel_amenities AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM new_hotel), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi', 'Pool', 'Sea View')
),
new_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    SELECT (SELECT id FROM new_room_type), id FROM amenities
    WHERE scope = 'room' AND name IN ('Free WiFi', 'Pool', 'Sea View')
),
new_service AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES ((SELECT id FROM new_hotel), 'Diving Tour', 'Tour lan bien', 600000, 'luot', true)
)
,
new_promo AS (
    INSERT INTO promotions (
        hotel_id, name, description, discount_type, discount_value,
        min_booking_amount, max_discount_amount, start_date, end_date,
        usage_limit, used_count, is_active
    )
    VALUES (
        (SELECT id FROM new_hotel),
        'Pearl Deal',
        'Giam 12%, toi da 300k',
        'percentage',
        12,
        NULL,
        300000,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        100,
        0,
        true
    )
)
SELECT 1;

-- ------------------------------------------------------------
-- Khach san: Vinpearl View Hotel (Khánh Hòa)
-- ------------------------------------------------------------
WITH new_hotel AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM users WHERE email = 'owner14@gmail.com'),
        'Vinpearl View Hotel',
        'Khach san view Vinpearl tu dat lien',
        '10 Pham Van Dong',
        'Khánh Hòa',
        'Nha Trang',
        12.25,
        109.193,
        '02583000014',
        'contact14@gmail.com',
        4,
        'approved',
        0,
        0
    )
    RETURNING id
),
new_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h14=1', true, 1),
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h14=2', false, 2)
),
new_room_type AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES (
        (SELECT id FROM new_hotel),
        'Deluxe',
        'Phong huong bien Vinpearl',
        1250000,
        3,
        30,
        'King',
        2,
        3,
        true
    )
    RETURNING id
),
new_room_type_image AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES ((SELECT id FROM new_room_type), 'https://picsum.photos/1200/700?h14-room=1', true, 1)
),
new_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '801', 8, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '802', 8, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '803', 8, 'available', true)
),
new_hotel_amenities AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM new_hotel), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi', 'Gym', 'Sea View')
),
new_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    SELECT (SELECT id FROM new_room_type), id FROM amenities
    WHERE scope = 'room' AND name IN ('Free WiFi', 'Gym', 'Sea View')
),
new_service AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES ((SELECT id FROM new_hotel), 'Airport Pickup', 'Don san bay', 300000, 'chuyen', true)
)
SELECT 1;

-- ------------------------------------------------------------
-- Khach san: Beachfront Backpacker Nha Trang (Khánh Hòa)
-- ------------------------------------------------------------
WITH new_hotel AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM users WHERE email = 'owner15@gmail.com'),
        'Beachfront Backpacker Nha Trang',
        'Nha nghi gia re sat bien',
        '88 Nguyen Thien Thuat',
        'Khánh Hòa',
        'Nha Trang',
        12.241,
        109.195,
        '02583000015',
        'contact15@gmail.com',
        2,
        'approved',
        0,
        0
    )
    RETURNING id
),
new_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h15=1', true, 1),
        ((SELECT id FROM new_hotel), 'https://picsum.photos/1200/700?h15=2', false, 2)
),
new_room_type AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, bed_count, total_rooms, is_active)
    VALUES (
        (SELECT id FROM new_hotel),
        'Standard',
        'Phong tieu chuan gan bien',
        380000,
        2,
        16,
        'Single',
        2,
        3,
        true
    )
    RETURNING id
),
new_room_type_image AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES ((SELECT id FROM new_room_type), 'https://picsum.photos/1200/700?h15-room=1', true, 1)
),
new_rooms AS (
    INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '21', 2, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '22', 2, 'available', true),
        ((SELECT id FROM new_hotel), (SELECT id FROM new_room_type), '23', 2, 'available', true)
),
new_hotel_amenities AS (
    INSERT INTO hotel_amenities (hotel_id, amenity_id)
    SELECT (SELECT id FROM new_hotel), id FROM amenities
    WHERE scope = 'hotel' AND name IN ('Free WiFi')
),
new_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    SELECT (SELECT id FROM new_room_type), id FROM amenities
    WHERE scope = 'room' AND name IN ('Free WiFi')
),
new_service AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES ((SELECT id FROM new_hotel), 'Bike Rental', 'Thue xe may', 120000, 'ngay', true)
)
,
new_promo AS (
    INSERT INTO promotions (
        hotel_id, name, description, discount_type, discount_value,
        min_booking_amount, max_discount_amount, start_date, end_date,
        usage_limit, used_count, is_active
    )
    VALUES (
        (SELECT id FROM new_hotel),
        'Backpacker Deal',
        'Giam thang 50k',
        'fixed_amount',
        50000,
        NULL,
        NULL,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        100,
        0,
        true
    )
)
SELECT 1;

-- Danh gia cho Saigon Central Hotel
WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-001',
        (SELECT id FROM users WHERE email = 'user1@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Saigon Central Hotel'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        1200000,
        1200000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user1@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Saigon Central Hotel'),
    (SELECT id FROM seed_booking),
    8,
    'Vi tri rat trung tam, tien di lai';

WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-002',
        (SELECT id FROM users WHERE email = 'user2@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Saigon Central Hotel'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        1200000,
        1200000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user2@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Saigon Central Hotel'),
    (SELECT id FROM seed_booking),
    6,
    'On, hoi on ao';

-- Danh gia cho Bitexco View Hotel
WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-003',
        (SELECT id FROM users WHERE email = 'user1@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Bitexco View Hotel'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        2000000,
        2000000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user1@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Bitexco View Hotel'),
    (SELECT id FROM seed_booking),
    10,
    'Tuyet voi, view dep khong the che';

WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-004',
        (SELECT id FROM users WHERE email = 'user2@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Bitexco View Hotel'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        2000000,
        2000000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user2@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Bitexco View Hotel'),
    (SELECT id FROM seed_booking),
    10,
    'Dich vu 5 sao dung nghia';

WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-005',
        (SELECT id FROM users WHERE email = 'user3@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Bitexco View Hotel'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        2000000,
        2000000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user3@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Bitexco View Hotel'),
    (SELECT id FROM seed_booking),
    8,
    'Rat tot, gia hoi cao';

WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-006',
        (SELECT id FROM users WHERE email = 'user4@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Bitexco View Hotel'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        2000000,
        2000000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user4@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Bitexco View Hotel'),
    (SELECT id FROM seed_booking),
    10,
    'Se quay lai lan sau';

WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-007',
        (SELECT id FROM users WHERE email = 'user5@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Bitexco View Hotel'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        2000000,
        2000000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user5@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Bitexco View Hotel'),
    (SELECT id FROM seed_booking),
    8,
    'Phong sach dep, nhan vien nhiet tinh';

-- Danh gia cho Dalat Pine Hill Resort
WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-008',
        (SELECT id FROM users WHERE email = 'user2@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Dalat Pine Hill Resort'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        1300000,
        1300000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user2@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Dalat Pine Hill Resort'),
    (SELECT id FROM seed_booking),
    10,
    'Khong khi mat me, view thong dep';

WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-009',
        (SELECT id FROM users WHERE email = 'user3@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Dalat Pine Hill Resort'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        1300000,
        1300000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user3@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Dalat Pine Hill Resort'),
    (SELECT id FROM seed_booking),
    8,
    'Rat thich hop nghi duong';

WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-010',
        (SELECT id FROM users WHERE email = 'user6@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Dalat Pine Hill Resort'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        1300000,
        1300000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user6@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Dalat Pine Hill Resort'),
    (SELECT id FROM seed_booking),
    8,
    'Dich vu tot, gia hop ly';

-- Danh gia cho Xuan Huong Lakeside Hotel
WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-011',
        (SELECT id FROM users WHERE email = 'user4@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Xuan Huong Lakeside Hotel'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        700000,
        700000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user4@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Xuan Huong Lakeside Hotel'),
    (SELECT id FROM seed_booking),
    6,
    'Vi tri dep nhung phong hoi cu';

WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-012',
        (SELECT id FROM users WHERE email = 'user5@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Xuan Huong Lakeside Hotel'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        700000,
        700000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user5@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Xuan Huong Lakeside Hotel'),
    (SELECT id FROM seed_booking),
    8,
    'On trong tam gia';

-- Danh gia cho Cau Dat Tea Village Homestay
WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-013',
        (SELECT id FROM users WHERE email = 'user6@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Cau Dat Tea Village Homestay'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        450000,
        450000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user6@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Cau Dat Tea Village Homestay'),
    (SELECT id FROM seed_booking),
    10,
    'Trai nghiem doc dao, view doi che tuyet dep';

-- Danh gia cho Nha Trang Ocean Pearl Resort
WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-014',
        (SELECT id FROM users WHERE email = 'user1@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Nha Trang Ocean Pearl Resort'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        1900000,
        1900000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user1@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Nha Trang Ocean Pearl Resort'),
    (SELECT id FROM seed_booking),
    10,
    'Bien dep, resort sang trong';

WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-015',
        (SELECT id FROM users WHERE email = 'user3@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Nha Trang Ocean Pearl Resort'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        1900000,
        1900000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user3@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Nha Trang Ocean Pearl Resort'),
    (SELECT id FROM seed_booking),
    10,
    'Dang tien tung dong';

WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-016',
        (SELECT id FROM users WHERE email = 'user4@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Nha Trang Ocean Pearl Resort'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        1900000,
        1900000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user4@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Nha Trang Ocean Pearl Resort'),
    (SELECT id FROM seed_booking),
    10,
    'Ky nghi tuyet voi ben gia dinh';

WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-017',
        (SELECT id FROM users WHERE email = 'user5@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Nha Trang Ocean Pearl Resort'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        1900000,
        1900000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user5@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Nha Trang Ocean Pearl Resort'),
    (SELECT id FROM seed_booking),
    8,
    'Rat tot, do an hoi dat';

-- Danh gia cho Vinpearl View Hotel
WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-018',
        (SELECT id FROM users WHERE email = 'user2@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Vinpearl View Hotel'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        1250000,
        1250000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user2@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Vinpearl View Hotel'),
    (SELECT id FROM seed_booking),
    8,
    'View dep, gan bien';

WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-019',
        (SELECT id FROM users WHERE email = 'user6@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Vinpearl View Hotel'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        1250000,
        1250000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user6@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Vinpearl View Hotel'),
    (SELECT id FROM seed_booking),
    10,
    'Rat hai long';

WITH seed_booking AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date, num_guests,
        total_room_price, total_amount, status
    )
    VALUES (
        'BK-SEED-020',
        (SELECT id FROM users WHERE email = 'user1@gmail.com'),
        (SELECT id FROM hotels WHERE name = 'Vinpearl View Hotel'),
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '27 days',
        2,
        1250000,
        1250000,
        'checked_out'
    )
    RETURNING id
)
INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
SELECT
    (SELECT id FROM users WHERE email = 'user1@gmail.com'),
    (SELECT id FROM hotels WHERE name = 'Vinpearl View Hotel'),
    (SELECT id FROM seed_booking),
    8,
    'Sach se, nhan vien than thien';

-- Gan loai phong cho cac booking seed.
-- Gia chup lai lay theo base_price cua loai phong, so dem lay tu ngay nhan/tra phong.
INSERT INTO booking_rooms (booking_id, room_type_id, quantity, price_per_night, num_nights, subtotal)
SELECT
    b.id,
    rt.id,
    1,
    rt.base_price,
    b.check_out_date - b.check_in_date,
    rt.base_price * (b.check_out_date - b.check_in_date)
FROM bookings b
JOIN LATERAL (
    SELECT id, base_price FROM room_types WHERE hotel_id = b.hotel_id ORDER BY id LIMIT 1
) rt ON true
WHERE b.booking_code LIKE 'BK-SEED-%';

-- Dong bo tong tien cua booking seed theo dong booking_rooms vua tao.
UPDATE bookings b
SET total_room_price = br.subtotal,
    total_amount = br.subtotal
FROM booking_rooms br
WHERE br.booking_id = b.id
  AND b.booking_code LIKE 'BK-SEED-%';

COMMIT;
