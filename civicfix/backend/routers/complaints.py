import os
import uuid
import shutil
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from routers.auth import get_current_user, get_current_user_optional
from services.ai_engine   import classify_image, verify_resolution
from services.duplicate   import find_duplicate
from services.priority    import calculate_priority
from services.gis_service import lookup_ward, get_department_for_category

router     = APIRouter()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _save_upload(upload: UploadFile, prefix: str = "") -> str:
    ext      = os.path.splitext(upload.filename)[1] if upload.filename else ".jpg"
    filename = f"{prefix}{uuid.uuid4()}{ext}"
    path     = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(upload.file, f)
    return path


def _get_worker_ids(db: Session, user_id: int) -> List[int]:
    """Returns all worker IDs matching this user (both Worker.id and user_id fallback)."""
    worker_records = db.query(models.Worker).filter(models.Worker.user_id == user_id).all()
    ids = [w.id for w in worker_records]
    ids.append(user_id)
    return ids


def _is_super_admin(user: Optional[models.User]) -> bool:
    if not user or user.role != "admin":
        return False
    if user.admin_level == "SUPER_ADMIN":
        return True
    perms = [p.strip() for p in (user.permissions or "").split(",") if p.strip()]
    return "MANAGE_ADMINS" in perms or "ALL" in perms


# ---------------------------------------------------------------------------
# GET /api/complaints/workers — List eligible field workers (mirrored from admin)
# ---------------------------------------------------------------------------
@router.get("/workers", response_model=List[schemas.WorkerResponse])
def get_complaint_workers(
    complaint_id:  Optional[str] = None,
    department_id: Optional[int] = None,
    db:            Session       = Depends(get_db),
    current_user:  models.User   = Depends(get_current_user),
):
    from routers.admins import list_workers
    return list_workers(complaint_id=complaint_id, department_id=department_id, db=db, current_user=current_user)



def _record_history(
    db: Session,
    complaint_id: str,
    status_value: str,
    user: Optional[models.User] = None,
    notes: Optional[str] = None,
):
    entry = models.StatusHistory(
        complaint_id       = complaint_id,
        status             = status_value,
        changed_by_user_id = user.id if user else None,
        changed_by_name    = user.name if user else "System AI",
        changed_by_role    = user.role if user else "system",
        notes              = notes,
        timestamp          = datetime.utcnow(),
    )
    db.add(entry)


