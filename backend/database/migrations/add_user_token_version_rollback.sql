-- Rollback add_user_token_version.sql - go cot token_version khoi bang users.
-- Luu y: sau khi rollback, backend phai bo claim "ver" thi token moi dung duoc.
-- Chay: psql -d <db> -f backend/database/migrations/add_user_token_version_rollback.sql

ALTER TABLE users
    DROP COLUMN IF EXISTS token_version;
