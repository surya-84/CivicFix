from datetime import datetime
import models

SEVERITY_WEIGHTS = {
    "CRITICAL": 100,
    "HIGH":      70,
    "MODERATE":  40,
    "LOW":       15,
}

CATEGORY_WEIGHTS = {
    "broken_water_pipe":    100,
    "water_leakage":         85,
    "waterlogging":          80,
    "drainage_blockage":     70,
    "garbage_accumulation":  50,
    "illegal_dumping":       45,
    "other":                 30,
}


def calculate_priority(complaint: models.Complaint) -> int:
    """
    Priority Score (0–100):
      Severity weight  × 0.30
      Category weight  × 0.20
      Report count     × 0.15   (capped at 10 reports)
      Time pending     × 0.20   (capped at 72 hours)
      Location risk    × 0.15   (fixed medium for prototype)
    """
    severity_score  = (SEVERITY_WEIGHTS.get(complaint.severity, 40) / 100) * 30
    category_score  = (CATEGORY_WEIGHTS.get(complaint.category, 30) / 100) * 20

    report_count    = complaint.report_count or 1
    report_score    = min(report_count / 10, 1.0) * 15

    if complaint.created_at:
        created = (
            complaint.created_at.replace(tzinfo=None)
            if complaint.created_at.tzinfo
            else complaint.created_at
        )
        hours_pending = (datetime.utcnow() - created).total_seconds() / 3600
        time_score    = min(hours_pending / 72, 1.0) * 20
    else:
        time_score = 10

    location_score = 15  # medium risk for prototype

    total = severity_score + category_score + report_score + time_score + location_score
    return min(int(total), 100)
