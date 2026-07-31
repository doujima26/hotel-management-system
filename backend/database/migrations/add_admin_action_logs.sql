-- Migration: them bang admin_action_logs - nhat ky cac hanh dong quan tri cua
-- Super Admin.
--
-- Duyet/tu choi/tam dung khach san va khoa/mo tai khoan deu la hanh dong anh
-- huong truc tiep den hoat dong kinh doanh cua nguoi khac, nhung truoc day
-- khong luu lai vet nao: khong biet ai lam, luc nao, vi ly do gi.
--
-- HAI QUYET DINH THIET KE:
--
-- 1. target_label luu SNAPSHOT ten khach san / email nguoi dung tai thoi diem
--    hanh dong. Neu chi luu target_id roi join ra ten khi hien thi, thi khach
--    san doi ten se lam nhat ky cu hien ten moi - nhat ky kiem toan phai phan
--    anh dung trang thai LUC XAY RA hanh dong.
--
-- 2. target_id KHONG dat khoa ngoai: no tro toi bang khac nhau tuy theo
--    target_type (hotels hoac users). Doi lai, actor_id CO khoa ngoai voi
--    ON DELETE RESTRICT de khong the xoa tai khoan da tung thao tac roi lam
--    mat dau vet nguoi thuc hien.
--
-- Chay: psql -d <db> -f backend/database/migrations/add_admin_action_logs.sql
-- Rollback: backend/database/migrations/add_admin_action_logs_rollback.sql

BEGIN;

CREATE TABLE admin_action_logs (
    id           BIGSERIAL PRIMARY KEY,
    actor_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action       VARCHAR(50) NOT NULL,
    target_type  VARCHAR(20) NOT NULL,
    target_id    BIGINT NOT NULL,
    target_label VARCHAR(255),
    reason       TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nhat ky luon xem theo thu tu moi nhat truoc.
CREATE INDEX idx_admin_action_logs_created ON admin_action_logs(created_at DESC);

-- Loc nhanh "tat ca hanh dong tren 1 khach san / 1 tai khoan".
CREATE INDEX idx_admin_action_logs_target ON admin_action_logs(target_type, target_id);

COMMIT;
