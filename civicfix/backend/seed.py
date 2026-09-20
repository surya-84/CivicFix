"""
seed.py — populate the database with demo data for the hackathon demo.
Run once: python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, engine
import models
from routers.auth import hash_password
from services.priority import calculate_priority
import uuid, random
from datetime import datetime, timedelta

models.Base.metadata.drop_all(bind=engine)
models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ------------------------------------------------------------------
# Clear existing data
# ------------------------------------------------------------------
db.query(models.AdminAuditLog).delete()
db.query(models.VolunteerApplication).delete()
db.query(models.StatusHistory).delete()
db.query(models.Resolution).delete()
db.query(models.Complaint).delete()
db.query(models.Worker).delete()
db.query(models.Department).delete()
db.query(models.User).delete()
db.commit()

# ------------------------------------------------------------------
# Departments
# ------------------------------------------------------------------
depts = [
    models.Department(name="Sanitation Dept – KMC", ward_number="3", service_type="sanitation"),
    models.Department(name="Water Works Dept – KMC", ward_number="3", service_type="water"),
    models.Department(name="Drainage Dept – KMC",   ward_number="3", service_type="drainage"),
]
db.add_all(depts)
db.commit()

# ------------------------------------------------------------------
# Users
# ------------------------------------------------------------------
citizen1 = models.User(name="Ravi Kumar",   phone="9000000001", role="citizen", password_hash=hash_password("citizen123"))
citizen2 = models.User(name="Priya Sharma", phone="9000000004", role="citizen", password_hash=hash_password("citizen123"))
worker   = models.User(name="Field Worker", phone="9000000002", role="worker",  worker_code="WRK-10482", password_hash=hash_password("worker123"))
super_admin = models.User(
    name                 = "KMC Commissioner (Super Admin)",
    phone                = "9000000003",
    role                 = "admin",
    admin_code           = "ADM-000001",
    admin_level          = "SUPER_ADMIN",
    is_active            = True,
    must_change_password = False,
    permissions          = "ALL,VIEW_COMPLAINTS,MANAGE_COMPLAINTS,ASSIGN_WORKERS,MANAGE_VOLUNTEERS,VIEW_ANALYTICS,MANAGE_ADMINS,DELETE_COMPLAINTS",
    password_hash        = hash_password("admin123"),
)
db.add_all([citizen1, citizen2, worker, super_admin])
db.commit()

# Co-Admin (assigned to Water Works Dept, must change password on first login)
co_admin = models.User(
    name                 = "Ravi Kumar (Co-Admin)",
    phone                = "9000000008",
    role                 = "admin",
    admin_code           = "ADM-104820",
    admin_level          = "CO_ADMIN",
    department_id        = depts[1].id,
    is_active            = True,
    must_change_password = True,
    permissions          = "VIEW_COMPLAINTS,MANAGE_COMPLAINTS,ASSIGN_WORKERS,MANAGE_VOLUNTEERS,VIEW_ANALYTICS",
    password_hash        = hash_password("coadmin123"),
    created_by_user_id   = super_admin.id,
)
db.add(co_admin)
db.commit()

# Backward compatibility alias
admin = super_admin

# ------------------------------------------------------------------
# Workers
# ------------------------------------------------------------------
w1 = models.Worker(name="Suresh Naidu",   department_id=depts[0].id, is_available=True, user_id=worker.id)
w2 = models.Worker(name="Lakshmi Prasad", department_id=depts[1].id, is_available=True)
db.add_all([w1, w2])
db.commit()

# ------------------------------------------------------------------
# Sample complaints
# ------------------------------------------------------------------
SAMPLES = [
    # Citizen 1 (Ravi Kumar) complaints:
    dict(category="garbage_accumulation", description="Large garbage pile near school", latitude=16.9891, longitude=82.2475, severity="HIGH",     status="pending", user=citizen1, worker_id=None),
    dict(category="water_leakage",        description="Water leaking from pipeline",    latitude=16.9700, longitude=82.2400, severity="CRITICAL",  status="in_progress", user=citizen1, worker_id=w1.id),
    dict(category="drainage_blockage",    description="Drain blocked near market",      latitude=16.9820, longitude=82.2510, severity="MODERATE",  status="assigned", user=citizen1, worker_id=w1.id),
    dict(category="waterlogging",         description="Road flooded after rain",         latitude=16.9650, longitude=82.2350, severity="HIGH",      status="resolved", user=citizen1, worker_id=w1.id),
    dict(category="illegal_dumping",      description="Construction waste dumped",       latitude=16.9950, longitude=82.2600, severity="MODERATE",  status="pending", user=citizen1, worker_id=None),

    # Citizen 2 (Priya Sharma) complaints (Ravi must NOT see these!):
    dict(category="broken_water_pipe",    description="Main pipe burst on NH-16",       latitude=16.9780, longitude=82.2480, severity="CRITICAL",  status="in_progress", user=citizen2, worker_id=w1.id),
    dict(category="garbage_accumulation", description="Overflowing dustbin on main road",latitude=16.9830, longitude=82.2430, severity="MODERATE", status="resolved", user=citizen2, worker_id=w2.id),
    dict(category="water_leakage",        description="Minor leak near park",           latitude=16.9870, longitude=82.2510, severity="LOW",       status="resolved", user=citizen2, worker_id=w1.id),
    dict(category="drainage_blockage",    description="Sewer overflow near bus stand",  latitude=16.9760, longitude=82.2460, severity="HIGH",      status="pending", user=citizen2, worker_id=None),
    dict(category="other",                description="Broken street light",            latitude=16.9900, longitude=82.2500, severity="LOW",       status="pending", user=citizen2, worker_id=None),
]

LABELS = {
    "garbage_accumulation": "Garbage Accumulation",
    "water_leakage":        "Water Pipeline Leak",
    "drainage_blockage":    "Drainage Blockage",
    "waterlogging":         "Waterlogging / Flooding",
    "illegal_dumping":      "Illegal Waste Dumping",
    "broken_water_pipe":    "Broken Water Pipe",
    "other":                "Civic Issue",
}

WARDS = ["2", "3", "3", "2", "4", "3", "3", "2", "3", "3"]

for i, s in enumerate(SAMPLES):
    cid = f"CIV-{str(uuid.uuid4())[:5].upper()}"
    created_time = datetime.utcnow() - timedelta(hours=random.randint(4, 72))
    c = models.Complaint(
        id               = cid,
        user_id          = s["user"].id,
        category         = s["category"],
        description      = s["description"],
        latitude         = s["latitude"],
        longitude        = s["longitude"],
        severity         = s["severity"],
        status           = s["status"],
        worker_id        = s["worker_id"],
        ai_label         = LABELS[s["category"]],
        ai_confidence    = round(random.uniform(0.85, 0.97), 2),
        ai_description   = s["description"],
        ward_number      = WARDS[i],
        municipality     = "Kakinada Municipal Corporation",
        department_name  = "Sanitation Dept – KMC" if "garbage" in s["category"] else "Water Works Dept – KMC",
        assigned_officer = "Sri. M. Suresh Kumar",
        duplicate_group_id = cid,
        report_count     = random.randint(1, 4),
        created_at       = created_time,
    )
    db.add(c)
    db.flush()
    c.priority_score = calculate_priority(c)

    # Add initial status history
    db.add(models.StatusHistory(
        complaint_id       = cid,
        status             = "pending",
        changed_by_user_id = s["user"].id,
        changed_by_name    = s["user"].name,
        changed_by_role    = "citizen",
        notes              = f"Complaint registered via CivicFix app for {s['category'].replace('_', ' ')}.",
        timestamp          = created_time,
    ))

    if s["status"] in ["assigned", "in_progress", "resolved"]:
        db.add(models.StatusHistory(
            complaint_id       = cid,
            status             = "assigned",
            changed_by_user_id = admin.id,
            changed_by_name    = admin.name,
            changed_by_role    = "admin",
            notes              = f"Assigned to field worker Suresh Naidu (Sanitation/Water Team).",
            timestamp          = created_time + timedelta(minutes=25),
        ))

    if s["status"] in ["in_progress", "resolved"]:
        db.add(models.StatusHistory(
            complaint_id       = cid,
            status             = "in_progress",
            changed_by_user_id = worker.id,
            changed_by_name    = worker.name,
            changed_by_role    = "worker",
            notes              = "Worker arrived at location and commenced repair/clearance operations.",
            timestamp          = created_time + timedelta(hours=1, minutes=10),
        ))

    if s["status"] == "resolved":
        resolved_time = created_time + timedelta(hours=3)
        c.resolved_at = resolved_time
        db.add(models.Resolution(
            complaint_id          = cid,
            worker_id             = s["worker_id"],
            ai_verification_score = round(random.uniform(0.91, 0.98), 2),
            ai_verification_notes = "Issue verified resolved via before/after image validation.",
            citizen_rating        = 1,
            resolution_date       = resolved_time,
            notes                 = "Site cleaned and verified with municipal supervisor.",
        ))
        db.add(models.StatusHistory(
            complaint_id       = cid,
            status             = "resolved",
            changed_by_user_id = worker.id,
            changed_by_name    = worker.name,
            changed_by_role    = "worker",
            notes              = "Resolution confirmed. Uploaded verification photo approved.",
            timestamp          = resolved_time,
        ))

# ------------------------------------------------------------------
# Sample Volunteer Applications
# ------------------------------------------------------------------
vol1 = models.VolunteerApplication(
    application_id = "VOL-1012",
    name           = "Ravi Teja",
    phone          = "9000000005",
    email          = "raviteja@gmail.com",
    dob            = "1998-04-12",
    city           = "Kakinada",
    ward           = "12",
    address        = "4-12, Temple Street, Ward 12, Kakinada",
    department     = "Sanitation",
    skills         = "Waste Segregation, Community Mobilization",
    availability   = "Morning",
    reason         = "Want to help eliminate open garbage dumps in Ward 12 and encourage neighborhood recycling.",
    password_hash  = hash_password("volunteer123"),
    status         = "pending",
    created_at     = datetime.utcnow() - timedelta(days=1),
)

vol2 = models.VolunteerApplication(
    application_id = "VOL-1013",
    name           = "Ananya Reddy",
    phone          = "9000000006",
    email          = "ananya.reddy@gmail.com",
    dob            = "2001-08-25",
    city           = "Kakinada",
    ward           = "08",
    address        = "Near Old Bus Stand, Ward 8, Kakinada",
    department     = "Roads",
    skills         = "Civil Engineering Student, Pothole Surveying",
    availability   = "Afternoon",
    reason         = "Passionate about pedestrian road safety and quick reporting of dangerous potholes.",
    password_hash  = hash_password("volunteer123"),
    status         = "pending",
    created_at     = datetime.utcnow() - timedelta(hours=18),
)

vol3 = models.VolunteerApplication(
    application_id      = "VOL-1014",
    name                = "Kiran Varma",
    phone               = "9000000007",
    email               = "kiran.v@gmail.com",
    dob                 = "1995-11-03",
    city                = "Kakinada",
    ward                = "03",
    address             = "Port Road, Ward 3, Kakinada",
    department          = "Water Supply",
    skills              = "Plumbing Basics, Pipe Leakage Monitoring",
    availability        = "Flexible",
    reason              = "Experienced in monsoon drainage management and drinking water pipeline monitoring.",
    password_hash       = hash_password("volunteer123"),
    status              = "approved",
    worker_id_generated = "WRK-55210",
    admin_notes         = "Approved by KMC Admin. Assigned to Water Works Dept.",
    created_at          = datetime.utcnow() - timedelta(days=3),
    reviewed_at         = datetime.utcnow() - timedelta(days=2),
)
db.add_all([vol1, vol2, vol3])

# ------------------------------------------------------------------
# Sample Admin Audit Logs
# ------------------------------------------------------------------
audit1 = models.AdminAuditLog(
    admin_id    = super_admin.id,
    admin_code  = super_admin.admin_code,
    admin_name  = super_admin.name,
    action      = "SYSTEM_INIT",
    target_type = "SYSTEM",
    target_id   = "KMC",
    details     = "CivicFix Municipal Platform initialized by Super Administrator.",
    timestamp   = datetime.utcnow() - timedelta(days=5),
)
audit2 = models.AdminAuditLog(
    admin_id    = super_admin.id,
    admin_code  = super_admin.admin_code,
    admin_name  = super_admin.name,
    action      = "CREATE_CO_ADMIN",
    target_type = "ADMIN",
    target_id   = co_admin.admin_code,
    details     = f"Created CO_ADMIN account for {co_admin.name} ({co_admin.admin_code}) with permissions: [{co_admin.permissions}].",
    timestamp   = datetime.utcnow() - timedelta(days=4),
)
audit3 = models.AdminAuditLog(
    admin_id    = super_admin.id,
    admin_code  = super_admin.admin_code,
    admin_name  = super_admin.name,
    action      = "APPROVE_VOLUNTEER",
    target_type = "VOLUNTEER",
    target_id   = "VOL-1014",
    details     = "Approved volunteer application VOL-1014 (Kiran Varma) and issued Worker ID WRK-55210.",
    timestamp   = datetime.utcnow() - timedelta(days=2),
)
db.add_all([audit1, audit2, audit3])

db.commit()
db.close()
print("Database seeded successfully with RBAC & Admin Governance test accounts!")
print("   Citizen 1    -> phone: 9000000001  password: citizen123 (Ravi Kumar)")
print("   Citizen 2    -> phone: 9000000004  password: citizen123 (Priya Sharma)")
print("   Worker       -> phone: 9000000002 / WRK-10482  password: worker123 (Field Worker)")
print("   Super Admin  -> code: ADM-000001 / phone: 9000000003  password: admin123 (KMC Commissioner)")
print("   Co-Admin     -> code: ADM-104820 / phone: 9000000008  password: coadmin123 (Ravi Kumar - must change password)")
print("   Volunteer 1  -> phone: 9000000005 (VOL-1012 PENDING)")
print("   Volunteer 2  -> phone: 9000000006 (VOL-1013 PENDING)")
print("   Volunteer 3  -> phone: 9000000007 (VOL-1014 APPROVED as WRK-55210)")



