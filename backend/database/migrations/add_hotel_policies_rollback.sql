-- Rollback migration add_hotel_policies.sql - go 6 cot quy tac chung khoi bang hotels.
-- Chay: psql -d <db> -f backend/database/migrations/add_hotel_policies_rollback.sql

ALTER TABLE hotels
    DROP COLUMN IF EXISTS check_in_time,
    DROP COLUMN IF EXISTS check_out_time,
    DROP COLUMN IF EXISTS cancellation_policy,
    DROP COLUMN IF EXISTS children_policy,
    DROP COLUMN IF EXISTS pets_allowed,
    DROP COLUMN IF EXISTS payment_methods;
