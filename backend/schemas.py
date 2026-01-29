"""Pydantic schemas for API request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============ User Schemas ============

class UserCreate(BaseModel):
    """Schema for creating a new user."""
    employee_id: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = None
    department: Optional[str] = None


class UserResponse(BaseModel):
    """Schema for user response."""
    id: int
    employee_id: str
    name: str
    email: Optional[str]
    department: Optional[str]
    created_at: datetime
    is_active: bool
    has_face_registered: bool = False
    profile_photo: Optional[str] = None  # Base64 encoded
    
    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Schema for list of users."""
    users: List[UserResponse]
    total: int


# ============ Face Registration Schemas ============

class FaceRegistrationRequest(BaseModel):
    """Schema for registering face images."""
    user_id: int
    images: List[str]  # List of base64 encoded images
    angle_labels: Optional[List[str]] = None  # front, left, right, up, down


class FaceRegistrationResponse(BaseModel):
    """Schema for face registration response."""
    success: bool
    message: str
    encodings_saved: int = 0
    quality_issues: List[str] = []


# ============ Attendance Schemas ============

class PunchRequest(BaseModel):
    """Schema for punch in/out request."""
    image: str  # Base64 encoded image
    frames: Optional[List[str]] = None  # Multiple frames for liveness check


class PunchResponse(BaseModel):
    """Schema for punch in/out response."""
    success: bool
    message: str
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    punch_type: Optional[str] = None  # punch_in or punch_out
    timestamp: Optional[datetime] = None
    confidence: Optional[float] = None
    liveness_passed: bool = False


class AttendanceLogResponse(BaseModel):
    """Schema for attendance log entry."""
    id: int
    user_id: int
    user_name: str
    employee_id: str
    punch_type: str
    timestamp: datetime
    confidence: Optional[float]
    liveness_passed: bool
    photo_evidence: Optional[str] = None  # Base64 encoded
    
    class Config:
        from_attributes = True


class AttendanceHistoryResponse(BaseModel):
    """Schema for attendance history."""
    logs: List[AttendanceLogResponse]
    total: int


class TodayStatsResponse(BaseModel):
    """Schema for today's attendance statistics."""
    total_employees: int
    present_today: int
    punched_in: int
    punched_out: int


# ============ Recognition Schemas ============

class RecognitionRequest(BaseModel):
    """Schema for face recognition request."""
    image: str  # Base64 encoded image


class RecognitionResponse(BaseModel):
    """Schema for face recognition response."""
    success: bool
    recognized: bool
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    confidence: Optional[float] = None
    face_location: Optional[List[int]] = None  # [top, right, bottom, left]
    message: str = ""


# ============ Liveness Schemas ============

class LivenessCheckRequest(BaseModel):
    """Schema for liveness check request."""
    frames: List[str]  # List of base64 encoded frames


class LivenessCheckResponse(BaseModel):
    """Schema for liveness check response."""
    passed: bool
    confidence: float
    blink_detected: bool
    texture_passed: bool
    motion_passed: bool
    message: str
