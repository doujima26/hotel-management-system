-- Migration: them "Quy tac chung" (house rules) vao bang hotels.
-- Chay: psql -d <db> -f backend/database/migrations/add_hotel_policies.sql
-- Rollback: backend/database/migrations/add_hotel_policies_rollback.sql

ALTER TABLE hotels
    ADD COLUMN IF NOT EXISTS check_in_time        TIME NOT NULL DEFAULT '14:00',
    ADD COLUMN IF NOT EXISTS check_out_time       TIME NOT NULL DEFAULT '12:00',
    ADD COLUMN IF NOT EXISTS cancellation_policy  TEXT,
    ADD COLUMN IF NOT EXISTS children_policy      TEXT,
    ADD COLUMN IF NOT EXISTS pets_allowed         BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS payment_methods      JSONB NOT NULL DEFAULT '[]';