# ---------------------------------------------------------------------------
# POST /api/complaints  — submit a new complaint
# ---------------------------------------------------------------------------
@router.post("/")
async def create_complaint(
    category:     str                  = Form(...),
    description:  Optional[str]        = Form(None),
    latitude:     float                = Form(...),
    longitude:    float                = Form(...),
    user_id:      Optional[int]        = Form(None),
    image:        Optional[UploadFile] = File(None),
    db:           Session              = Depends(get_db),
    current_user: Optional[models.User]= Depends(get_current_user_optional),
):
    # Determine submitting user id
    effective_user_id = current_user.id if current_user else (user_id or 1)

    # 1. Save image
    image_path = _save_upload(image) if image else None

    # 2. Duplicate check
    existing = find_duplicate(db, category, latitude, longitude)
    if existing:
        existing.report_count += 1
        existing.priority_score = calculate_priority(existing)
        _record_history(
            db,
            existing.id,
            existing.status,
            current_user,
            f"Duplicate report registered. Citizen count is now {existing.report_count}.",
        )
        db.commit()
        db.refresh(existing)
        return {
            "is_duplicate":  True,
            "complaint_id":  existing.id,
            "report_count":  existing.report_count,
            "message":       (
                f"This issue was already reported "
                f"({existing.report_count} reports now). "
                f"Priority updated to {existing.priority_score}/100."
            ),
            "complaint": schemas.ComplaintResponse.model_validate(existing),
        }

    # 3. AI classification
    ai = classify_image(category, description)

    # 4. GIS routing
    ward_info = lookup_ward(latitude, longitude)
    dept      = get_department_for_category(category, ward_info["ward_number"])

    # 5. Create complaint
    cid = f"CIV-{str(uuid.uuid4())[:5].upper()}"
    complaint = models.Complaint(
        id              = cid,
        user_id         = effective_user_id,
        category        = category,
        description     = description,
        latitude        = latitude,
        longitude       = longitude,
        image_path      = image_path,
        severity        = ai["severity"],
        ai_label        = ai["label"],
        ai_confidence   = ai["confidence"],
        ai_description  = ai["description"],
        ward_number     = ward_info["ward_number"],
        municipality    = ward_info["municipality"],
        department_name = dept,
        assigned_officer= ward_info["officer"],
        status          = "pending",
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # 6. Priority score (needs created_at, so compute after flush)
    complaint.priority_score     = calculate_priority(complaint)
    complaint.duplicate_group_id = cid

    # 7. Initial Status History record
    _record_history(
        db,
        cid,
        "pending",
        current_user,
        f"Complaint filed and classified as '{ai['label']}' with {ai['severity']} severity.",
    )

    db.commit()
    db.refresh(complaint)

    return {
        "is_duplicate": False,
        "complaint_id": cid,
        "ai_analysis":  ai,
        "ward_info":    ward_info,
        "department":   dept,
        "complaint":    schemas.ComplaintResponse.model_validate(complaint),
    }


# ---------------------------------------------------------------------------
# GET /api/complaints/my — get current user's authorized complaints
# ---------------------------------------------------------------------------
@router.get("/my", response_model=List[schemas.ComplaintResponse])
def get_my_complaints(
    status:       Optional[str] = None,
    category:     Optional[str] = None,
    db:           Session       = Depends(get_db),
    current_user: models.User   = Depends(get_current_user),
):
    """
    Returns only authorized complaints for the current authenticated user:
    - Citizen: ONLY their own complaints (user_id == current_user.id)
    - Worker: ONLY complaints assigned to them (worker_id in worker_ids)
    - Admin: All complaints or scoped to department for Co-Admin
    """
    q = db.query(models.Complaint)

    if current_user.role == "citizen":
        q = q.filter(models.Complaint.user_id == current_user.id)
    elif current_user.role == "worker":
        worker_ids = _get_worker_ids(db, current_user.id)
        q = q.filter(models.Complaint.worker_id.in_(worker_ids))
    elif current_user.role == "admin":
        is_super = _is_super_admin(current_user)
        if not is_super and current_user.department_id:
            q = q.filter(models.Complaint.department_id == current_user.department_id)

    if status:
        q = q.filter(models.Complaint.status == status)
    if category:
        q = q.filter(models.Complaint.category == category)

    return q.order_by(models.Complaint.priority_score.desc(), models.Complaint.created_at.desc()).all()


# ---------------------------------------------------------------------------
# GET /api/complaints/public-feed — anonymized civic feed for home/nearby
# ---------------------------------------------------------------------------
@router.get("/public-feed")
def get_public_feed(
    limit: int = 10,
    db:    Session = Depends(get_db),
):
    """
    Returns a public, privacy-safe list of nearby civic issues.
    Does NOT leak user identity, phone numbers, or private user IDs.
    """
    complaints = (
        db.query(models.Complaint)
        .order_by(models.Complaint.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id":             c.id,
            "category":       c.category,
            "ai_label":       c.ai_label,
            "severity":       c.severity,
            "status":         c.status,
            "priority_score": c.priority_score,
            "ward_number":    c.ward_number,
            "municipality":   c.municipality,
            "report_count":   c.report_count,
            "created_at":     c.created_at,
            "latitude":       c.latitude,
            "longitude":      c.longitude,
        }
        for c in complaints
    ]


# ---------------------------------------------------------------------------
# GET /api/complaints  — list with strict role-based privacy enforcement
# ---------------------------------------------------------------------------
@router.get("/", response_model=List[schemas.ComplaintResponse])
def list_complaints(
    status:       Optional[str]        = None,
    category:     Optional[str]        = None,
    user_id:      Optional[int]        = None,
    skip:         int                  = 0,
    limit:        int                  = 100,
    db:           Session              = Depends(get_db),
    current_user: Optional[models.User]= Depends(get_current_user_optional),
):
    """
    Role-based filtering enforced at DB level:
    - Citizen: FORCED to only their own complaints (user_id == current_user.id)
    - Worker: FORCED to only complaints assigned to them
    - Admin: Can filter by any parameter or view all
    - Unauthenticated: Defaults to public feed or requires login
    """
    if not current_user:
        # Fallback for unauthenticated requests: public safe list
        return get_public_feed(limit=limit, db=db)

    q = db.query(models.Complaint)

    if current_user.role == "citizen":
        # Strictly enforce: Citizen CANNOT see any other user's complaints
        q = q.filter(models.Complaint.user_id == current_user.id)
    elif current_user.role == "worker":
        # Strictly enforce: Worker sees only assigned complaints
        worker_ids = _get_worker_ids(db, current_user.id)
        q = q.filter(models.Complaint.worker_id.in_(worker_ids))
    elif current_user.role == "admin":
        is_super = _is_super_admin(current_user)
        if not is_super and current_user.department_id:
            q = q.filter(models.Complaint.department_id == current_user.department_id)
        if user_id:
            q = q.filter(models.Complaint.user_id == user_id)

    if status:
        q = q.filter(models.Complaint.status == status)
    if category:
        q = q.filter(models.Complaint.category == category)

    return q.order_by(models.Complaint.priority_score.desc()).offset(skip).limit(limit).all()


# ---------------------------------------------------------------------------
# GET /api/complaints/{id} — get single complaint with ownership check
# ---------------------------------------------------------------------------
@router.get("/{complaint_id}", response_model=schemas.ComplaintResponse)
def get_complaint(
    complaint_id: str,
    db:           Session              = Depends(get_db),
    current_user: Optional[models.User]= Depends(get_current_user_optional),
):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to view complaint details.",
        )

    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Enforce ownership/assignment rules:
    if current_user.role == "citizen":
        if c.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Complaint not found")
    elif current_user.role == "worker":
        worker_ids = _get_worker_ids(db, current_user.id)
        if not c.worker_id or c.worker_id not in worker_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Complaint not found",
            )
    elif current_user.role == "admin":
        is_super = _is_super_admin(current_user)
        if not is_super and current_user.department_id:
            if c.department_id and c.department_id != current_user.department_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Complaint belongs to a different municipal department.",
                )

    return c


