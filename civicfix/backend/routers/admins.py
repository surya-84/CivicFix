import random
import string
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from routers.auth import hash_password, get_current_user, require_role

router = APIRouter()


def _is_super_admin(user: models.User) -> bool:
    if user.role != "admin":
        return False
    if user.admin_level == "SUPER_ADMIN":
        return True
    perms = [p.strip() for p in (user.permissions or "").split(",") if p.strip()]
    return "MANAGE_ADMINS" in perms or "ALL" in perms


def _generate_temp_password(length: int = 10) -> str:
    """
    Generates a secure, human-readable temporary password
    containing uppercase, lowercase, digits, and safe special characters.
    Example: K7#pL9@xQ2
    """
    uppers = string.ascii_uppercase
    lowers = string.ascii_lowercase
    digits = string.digits
    symbols = "!@#$%^&*"
    # Ensure at least one of each class
    pwd = [
        random.choice(uppers),
        random.choice(digits),
        random.choice(symbols),
        random.choice(lowers),
    ]
    all_chars = uppers + lowers + digits + symbols
    pwd += [random.choice(all_chars) for _ in range(length - 4)]
    random.shuffle(pwd)
    return "".join(pwd)


def _generate_admin_code(db: Session) -> str:
    """
    Generates a unique Admin ID formatted as ADM-XXXXXX (e.g. ADM-482193)
    """
    for _ in range(100):
        code = f"ADM-{random.randint(100000, 999999)}"
        exists = db.query(models.User).filter(models.User.admin_code == code).first()
        if not exists:
            return code
    return f"ADM-{random.randint(1000000, 9999999)}"


# ---------------------------------------------------------------------------
# POST /api/admin/admins — Create Co-Admin Account
# ---------------------------------------------------------------------------
@router.post("/admins")
def create_co_admin(
    payload:      schemas.AdminCreate,
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not _is_super_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only Super Administrators can create and manage administrators.",
        )

    # Clean mobile number
    phone = payload.phone.strip()
    if len(phone) < 10:
        raise HTTPException(400, "Valid 10-digit mobile number required")

    # Check if user already exists
    existing = db.query(models.User).filter(models.User.phone == phone).first()
    if existing and existing.role == "admin":
        raise HTTPException(400, f"An administrator account already exists for phone {phone} (ID: {existing.admin_code}).")

    # Password validation
    raw_password = (payload.password or "").strip()
    if len(raw_password) < 6:
        raise HTTPException(400, "Password is required and must be at least 6 characters long.")

    admin_code = _generate_admin_code(db)
    perms_str = ",".join(payload.permissions)

    if existing:
        # Elevate existing account to Co-Admin
        existing.role                 = "admin"
        existing.admin_code           = admin_code
        existing.admin_level          = payload.admin_level or "CO_ADMIN"
        existing.department_id        = payload.department_id
        existing.permissions          = perms_str
        existing.is_active            = True
        existing.must_change_password = True
        existing.password_hash        = hash_password(raw_password)
        existing.created_by_user_id   = current_user.id
        db_admin = existing
    else:
        db_admin = models.User(
            name                 = payload.name.strip(),
            phone                = phone,
            email                = payload.email.strip() if payload.email else None,
            role                 = "admin",
            admin_code           = admin_code,
            admin_level          = payload.admin_level or "CO_ADMIN",
            department_id        = payload.department_id,
            permissions          = perms_str,
            is_active            = True,
            must_change_password = True,
            password_hash        = hash_password(raw_password),
            created_by_user_id   = current_user.id,
        )
        db.add(db_admin)

    # Record in Audit Log (Without exposing plain password)
    audit = models.AdminAuditLog(
        admin_id    = current_user.id,
        admin_code  = current_user.admin_code or "SUPER_ADMIN",
        admin_name  = current_user.name,
        action      = "CREATE_CO_ADMIN",
        target_type = "ADMIN",
        target_id   = admin_code,
        details     = f"Created {payload.admin_level or 'CO_ADMIN'} account for {payload.name} ({admin_code}) with permissions: [{perms_str}]. Password set by Super Admin.",
    )
    db.add(audit)

    db.commit()
    db.refresh(db_admin)

    return {
        "message":              f"Administrator account {admin_code} created successfully.",
        "admin_code":           admin_code,
        "name":                 db_admin.name,
        "phone":                db_admin.phone,
        "email":                db_admin.email,
        "admin_level":          db_admin.admin_level,
        "permissions":          payload.permissions,
        "status_message":       "Password set successfully by Super Admin",
        "must_change_password": True,
    }


