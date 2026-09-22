from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=True)
    role = Column(String, default="citizen")  # citizen | worker | admin
    worker_code = Column(String, unique=True, nullable=True)  # e.g. WRK-10482
    admin_code = Column(String, unique=True, nullable=True)   # e.g. ADM-000001, ADM-482193
    admin_level = Column(String, nullable=True)               # SUPER_ADMIN | CO_ADMIN
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=False)
    permissions = Column(Text, nullable=True)                 # Comma-separated list of permissions
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Google OAuth & Identity attributes
    google_id = Column(String, unique=True, nullable=True, index=True)
    auth_provider = Column(String, default="local")  # local | google | both
    profile_picture = Column(String, nullable=True)
    email_verified = Column(Boolean, default=False)
    is_profile_complete = Column(Boolean, default=True)

    complaints = relationship("Complaint", back_populates="user")
    department = relationship("Department", foreign_keys=[department_id])


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    ward_number = Column(String, nullable=False)
    service_type = Column(String)
    contact_email = Column(String)

    workers = relationship("Worker", back_populates="department")


class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True)
    worker_code = Column(String, unique=True, nullable=True)  # e.g. WRK-10482
    name = Column(String, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"))
    ward_number = Column(String, nullable=True)
    is_available = Column(Boolean, default=True)
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    department = relationship("Department", back_populates="workers")



class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    category = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    image_path = Column(String, nullable=True)
    severity = Column(String, default="MODERATE")  # LOW | MODERATE | HIGH | CRITICAL
    priority_score = Column(Integer, default=50)
    status = Column(String, default="pending")  # pending | assigned | in_progress | resolved | reopened

    # AI fields
    ai_label = Column(String, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    ai_description = Column(Text, nullable=True)

    # Duplicate grouping
    duplicate_group_id = Column(String, nullable=True)
    report_count = Column(Integer, default=1)

    # GIS routing
    ward_number = Column(String, nullable=True)
    municipality = Column(String, nullable=True)
    department_name = Column(String, nullable=True)
    assigned_officer = Column(String, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="complaints")
    worker = relationship("Worker", foreign_keys=[worker_id])
    resolution = relationship("Resolution", back_populates="complaint", uselist=False)
    history = relationship("StatusHistory", back_populates="complaint", order_by="StatusHistory.timestamp.asc()")

    @property
    def worker_name(self):
        return self.worker.name if self.worker else None

    @property
    def worker_code(self):
        return self.worker.worker_code if self.worker else None


class Resolution(Base):
    __tablename__ = "resolutions"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String, ForeignKey("complaints.id"), unique=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=True)
    after_image_path = Column(String, nullable=True)
    resolution_date = Column(DateTime(timezone=True), server_default=func.now())
    ai_verification_score = Column(Float, nullable=True)
    ai_verification_notes = Column(Text, nullable=True)
    citizen_rating = Column(Integer, nullable=True)  # 1=thumbs up, 0=thumbs down
    citizen_reopened = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    complaint = relationship("Complaint", back_populates="resolution")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String, ForeignKey("complaints.id"), nullable=False, index=True)
    status = Column(String, nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    changed_by_name = Column(String, nullable=True)
    changed_by_role = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    complaint = relationship("Complaint", back_populates="history")


class VolunteerApplication(Base):
    __tablename__ = "volunteer_applications"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String, unique=True, index=True)  # e.g. VOL-8421
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)
    dob = Column(String, nullable=True)
    city = Column(String, default="Kakinada")
    ward = Column(String, nullable=True)
    address = Column(String, nullable=True)
    department = Column(String, nullable=False)  # Sanitation, Roads, Water Supply, Street Lighting, Parks, Other
    skills = Column(String, nullable=True)
    availability = Column(String, nullable=False)  # Morning, Afternoon, Evening, Flexible
    reason = Column(Text, nullable=True)
    password_hash = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending | approved | rejected
    admin_notes = Column(Text, nullable=True)
    worker_id_generated = Column(String, nullable=True)  # e.g. WRK-10482
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    admin_code = Column(String, nullable=False)
    admin_name = Column(String, nullable=False)
    action = Column(String, nullable=False)  # CREATE_CO_ADMIN | APPROVE_VOLUNTEER | REJECT_VOLUNTEER | ASSIGN_WORKER | UPDATE_PERMISSIONS | DISABLE_ADMIN | ENABLE_ADMIN | CHANGE_PASSWORD
    target_type = Column(String, nullable=True)  # ADMIN | VOLUNTEER | COMPLAINT | WORKER
    target_id = Column(String, nullable=True)    # e.g. ADM-482193, VOL-1012, CIV-A1B2C
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())



