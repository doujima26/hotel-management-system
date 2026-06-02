-- Seed data for hotel-management-system (BIGSERIAL/BIGINT version)


BEGIN;

WITH seeded_users AS (
    INSERT INTO users (email, password_hash, full_name, phone, role, is_active, is_verified)
    VALUES
        ('superadmin@hotel.local', '$2b$12$dummyhash', 'Super Admin', '0900000001', 'super_admin', true, true),
        ('owner1@hotel.local', '$2b$12$dummyhash', 'Nguyen Van Owner', '0900000002', 'admin', true, true),
        ('staff1@hotel.local', '$2b$12$dummyhash', 'Tran Thi Staff', '0900000003', 'staff', true, true),
        ('user1@hotel.local', '$2b$12$dummyhash', 'Le Van User', '0900000004', 'user', true, true),
        ('user2@hotel.local', '$2b$12$dummyhash', 'Pham Thi User', '0900000005', 'user', true, true)
    RETURNING id, email
),
owner AS (SELECT id FROM seeded_users WHERE email = 'owner1@hotel.local'),
staff_user AS (SELECT id FROM seeded_users WHERE email = 'staff1@hotel.local'),
user1 AS (SELECT id FROM seeded_users WHERE email = 'user1@hotel.local'),
user2 AS (SELECT id FROM seeded_users WHERE email = 'user2@hotel.local'),

seeded_hotel AS (
    INSERT INTO hotels (
        owner_id, name, description, address, city, district, latitude, longitude,
        phone, email, star_rating, status, avg_rating, total_reviews
    )
    VALUES (
        (SELECT id FROM owner),
        'Sunrise Hotel Da Nang',
        'Khach san 4 sao gan bien My Khe',
        '123 Vo Nguyen Giap',
        'Da Nang',
        'Son Tra',
        16.071463,
        108.245727,
        '02361234567',
        'contact@sunrise-hotel.local',
        4,
        'approved',
        0,
        0
    )
    RETURNING id
),

seeded_hotel_images AS (
    INSERT INTO hotel_images (hotel_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM seeded_hotel), 'https://picsum.photos/1200/700?hotel=1', true, 1),
        ((SELECT id FROM seeded_hotel), 'https://picsum.photos/1200/700?hotel=2', false, 2)
),

seeded_room_types AS (
    INSERT INTO room_types (hotel_id, name, description, base_price, max_guests, area_sqm, bed_type, total_rooms, is_active)
    VALUES
        ((SELECT id FROM seeded_hotel), 'Standard', 'Phong tieu chuan', 800000, 2, 24, 'Queen', 5, true),
        ((SELECT id FROM seeded_hotel), 'Deluxe', 'Phong cao cap view bien', 1400000, 3, 32, 'King', 4, true)
    RETURNING id, name
),
standard_type AS (SELECT id FROM seeded_room_types WHERE name = 'Standard'),
deluxe_type AS (SELECT id FROM seeded_room_types WHERE name = 'Deluxe'),

seeded_room_type_images AS (
    INSERT INTO room_type_images (room_type_id, image_url, is_primary, sort_order)
    VALUES
        ((SELECT id FROM standard_type), 'https://picsum.photos/1200/700?standard=1', true, 1),
        ((SELECT id FROM deluxe_type), 'https://picsum.photos/1200/700?deluxe=1', true, 1)
),

seeded_rooms AS (
    INSERT INTO rooms (room_type_id, room_number, floor, status, is_active)
    VALUES
        ((SELECT id FROM standard_type), '201', 2, 'available', true),
        ((SELECT id FROM standard_type), '202', 2, 'available', true),
        ((SELECT id FROM deluxe_type), '301', 3, 'available', true),
        ((SELECT id FROM deluxe_type), '302', 3, 'maintenance', true)
    RETURNING id, room_number
),
room_201 AS (SELECT id FROM seeded_rooms WHERE room_number = '201'),

