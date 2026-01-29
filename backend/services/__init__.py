"""Services package."""
from .face_service import face_service, FaceService
from .anti_spoof_service import anti_spoof_service, AntiSpoofService

__all__ = ["face_service", "FaceService", "anti_spoof_service", "AntiSpoofService"]