# ---------------------------------------------------------------------------
# GET /api/complaints/{id}/history — get complaint status audit history
# ---------------------------------------------------------------------------
@router.get("/{complaint_id}/history", response_model=List[schemas.StatusHistoryResponse])
def get_complaint_history(
    complaint_id: str,
    db:           Session              = Depends(get_db),
    current_user: models.User          = Depends(get_current_user),
):
    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Ownership check
    if current_user.role == "citizen" and c.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Complaint not found")
    elif current_user.role == "worker":
        worker_ids = _get_worker_ids(db, current_user.id)
        if not c.worker_id or c.worker_id not in worker_ids:
            raise HTTPException(status_code=404, detail="Complaint not found")
    elif current_user.role == "admin":
        is_super = _is_super_admin(current_user)
        if not is_super and current_user.department_id:
            if c.department_id and c.department_id != current_user.department_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Complaint belongs to a different municipal department.",
                )

    history = (
        db.query(models.StatusHistory)
        .filter(models.StatusHistory.complaint_id == complaint_id)
        .order_by(models.StatusHistory.timestamp.asc())
        .all()
    )
    return history


# ---------------------------------------------------------------------------
# POST /api/complaints/{id}/assign — assign field worker to complaint
# ---------------------------------------------------------------------------
@router.post("/{complaint_id}/assign", response_model=schemas.ComplaintResponse)
def assign_complaint_worker(
    complaint_id: str,
    payload:      schemas.ComplaintAssignRequest,
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only administrators can dispatch field workers.",
        )

    perms = [p.strip() for p in (current_user.permissions or "").split(",") if p.strip()]
    is_super = _is_super_admin(current_user)
    if not is_super and "ASSIGN_WORKERS" not in perms:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to dispatch field workers.",
        )

    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Department scoping for Co-Admin on complaint
    if not is_super and current_user.department_id:
        if c.department_id and c.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only assign workers to complaints within your department.",
            )

    worker = db.query(models.Worker).filter(models.Worker.id == payload.worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Field worker not found")

    # Department scoping for Co-Admin on worker
    if not is_super and current_user.department_id:
        if worker.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot assign a worker outside your department.",
            )

    # Verify worker active account
    if worker.user_id:
        w_user = db.query(models.User).filter(models.User.id == worker.user_id).first()
        if w_user and not w_user.is_active:
            raise HTTPException(
                status_code=400,
                detail="Worker account is inactive and cannot be assigned tasks.",
            )

    c.worker_id = worker.id
    c.status = "assigned"
    c.assigned_officer = current_user.name
    if not c.department_id and worker.department_id:
        c.department_id = worker.department_id
        if worker.department:
            c.department_name = worker.department.name

    notes = payload.notes or f"Assigned to field worker {worker.name} ({worker.worker_code or 'ID: '+str(worker.id)}) by {current_user.name}."
    _record_history(db, complaint_id, "assigned", current_user, notes)

    audit = models.AdminAuditLog(
        admin_id    = current_user.id,
        admin_code  = current_user.admin_code or "ADMIN",
        admin_name  = current_user.name,
        action      = "ASSIGN_WORKER",
        target_type = "COMPLAINT",
        target_id   = complaint_id,
        details     = f"Assigned complaint {complaint_id} to worker {worker.name} ({worker.worker_code or 'ID:'+str(worker.id)}).",
    )
    db.add(audit)

    db.commit()
    db.refresh(c)
    return c


# ---------------------------------------------------------------------------
# PATCH /api/complaints/{id}/status — update status (Worker or Admin only)
# ---------------------------------------------------------------------------
@router.patch("/{complaint_id}/status", response_model=schemas.ComplaintResponse)
def update_status(
    complaint_id: str,
    update:       schemas.ComplaintUpdate,
    db:           Session              = Depends(get_db),
    current_user: Optional[models.User]= Depends(get_current_user_optional),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    is_super = _is_super_admin(current_user)

    # Role check
    if current_user.role == "citizen":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Citizens are not authorized to update complaint status.",
        )
    elif current_user.role == "worker":
        worker_ids = _get_worker_ids(db, current_user.id)
        if not c.worker_id or c.worker_id not in worker_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update complaints assigned to you.",
            )
        if update.worker_id is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Workers cannot assign or reassign complaints.",
            )
    elif current_user.role == "admin":
        if not is_super and current_user.department_id:
            if c.department_id and c.department_id != current_user.department_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You can only update complaints within your department.",
                )

        if update.worker_id is not None:
            perms = [p.strip() for p in (current_user.permissions or "").split(",") if p.strip()]
            if not is_super and "ASSIGN_WORKERS" not in perms:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have permission to assign field workers.",
                )
            worker = db.query(models.Worker).filter(models.Worker.id == update.worker_id).first()
            if not worker:
                raise HTTPException(status_code=404, detail="Field worker not found")
            if not is_super and current_user.department_id:
                if worker.department_id != current_user.department_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: Cannot assign a worker from another department.",
                    )
            c.worker_id = worker.id
            c.assigned_officer = current_user.name
            if not c.department_id and worker.department_id:
                c.department_id = worker.department_id
                if worker.department:
                    c.department_name = worker.department.name

    old_status = c.status
    if update.status:
        c.status = update.status
    if update.severity:
        c.severity       = update.severity
        c.priority_score = calculate_priority(c)

    notes = update.notes or f"Status changed from '{old_status}' to '{c.status}'."
    _record_history(db, complaint_id, c.status, current_user, notes)

    db.commit()
    db.refresh(c)
    return c