seeded_amenities AS (
    INSERT INTO amenities (hotel_id, name, icon, category)
    VALUES
        ((SELECT id FROM seeded_hotel), 'Free WiFi', 'wifi', 'general'),
        ((SELECT id FROM seeded_hotel), 'Air Conditioner', 'snowflake', 'room'),
        ((SELECT id FROM seeded_hotel), 'Sea View', 'waves', 'view')
    RETURNING id, name
),
wifi AS (SELECT id FROM seeded_amenities WHERE name = 'Free WiFi'),
ac AS (SELECT id FROM seeded_amenities WHERE name = 'Air Conditioner'),
sea_view AS (SELECT id FROM seeded_amenities WHERE name = 'Sea View'),

seeded_rta AS (
    INSERT INTO room_type_amenities (room_type_id, amenity_id)
    VALUES
        ((SELECT id FROM standard_type), (SELECT id FROM wifi)),
        ((SELECT id FROM standard_type), (SELECT id FROM ac)),
        ((SELECT id FROM deluxe_type), (SELECT id FROM wifi)),
        ((SELECT id FROM deluxe_type), (SELECT id FROM ac)),
        ((SELECT id FROM deluxe_type), (SELECT id FROM sea_view))
),

seeded_promo AS (
    INSERT INTO promotions (
        hotel_id, name, description, discount_type, discount_value,
        min_booking_amount, max_discount_amount, start_date, end_date,
        usage_limit, used_count, is_active
    )
    VALUES (
        (SELECT id FROM seeded_hotel),
        'Summer Sale',
        'Giam 10% cho don tu 1.5 trieu',
        'percentage',
        10,
        1500000,
        500000,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        100,
        1,
        true
    )
    RETURNING id
),

seeded_services AS (
    INSERT INTO hotel_services (hotel_id, name, description, price, unit, is_active)
    VALUES
        ((SELECT id FROM seeded_hotel), 'Airport Pickup', 'Don san bay', 300000, 'trip', true),
        ((SELECT id FROM seeded_hotel), 'Laundry', 'Giat ui', 50000, 'kg', true)
    RETURNING id, name
),
airport_pickup AS (SELECT id FROM seeded_services WHERE name = 'Airport Pickup'),

seeded_staff AS (
    INSERT INTO staff_members (user_id, hotel_id, position, is_active, hired_at)
    VALUES ((SELECT id FROM staff_user), (SELECT id FROM seeded_hotel), 'Receptionist', true, CURRENT_DATE - INTERVAL '90 days')
    RETURNING id
),

seeded_schedule AS (
    INSERT INTO staff_schedules (staff_id, shift_date, shift_type, start_time, end_time, notes)
    VALUES ((SELECT id FROM seeded_staff), CURRENT_DATE, 'morning', '07:00', '15:00', 'Front desk morning shift')
),

seeded_bookings AS (
    INSERT INTO bookings (
        booking_code, user_id, hotel_id, check_in_date, check_out_date,
        num_guests, total_room_price, total_service_price, discount_amount,
        total_amount, status, promotion_id, special_requests
    )
    VALUES
        (
            'BK-20260517-001',
            (SELECT id FROM user1),
            (SELECT id FROM seeded_hotel),
            CURRENT_DATE + INTERVAL '2 days',
            CURRENT_DATE + INTERVAL '4 days',
            2,
            1600000,
            300000,
            160000,
            1740000,
            'confirmed',
            (SELECT id FROM seeded_promo),
            'Tang cao neu con phong'
        ),
        (
            'BK-20260517-002',
            (SELECT id FROM user2),
            (SELECT id FROM seeded_hotel),
            CURRENT_DATE - INTERVAL '5 days',
            CURRENT_DATE - INTERVAL '3 days',
            2,
            2800000,
            0,
            0,
            2800000,
            'checked_out',
            NULL,
            NULL
        )
    RETURNING id, booking_code, user_id, hotel_id
),
booking_1 AS (SELECT id FROM seeded_bookings WHERE booking_code = 'BK-20260517-001'),
booking_2 AS (SELECT id FROM seeded_bookings WHERE booking_code = 'BK-20260517-002'),

