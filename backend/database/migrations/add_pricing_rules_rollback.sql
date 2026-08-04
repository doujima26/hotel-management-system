-- Rollback add_pricing_rules.sql - xoa bang quy tac gia theo mua.
-- Gia da sua tay trong room_type_rates khong bi anh huong.
-- Chay: psql -d <db> -f backend/database/migrations/add_pricing_rules_rollback.sql

BEGIN;

DROP TABLE IF EXISTS pricing_rules;

COMMIT;
