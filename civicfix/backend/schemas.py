from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    password: str
    role: str = "citizen"


class UserLogin(BaseModel):
    phone: Optional[str] = None
    login_id: Optional[str] = None
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    name: str
    role: str
    email: Optional[str] = None
    profile_picture: Optional[str] = None
    auth_provider: Optional[str] = "local"
    is_profile_complete: Optional[bool] = True
    worker_code: Optional[str] = None
    admin_code: Optional[str] = None
    admin_level: Optional[str] = None
    must_change_password: Optional[bool] = False
    permissions: Optional[List[str]] = []


class CompleteGoogleProfileRequest(BaseModel):
    phone: str
    name: Optional[str] = None


class GooglePendingInfoResponse(BaseModel):
    name: str
    email: str
    picture: Optional[str] = None



class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    worker_id: Optional[int] = None
    severity: Optional[str] = None
    notes: Optional[str] = None


class FeedbackCreate(BaseModel):
    rating: int  # 1 = thumbs up, 0 = thumbs down
    comment: Optional[str] = None


class StatusHistoryResponse(BaseModel):
    id: int
    complaint_id: str
    status: str
    changed_by_name: Optional[str] = None
    changed_by_role: Optional[str] = None
    notes: Optional[str] = None
    timestamp: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ComplaintAssignRequest(BaseModel):
    worker_id: int
    notes: Optional[str] = None


class WorkerResponse(BaseModel):
    id: int
    worker_code: Optional[str] = None
    name: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    ward_number: Optional[str] = None
    is_available: bool = True
    status: str = "Available"

    model_config = {"from_attributes": True}


class ComplaintResponse(BaseModel):
    id: str
    user_id: Optional[int] = None
    worker_id: Optional[int] = None
    worker_name: Optional[str] = None
    worker_code: Optional[str] = None
    category: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    severity: str
    priority_score: int
    status: str
    ai_label: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_description: Optional[str] = None
    report_count: int
    ward_number: Optional[str] = None
    municipality: Optional[str] = None
    department_name: Optional[str] = None
    assigned_officer: Optional[str] = None
    image_path: Optional[str] = None
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    history: Optional[List[StatusHistoryResponse]] = None

    model_config = {"from_attributes": True}


class VolunteerApplicationCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    dob: Optional[str] = None
    city: Optional[str] = "Kakinada"
    ward: Optional[str] = None
    address: Optional[str] = None
    department: str
    skills: Optional[str] = None
    availability: str
    reason: Optional[str] = None
    password: str


class VolunteerApplicationResponse(BaseModel):
    id: int
    application_id: str
    name: str
    phone: str
    email: Optional[str] = None
    dob: Optional[str] = None
    city: Optional[str] = None
    ward: Optional[str] = None
    address: Optional[str] = None
    department: str
    skills: Optional[str] = None
    availability: str
    reason: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    worker_id_generated: Optional[str] = None
    created_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class VolunteerActionRequest(BaseModel):
    admin_notes: Optional[str] = None
    department_id: Optional[int] = None
    ward_number: Optional[str] = None


class AdminCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    department_id: Optional[int] = None
    admin_level: str = "CO_ADMIN"
    permissions: List[str] = []
    password: str


class AdminResponse(BaseModel):
    id: int
    admin_code: str
    name: str
    phone: str
    email: Optional[str] = None
    admin_level: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    is_active: bool
    must_change_password: bool
    permissions: List[str] = []
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AdminUpdatePermissions(BaseModel):
    permissions: List[str]


class AdminChangePassword(BaseModel):
    old_password: str
    new_password: str


class AdminAuditLogResponse(BaseModel):
    id: int
    admin_code: str
    admin_name: str
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    timestamp: Optional[datetime] = None

    model_config = {"from_attributes": True}