seeded_booking_rooms AS (
    INSERT INTO booking_rooms (booking_id, room_type_id, room_id, quantity, price_per_night, num_nights, subtotal)
    VALUES
        ((SELECT id FROM booking_1), (SELECT id FROM standard_type), (SELECT id FROM room_201), 1, 800000, 2, 1600000),
        ((SELECT id FROM booking_2), (SELECT id FROM deluxe_type), NULL, 1, 1400000, 2, 2800000)
),

seeded_booking_services AS (
    INSERT INTO booking_services (booking_id, service_id, quantity, unit_price, subtotal, used_at)
    VALUES ((SELECT id FROM booking_1), (SELECT id FROM airport_pickup), 1, 300000, 300000, NOW())
),

seeded_payments AS (
    INSERT INTO payments (
        booking_id, amount, payment_method, payment_status, transaction_id,
        payment_gateway_response, paid_at
    )
    VALUES
        (
            (SELECT id FROM booking_1),
            1740000,
            'momo',
            'completed',
            'TXN_MOMO_001',
            '{"gateway":"momo","result":"success"}'::jsonb,
            NOW()
        ),
        (
            (SELECT id FROM booking_2),
            2800000,
            'credit_card',
            'completed',
            'TXN_CC_002',
            '{"gateway":"credit_card","result":"success"}'::jsonb,
            NOW() - INTERVAL '4 days'
        )
    RETURNING id, booking_id
),
payment_1 AS (SELECT id FROM seeded_payments WHERE booking_id = (SELECT id FROM booking_1)),
payment_2 AS (SELECT id FROM seeded_payments WHERE booking_id = (SELECT id FROM booking_2)),

seeded_invoices AS (
    INSERT INTO invoices (
        invoice_number, booking_id, payment_id, user_id, hotel_id,
        total_room_price, total_service_price, discount_amount, total_amount
    )
    VALUES
        (
            'INV-20260517-001',
            (SELECT id FROM booking_1),
            (SELECT id FROM payment_1),
            (SELECT user_id FROM seeded_bookings WHERE booking_code = 'BK-20260517-001'),
            (SELECT hotel_id FROM seeded_bookings WHERE booking_code = 'BK-20260517-001'),
            1600000,
            300000,
            160000,
            1740000
        ),
        (
            'INV-20260517-002',
            (SELECT id FROM booking_2),
            (SELECT id FROM payment_2),
            (SELECT user_id FROM seeded_bookings WHERE booking_code = 'BK-20260517-002'),
            (SELECT hotel_id FROM seeded_bookings WHERE booking_code = 'BK-20260517-002'),
            2800000,
            0,
            0,
            2800000
        )
),

seeded_checkinout AS (
    INSERT INTO check_in_outs (booking_id, staff_id, type, performed_at, notes)
    VALUES
        ((SELECT id FROM booking_2), (SELECT id FROM seeded_staff), 'check_in', NOW() - INTERVAL '5 days', 'On-time check in'),
        ((SELECT id FROM booking_2), (SELECT id FROM seeded_staff), 'check_out', NOW() - INTERVAL '3 days', 'Completed check out')
),

seeded_reviews AS (
    INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
    VALUES
        (
            (SELECT user_id FROM seeded_bookings WHERE booking_code = 'BK-20260517-002'),
            (SELECT hotel_id FROM seeded_bookings WHERE booking_code = 'BK-20260517-002'),
            (SELECT id FROM booking_2),
            5,
            'Phong dep, nhan vien than thien'
        )
),

seeded_favorites AS (
    INSERT INTO favorites (user_id, hotel_id)
    VALUES
        ((SELECT id FROM user1), (SELECT id FROM seeded_hotel)),
        ((SELECT id FROM user2), (SELECT id FROM seeded_hotel))
)
SELECT 'Seed completed' AS result;

COMMIT;