# ---------------------------------------------------------------------------
# GET /api/admin/workers — List eligible field workers for task assignment
# ---------------------------------------------------------------------------
@router.get("/workers", response_model=List[schemas.WorkerResponse])
def list_workers(
    complaint_id:  Optional[str] = None,
    department_id: Optional[int] = None,
    db:            Session       = Depends(get_db),
    current_user:  models.User   = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only administrators can view field workers for dispatch.",
        )

    perms = [p.strip() for p in (current_user.permissions or "").split(",") if p.strip()]
    is_super = current_user.admin_level == "SUPER_ADMIN" or "ALL" in perms or "MANAGE_ADMINS" in perms
    if not is_super and "ASSIGN_WORKERS" not in perms:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to dispatch field workers.",
        )

    q = db.query(models.Worker)

    # Department and Jurisdiction Scoping:
    # Co-Admin is strictly scoped to their assigned department
    if not is_super and current_user.department_id:
        q = q.filter(models.Worker.department_id == current_user.department_id)
    elif department_id:
        q = q.filter(models.Worker.department_id == department_id)

    # Active Worker Verification:
    # If the worker has a linked User account, ensure the account is active
    q = q.outerjoin(models.User, models.Worker.user_id == models.User.id).filter(
        (models.User.id == None) | (models.User.is_active == True)
    )

    workers = q.all()

    result = []
    for w in workers:
        dept_name = w.department.name if w.department else "General Administration"
        status_label = "Available" if w.is_available else "On Duty"
        code = w.worker_code or f"WRK-{w.id:05d}"
        result.append(
            schemas.WorkerResponse(
                id=w.id,
                worker_code=code,
                name=w.name,
                department_id=w.department_id,
                department_name=dept_name,
                ward_number=w.ward_number or "Ward 3",
                is_available=bool(w.is_available),
                status=status_label,
            )
        )

    return result


