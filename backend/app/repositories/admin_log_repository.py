from sqlalchemy.orm import Session

from app.models.entities import AdminActionLog, User


# Ghi 1 dong nhat ky hanh dong quan tri.
#
# KHONG commit o day: ban ghi nhat ky phai nam trong CUNG giao dich voi hanh dong
# no mo ta. Neu tach ra, se co truong hop hanh dong that bai va bi rollback nhung
# nhat ky van con - hoac nguoc lai.
def create_admin_action_log_record(
    db: Session,
    *,
    actor_id: int,
    action: str,
    target_type: str,
    target_id: int,
    target_label: str | None,
    reason: str | None,
) -> AdminActionLog:
    log = AdminActionLog(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        target_label=target_label,
        reason=reason,
    )
    db.add(log)
    db.flush()
    return log


# Lay nhat ky kem nguoi thuc hien, moi nhat truoc, co phan trang va loc theo
# loai doi tuong.
def list_admin_action_log_records(
    db: Session,
    *,
    target_type: str | None,
    target_id: int | None = None,
    page: int,
    page_size: int,
) -> tuple[list[tuple[AdminActionLog, User]], int]:
    query = db.query(AdminActionLog, User).join(User, User.id == AdminActionLog.actor_id)
    if target_type:
        query = query.filter(AdminActionLog.target_type == target_type)
    if target_id is not None:
        query = query.filter(AdminActionLog.target_id == target_id)

    total = query.count()
    rows = (
        query.order_by(AdminActionLog.created_at.desc(), AdminActionLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return rows, total
