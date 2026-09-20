import math
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

import models

DUPLICATE_DISTANCE_METERS = 50
DUPLICATE_TIME_HOURS = 24


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return distance in metres between two GPS points."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi    = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def find_duplicate(
    db: Session,
    category: str,
    latitude: float,
    longitude: float,
) -> Optional[models.Complaint]:
    """
    Return an existing open complaint if:
      • same category
      • filed within the last DUPLICATE_TIME_HOURS
      • within DUPLICATE_DISTANCE_METERS of the new report
    Otherwise return None.
    """
    cutoff = datetime.utcnow() - timedelta(hours=DUPLICATE_TIME_HOURS)

    candidates = (
        db.query(models.Complaint)
        .filter(
            models.Complaint.category == category,
            models.Complaint.status != "resolved",
            models.Complaint.created_at >= cutoff,
        )
        .all()
    )

    for complaint in candidates:
        if complaint.latitude and complaint.longitude:
            dist = haversine(latitude, longitude, complaint.latitude, complaint.longitude)
            if dist <= DUPLICATE_DISTANCE_METERS:
                return complaint

    return None