# ---------------------------------------------------------------------------
# GET /api/admin/admins — List All Administrators
# ---------------------------------------------------------------------------
@router.get("/admins")
def list_administrators(
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    admins = db.query(models.User).filter(models.User.role == "admin").order_by(models.User.created_at.asc()).all()

    result = []
    for a in admins:
        perms = [p.strip() for p in (a.permissions or "").split(",") if p.strip()]
        dept_name = a.department.name if a.department else None
        result.append({
            "id":                   a.id,
            "admin_code":           a.admin_code or f"ADM-{str(a.id).zfill(6)}",
            "name":                 a.name,
            "phone":                a.phone,
            "email":                a.email,
            "admin_level":          a.admin_level or "SUPER_ADMIN",
            "department_id":        a.department_id,
            "department_name":      dept_name,
            "is_active":            a.is_active if a.is_active is not None else True,
            "must_change_password": bool(a.must_change_password),
            "permissions":          perms,
            "created_at":           a.created_at,
        })
    return result


# ---------------------------------------------------------------------------
# GET /api/admin/admins/{admin_code} — Admin Details
# ---------------------------------------------------------------------------
@router.get("/admins/{admin_code}")
def get_administrator_details(
    admin_code:   str,
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    admin = db.query(models.User).filter(
        models.User.role == "admin",
        (models.User.admin_code == admin_code) | (models.User.id == int(admin_code) if admin_code.isdigit() else False)
    ).first()

    if not admin:
        raise HTTPException(404, "Administrator account not found")

    perms = [p.strip() for p in (admin.permissions or "").split(",") if p.strip()]
    return {
        "id":                   admin.id,
        "admin_code":           admin.admin_code or f"ADM-{str(admin.id).zfill(6)}",
        "name":                 admin.name,
        "phone":                admin.phone,
        "email":                admin.email,
        "admin_level":          admin.admin_level or "SUPER_ADMIN",
        "department_id":        admin.department_id,
        "department_name":      admin.department.name if admin.department else None,
        "is_active":            admin.is_active if admin.is_active is not None else True,
        "must_change_password": bool(admin.must_change_password),
        "permissions":          perms,
        "created_at":           admin.created_at,
    }


# ---------------------------------------------------------------------------
# PATCH /api/admin/admins/{admin_code}/permissions — Update Permissions
# ---------------------------------------------------------------------------
@router.patch("/admins/{admin_code}/permissions")
def update_admin_permissions(
    admin_code:   str,
    payload:      schemas.AdminUpdatePermissions,
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not _is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only Super Administrators can modify access permissions.")

    admin = db.query(models.User).filter(
        models.User.role == "admin",
        models.User.admin_code == admin_code
    ).first()

    if not admin:
        raise HTTPException(404, "Administrator account not found")

    old_perms = admin.permissions
    new_perms_str = ",".join(payload.permissions)
    admin.permissions = new_perms_str

    audit = models.AdminAuditLog(
        admin_id    = current_user.id,
        admin_code  = current_user.admin_code or "SUPER_ADMIN",
        admin_name  = current_user.name,
        action      = "UPDATE_PERMISSIONS",
        target_type = "ADMIN",
        target_id   = admin_code,
        details     = f"Updated permissions for {admin.name} ({admin_code}) from [{old_perms}] to [{new_perms_str}].",
    )
    db.add(audit)
    db.commit()

    return {
        "message":     f"Permissions updated for {admin_code}.",
        "admin_code":  admin_code,
        "permissions": payload.permissions,
    }


# ---------------------------------------------------------------------------
# PATCH /api/admin/admins/{admin_code}/status — Toggle Active/Disabled Status
# ---------------------------------------------------------------------------
@router.patch("/admins/{admin_code}/status")
def toggle_admin_status(
    admin_code:   str,
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not _is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only Super Administrators can disable or enable accounts.")

    admin = db.query(models.User).filter(
        models.User.role == "admin",
        models.User.admin_code == admin_code
    ).first()

    if not admin:
        raise HTTPException(404, "Administrator account not found")

    if admin.id == current_user.id:
        raise HTTPException(400, "Safety constraint: You cannot disable your own administrator account.")

    # Toggle status
    current_status = admin.is_active if admin.is_active is not None else True
    new_status = not current_status
    admin.is_active = new_status

    action_name = "ENABLE_ADMIN" if new_status else "DISABLE_ADMIN"
    audit = models.AdminAuditLog(
        admin_id    = current_user.id,
        admin_code  = current_user.admin_code or "SUPER_ADMIN",
        admin_name  = current_user.name,
        action      = action_name,
        target_type = "ADMIN",
        target_id   = admin_code,
        details     = f"{'Re-enabled' if new_status else 'Disabled'} administrator {admin.name} ({admin_code}).",
    )
    db.add(audit)
    db.commit()

    return {
        "message":    f"Administrator {admin_code} is now {'ACTIVE' if new_status else 'DISABLED'}.",
        "admin_code": admin_code,
        "is_active":  new_status,
    }


# ---------------------------------------------------------------------------
# GET /api/admin/audit-logs — Chronological Activity Audit Trail
# ---------------------------------------------------------------------------
@router.get("/audit-logs", response_model=List[schemas.AdminAuditLogResponse])
def get_admin_audit_logs(
    limit:        int         = 50,
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    return (
        db.query(models.AdminAuditLog)
        .order_by(models.AdminAuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )
