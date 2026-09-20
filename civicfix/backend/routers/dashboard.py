from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from database import get_db
import models

router = APIRouter()


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total       = db.query(models.Complaint).count()
    pending     = db.query(models.Complaint).filter(models.Complaint.status == "pending").count()
    in_progress = db.query(models.Complaint).filter(
        models.Complaint.status.in_(["assigned", "in_progress"])
    ).count()
    resolved    = db.query(models.Complaint).filter(models.Complaint.status == "resolved").count()
    reopened    = db.query(models.Complaint).filter(models.Complaint.status == "reopened").count()

    cutoff  = datetime.utcnow() - timedelta(hours=48)
    overdue = db.query(models.Complaint).filter(
        models.Complaint.status == "pending",
        models.Complaint.created_at <= cutoff,
    ).count()

    categories = db.query(
        models.Complaint.category,
        func.count(models.Complaint.id).label("count"),
    ).group_by(models.Complaint.category).all()

    severities = db.query(
        models.Complaint.severity,
        func.count(models.Complaint.id).label("count"),
    ).group_by(models.Complaint.severity).all()

    return {
        "total":       total,
        "pending":     pending,
        "in_progress": in_progress,
        "resolved":    resolved,
        "reopened":    reopened,
        "overdue":     overdue,
        "categories":  {cat: cnt for cat, cnt in categories},
        "severities":  {sev: cnt for sev, cnt in severities},
    }


@router.get("/map")
def get_map_data(db: Session = Depends(get_db)):
    complaints = db.query(models.Complaint).all()
    features   = []

    for c in complaints:
        features.append({
            "type": "Feature",
            "geometry": {
                "type":        "Point",
                "coordinates": [c.longitude, c.latitude],
            },
            "properties": {
                "id":            c.id,
                "category":      c.category,
                "status":        c.status,
                "severity":      c.severity,
                "priority_score":c.priority_score,
                "report_count":  c.report_count,
                "ward_number":   c.ward_number,
                "ai_label":      c.ai_label,
                "description":   c.description,
            },
        })

    return {"type": "FeatureCollection", "features": features}


@router.get("/priority-queue")
def priority_queue(db: Session = Depends(get_db)):
    return (
        db.query(models.Complaint)
        .filter(models.Complaint.status != "resolved")
        .order_by(models.Complaint.priority_score.desc())
        .limit(20)
        .all()
    )
