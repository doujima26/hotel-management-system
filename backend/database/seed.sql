-- Seed data cho hotel-management-system (BIGSERIAL/BIGINT version).
-- Muc tieu: du lieu kho hang day du (khach san/loai phong/phong vat ly/tien nghi/
-- dich vu/khuyen mai) o 2 thanh phong khac nhau, KHONG co san booking/thanh toan/
-- danh gia - de tu tay test tron ven luong tim -> dat -> thanh toan -> xac nhan.
-- Mat khau dang nhap chung cho MOI tai khoan seed: Password123!
-- (hash bcrypt that, tao tu app.core.security.hash_password - dang nhap duoc ngay).

BEGIN;

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
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, total_rooms, is_active)
    VALUES
        ((SELECT id FROM hotel1), 'Standard', 'Phong tieu chuan huong pho', 800000, 2, 24, 'Queen', 3, true),
        ((SELECT id FROM hotel1), 'Deluxe', 'Phong cao cap view bien', 1400000, 3, 32, 'King', 2, true)
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
    INSERT INTO rooms (room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM hotel1_standard), '201', 2, 'available', true),
        ((SELECT id FROM hotel1_standard), '202', 2, 'available', true),
        ((SELECT id FROM hotel1_standard), '203', 2, 'available', true),
        ((SELECT id FROM hotel1_deluxe), '301', 3, 'available', true),
        ((SELECT id FROM hotel1_deluxe), '302', 3, 'available', true)
),
hotel1_amenities AS (
    INSERT INTO amenities (hotel_id, name, icon, category)
    VALUES
        ((SELECT id FROM hotel1), 'Free WiFi', 'wifi', 'general'),
        ((SELECT id FROM hotel1), 'Air Conditioner', 'snowflake', 'room'),
        ((SELECT id FROM hotel1), 'Sea View', 'waves', 'view')
    RETURNING id, name
),
hotel1_wifi AS (SELECT id FROM hotel1_amenities WHERE name = 'Free WiFi'),
hotel1_ac AS (SELECT id FROM hotel1_amenities WHERE name = 'Air Conditioner'),
hotel1_sea_view AS (SELECT id FROM hotel1_amenities WHERE name = 'Sea View'),
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
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, total_rooms, is_active)
    VALUES
        ((SELECT id FROM hotel2), 'Standard', 'Phong tieu chuan pho co', 900000, 2, 22, 'Queen', 3, true),
        ((SELECT id FROM hotel2), 'Suite', 'Phong suite rong rai', 2200000, 4, 45, 'King', 2, true)
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
    INSERT INTO rooms (room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM hotel2_standard), '101', 1, 'available', true),
        ((SELECT id FROM hotel2_standard), '102', 1, 'available', true),
        ((SELECT id FROM hotel2_standard), '103', 1, 'available', true),
        ((SELECT id FROM hotel2_suite), '501', 5, 'available', true),
        ((SELECT id FROM hotel2_suite), '502', 5, 'available', true)
),
hotel2_amenities AS (
    INSERT INTO amenities (hotel_id, name, icon, category)
    VALUES
        ((SELECT id FROM hotel2), 'Free WiFi', 'wifi', 'general'),
        ((SELECT id FROM hotel2), 'Breakfast Included', 'coffee', 'general'),
        ((SELECT id FROM hotel2), 'Gym', 'dumbbell', 'general')
    RETURNING id, name
),
hotel2_wifi AS (SELECT id FROM hotel2_amenities WHERE name = 'Free WiFi'),
hotel2_breakfast AS (SELECT id FROM hotel2_amenities WHERE name = 'Breakfast Included'),
hotel2_gym AS (SELECT id FROM hotel2_amenities WHERE name = 'Gym'),
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

COMMIT;
