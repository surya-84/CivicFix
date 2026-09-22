import random
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from routers.auth import hash_password, require_role, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /api/volunteers/register — Submit Volunteer Application
# ---------------------------------------------------------------------------
@router.post("/register")
def register_volunteer(
    app_data: schemas.VolunteerApplicationCreate,
    db:       Session = Depends(get_db),
):
    # Check if phone is already registered as an active User
    existing_user = db.query(models.User).filter(models.User.phone == app_data.phone).first()
    if existing_user and existing_user.role == "worker":
        raise HTTPException(
            status_code=400,
            detail="A worker account is already active with this phone number. Please log in directly.",
        )

    # Check if a pending application already exists
    existing_app = db.query(models.VolunteerApplication).filter(
        models.VolunteerApplication.phone == app_data.phone,
        models.VolunteerApplication.status == "pending",
    ).first()
    if existing_app:
        raise HTTPException(
            status_code=400,
            detail=f"An application ({existing_app.application_id}) is already pending review for this phone number.",
        )

    # Generate unique application ID
    app_id = f"VOL-{random.randint(1000, 9999)}"

    vol = models.VolunteerApplication(
        application_id = app_id,
        name           = app_data.name,
        phone          = app_data.phone,
        email          = app_data.email,
        dob            = app_data.dob,
        city           = app_data.city or "Kakinada",
        ward           = app_data.ward,
        address        = app_data.address,
        department     = app_data.department,
        skills         = app_data.skills,
        availability   = app_data.availability,
        reason         = app_data.reason,
        password_hash  = hash_password(app_data.password),
        status         = "pending",
        created_at     = datetime.utcnow(),
    )
    db.add(vol)
    db.commit()
    db.refresh(vol)

    return {
        "message":        "Volunteer application submitted successfully. Awaiting KMC municipal administrator approval.",
        "application_id": app_id,
        "name":           vol.name,
        "status":         vol.status,
    }


# ---------------------------------------------------------------------------
# GET /api/volunteers/status — Check Application Status
# ---------------------------------------------------------------------------
@router.get("/status")
def check_volunteer_status(
    phone:          Optional[str] = None,
    application_id: Optional[str] = None,
    db:             Session       = Depends(get_db),
):
    if not phone and not application_id:
        raise HTTPException(400, "Provide either phone or application_id")

    q = db.query(models.VolunteerApplication)
    if application_id:
        q = q.filter(models.VolunteerApplication.application_id == application_id)
    elif phone:
        q = q.filter(models.VolunteerApplication.phone == phone)

    vol = q.order_by(models.VolunteerApplication.created_at.desc()).first()
    if not vol:
        raise HTTPException(404, "No application found matching criteria")

    return {
        "application_id":      vol.application_id,
        "name":                vol.name,
        "department":          vol.department,
        "ward":                vol.ward,
        "status":              vol.status,
        "worker_id_generated": vol.worker_id_generated,
        "admin_notes":          vol.admin_notes,
        "created_at":           vol.created_at,
    }


# ---------------------------------------------------------------------------
# GET /api/admin/volunteers — Admin List of Applications
# ---------------------------------------------------------------------------
@router.get("/admin/list", response_model=List[schemas.VolunteerApplicationResponse])
def list_volunteer_applications(
    status:       Optional[str] = None,
    db:           Session       = Depends(get_db),
    current_user: models.User   = Depends(require_role("admin")),
):
    q = db.query(models.VolunteerApplication)
    if status:
        q = q.filter(models.VolunteerApplication.status == status)
    return q.order_by(models.VolunteerApplication.created_at.desc()).all()


# ---------------------------------------------------------------------------
# GET /api/admin/volunteers/{id} — Single Application Details
# ---------------------------------------------------------------------------
@router.get("/admin/{application_id}", response_model=schemas.VolunteerApplicationResponse)
def get_volunteer_application(
    application_id: str,
    db:             Session     = Depends(get_db),
    current_user:   models.User = Depends(require_role("admin")),
):
    vol = db.query(models.VolunteerApplication).filter(
        models.VolunteerApplication.application_id == application_id
    ).first()
    if not vol:
        raise HTTPException(404, "Volunteer application not found")
    return vol


