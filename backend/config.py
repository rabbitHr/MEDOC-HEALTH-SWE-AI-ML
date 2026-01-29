"""Application configuration settings."""
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment or defaults."""
    
    # Database
    DATABASE_URL: str = "sqlite:///./face_attendance.db"
    
    # Face Recognition
    FACE_RECOGNITION_TOLERANCE: float = 0.45  # Lower = stricter matching
    MIN_FACE_CONFIDENCE: float = 0.85
    FACE_ENCODINGS_PER_USER: int = 5
    
    # Anti-Spoofing
    BLINK_THRESHOLD: float = 0.25  # Eye aspect ratio threshold
    LIVENESS_FRAMES_REQUIRED: int = 3
    TEXTURE_THRESHOLD: float = 0.6
    
    # Attendance
    MIN_HOURS_FOR_PUNCHOUT: int = 6
    
    # Storage
    UPLOAD_DIR: Path = Path("uploads")
    
    class Config:
        env_file = ".env"


settings = Settings()

# Ensure upload directory exists
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
