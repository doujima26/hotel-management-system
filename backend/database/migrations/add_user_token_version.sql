-- Migration: them token_version vao bang users de thu hoi toan bo phien dang
-- nhap (access + refresh token tren MOI thiet bi) khi doi/dat lai mat khau.
-- JWT mang claim "ver"; khi xac thuc so voi users.token_version, lech thi 401.
-- Chay: psql -d <db> -f backend/database/migrations/add_user_token_version.sql
-- Rollback: backend/database/migrations/add_user_token_version_rollback.sql

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