# ---------------------------------------------------------------------------
# PATCH /api/admin/volunteers/{id}/approve — Approve Application & Create Worker
# ---------------------------------------------------------------------------
@router.patch("/admin/{application_id}/approve")
def approve_volunteer(
    application_id: str,
    action:         schemas.VolunteerActionRequest,
    db:             Session     = Depends(get_db),
    current_user:   models.User = Depends(require_role("admin")),
):
    perms = [p.strip() for p in (current_user.permissions or "").split(",") if p.strip()]
    is_super = current_user.admin_level == "SUPER_ADMIN" or "ALL" in perms or "MANAGE_ADMINS" in perms
    if not is_super and "MANAGE_VOLUNTEERS" not in perms:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to review or approve volunteer applications.",
        )

    vol = db.query(models.VolunteerApplication).filter(
        models.VolunteerApplication.application_id == application_id
    ).first()
    if not vol:
        raise HTTPException(404, "Volunteer application not found")

    if vol.status == "approved":
        return {
            "message": "Application is already approved",
            "worker_id": vol.worker_id_generated,
            "status": "approved",
        }

    # 1. Generate unique Worker ID (e.g. WRK-10482)
    worker_code = f"WRK-{random.randint(10000, 99999)}"

    # 2. Find matching municipal Department
    dept = None
    if action.department_id:
        dept = db.query(models.Department).filter(models.Department.id == action.department_id).first()
    if not dept:
        # Match by department name keyword
        dept = db.query(models.Department).filter(
            models.Department.name.ilike(f"%{vol.department}%")
        ).first()
    if not dept:
        dept = db.query(models.Department).first()

    dept_id = dept.id if dept else 1

    # 3. Check if user account already exists (e.g. was a citizen before)
    user = db.query(models.User).filter(models.User.phone == vol.phone).first()
    if user:
        user.role = "worker"
        user.worker_code = worker_code
        user.is_active = True
        user.department_id = dept_id
    else:
        user = models.User(
            name          = vol.name,
            phone         = vol.phone,
            email         = vol.email,
            role          = "worker",
            worker_code   = worker_code,
            is_active     = True,
            department_id = dept_id,
            password_hash = vol.password_hash,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 4. Create or update Worker entity
    existing_worker = db.query(models.Worker).filter(
        (models.Worker.user_id == user.id) | (models.Worker.worker_code == worker_code)
    ).first()

    if existing_worker:
        existing_worker.worker_code   = worker_code
        existing_worker.name          = vol.name
        existing_worker.department_id = dept_id
        existing_worker.ward_number   = action.ward_number or vol.ward or "3"
        existing_worker.user_id       = user.id
        existing_worker.is_available  = True
    else:
        new_worker = models.Worker(
            worker_code   = worker_code,
            name          = vol.name,
            department_id = dept_id,
            ward_number   = action.ward_number or vol.ward or "3",
            user_id       = user.id,
            is_available  = True,
        )
        db.add(new_worker)

    # 5. Update Application record
    vol.status              = "approved"
    vol.worker_id_generated = worker_code
    vol.admin_notes         = action.admin_notes or f"Approved by {current_user.name}. Assigned to {dept.name if dept else 'Municipal Team'}."
    vol.reviewed_at         = datetime.utcnow()

    # 6. Record in Admin Audit Log
    audit = models.AdminAuditLog(
        admin_id    = current_user.id,
        admin_code  = current_user.admin_code or "ADMIN",
        admin_name  = current_user.name,
        action      = "APPROVE_VOLUNTEER",
        target_type = "VOLUNTEER",
        target_id   = vol.application_id,
        details     = f"Approved volunteer {vol.name} ({vol.application_id}). Issued Worker ID {worker_code} for department {dept.name if dept else 'Municipal Team'}.",
    )
    db.add(audit)

    db.commit()
    db.refresh(vol)

    return {
        "message":              f"Volunteer {vol.name} approved successfully! Worker Account activated.",
        "application_id":       vol.application_id,
        "worker_id":            worker_code,
        "department":           dept.name if dept else vol.department,
        "status":               "approved",
    }


# ---------------------------------------------------------------------------
# PATCH /api/admin/volunteers/{id}/reject — Reject Application
# ---------------------------------------------------------------------------
@router.patch("/admin/{application_id}/reject")
def reject_volunteer(
    application_id: str,
    action:         schemas.VolunteerActionRequest,
    db:             Session     = Depends(get_db),
    current_user:   models.User = Depends(require_role("admin")),
):
    vol = db.query(models.VolunteerApplication).filter(
        models.VolunteerApplication.application_id == application_id
    ).first()
    if not vol:
        raise HTTPException(404, "Volunteer application not found")

    vol.status      = "rejected"
    vol.admin_notes = action.admin_notes or "Application does not meet current departmental requirements."
    vol.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(vol)

    return {
        "message":        f"Volunteer application {vol.application_id} rejected.",
        "application_id": vol.application_id,
        "status":         "rejected",
        "admin_notes":    vol.admin_notes,
    }