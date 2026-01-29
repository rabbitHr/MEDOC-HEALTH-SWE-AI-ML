"""SQLAlchemy database models."""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, LargeBinary, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from database import Base


class AttendanceType(enum.Enum):
    """Attendance punch type."""
    PUNCH_IN = "punch_in"
    PUNCH_OUT = "punch_out"


class User(Base):
    """User model for storing employee information."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=True)
    department = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Integer, default=1)
    
    # Profile photo (base64 encoded)
    profile_photo = Column(LargeBinary, nullable=True)
    
    # Relationships
    face_encodings = relationship("FaceEncoding", back_populates="user", cascade="all, delete-orphan")
    attendance_logs = relationship("AttendanceLog", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, employee_id='{self.employee_id}', name='{self.name}')>"


class FaceEncoding(Base):
    """Face encoding model for storing 128D face embeddings."""
    __tablename__ = "face_encodings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # 128D face encoding stored as binary (numpy array bytes)
    encoding = Column(LargeBinary, nullable=False)
    
    # Quality metrics
    confidence = Column(Float, nullable=True)
    angle_label = Column(String(20), nullable=True)  # front, left, right, up, down
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="face_encodings")
    
    def __repr__(self):
        return f"<FaceEncoding(id={self.id}, user_id={self.user_id}, angle='{self.angle_label}')>"


class AttendanceLog(Base):
    """Attendance log model for punch-in/out records."""
    __tablename__ = "attendance_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    punch_type = Column(SQLEnum(AttendanceType), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Verification data
    confidence_score = Column(Float, nullable=True)
    liveness_passed = Column(Integer, default=1)
    
    # Photo evidence (base64 encoded)
    photo_evidence = Column(LargeBinary, nullable=True)
    
    # Location (optional)
    location = Column(String(200), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="attendance_logs")
    
    def __repr__(self):
        return f"<AttendanceLog(id={self.id}, user_id={self.user_id}, type={self.punch_type.value})>"