# ---------------------------------------------------------------------------
# POST /api/complaints/{id}/resolve — upload after-photo + AI verification
# ---------------------------------------------------------------------------
@router.post("/{complaint_id}/resolve")
async def resolve_complaint(
    complaint_id: str,
    notes:        Optional[str]        = Form(None),
    after_image:  Optional[UploadFile] = File(None),
    db:           Session              = Depends(get_db),
    current_user: Optional[models.User]= Depends(get_current_user_optional),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if current_user.role == "citizen":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Citizens cannot mark complaints as resolved. Field workers or municipal admins must verify.",
        )
    elif current_user.role == "worker":
        worker_ids = _get_worker_ids(db, current_user.id)
        if not c.worker_id or c.worker_id not in worker_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only resolve complaints assigned to you.",
            )
    elif current_user.role == "admin":
        is_super = _is_super_admin(current_user)
        if not is_super and current_user.department_id:
            if c.department_id and c.department_id != current_user.department_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You can only resolve complaints within your department.",
                )

    after_path   = _save_upload(after_image, prefix="after_") if after_image else None
    verification = verify_resolution(c.category, notes)

    existing_res = db.query(models.Resolution).filter(
        models.Resolution.complaint_id == complaint_id
    ).first()

    worker_id = current_user.id if current_user and current_user.role == "worker" else c.worker_id

    if existing_res:
        existing_res.after_image_path      = after_path
        existing_res.ai_verification_score = verification["score"]
        existing_res.ai_verification_notes = verification["notes"]
        existing_res.notes                 = notes
        existing_res.worker_id             = worker_id
    else:
        db.add(models.Resolution(
            complaint_id          = complaint_id,
            worker_id             = worker_id,
            after_image_path      = after_path,
            ai_verification_score = verification["score"],
            ai_verification_notes = verification["notes"],
            notes                 = notes,
        ))

    c.status      = "resolved"
    c.resolved_at = datetime.utcnow()

    # Record history
    _record_history(
        db,
        complaint_id,
        "resolved",
        current_user,
        f"Work completed. AI verification score: {int(verification['score']*100)}%.",
    )

    db.commit()

    return {
        "message":      "Complaint resolved successfully",
        "verification": verification,
        "complaint_id": complaint_id,
        "status":       "resolved",
    }


# ---------------------------------------------------------------------------
# POST /api/complaints/{id}/feedback — citizen thumbs up/down
# ---------------------------------------------------------------------------
@router.post("/{complaint_id}/feedback")
def submit_feedback(
    complaint_id: str,
    feedback:     schemas.FeedbackCreate,
    db:           Session              = Depends(get_db),
    current_user: Optional[models.User]= Depends(get_current_user_optional),
):
    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # If logged in as citizen, only allow feedback on their own complaint
    if current_user and current_user.role == "citizen" and c.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only provide feedback on your own complaints.",
        )

    res = db.query(models.Resolution).filter(
        models.Resolution.complaint_id == complaint_id
    ).first()
    if res:
        res.citizen_rating = feedback.rating
        if feedback.rating == 0:
            c.status             = "reopened"
            res.citizen_reopened = True
            _record_history(
                db,
                complaint_id,
                "reopened",
                current_user,
                feedback.comment or "Citizen reported issue not properly resolved. Reopened for reinspection.",
            )
        else:
            _record_history(
                db,
                complaint_id,
                "resolved",
                current_user,
                "Citizen verified and confirmed satisfactory resolution.",
            )

    db.commit()
    return {"message": "Feedback submitted", "status": c.status}

