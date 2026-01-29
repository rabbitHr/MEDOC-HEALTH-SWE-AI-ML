"""Face detection and recognition service."""
import numpy as np
import face_recognition
import cv2
import base64
from typing import Optional, Tuple, List
from io import BytesIO
from PIL import Image

from config import settings


class FaceService:
    """Service for face detection, encoding, and recognition."""
    
    @staticmethod
    def decode_base64_image(base64_string: str) -> np.ndarray:
        """Decode base64 image to numpy array."""
        # Remove data URL prefix if present
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        
        image_bytes = base64.b64decode(base64_string)
        image = Image.open(BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        return np.array(image)
    
    @staticmethod
    def encode_image_to_base64(image: np.ndarray) -> str:
        """Encode numpy array image to base64."""
        pil_image = Image.fromarray(image)
        buffer = BytesIO()
        pil_image.save(buffer, format="JPEG", quality=85)
        return base64.b64encode(buffer.getvalue()).decode()
    
    @staticmethod
    def detect_faces(image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Detect faces in an image.
        
        Returns: List of face locations as (top, right, bottom, left) tuples
        """
        # Use HOG model for speed, use "cnn" for better accuracy (GPU required)
        face_locations = face_recognition.face_locations(image, model="hog")
        return face_locations
    
    @staticmethod
    def get_face_encoding(image: np.ndarray, face_location: Optional[Tuple] = None) -> Optional[np.ndarray]:
        """
        Generate 128D face encoding from an image.
        
        Args:
            image: RGB image as numpy array
            face_location: Optional (top, right, bottom, left) tuple
            
        Returns: 128D face encoding or None if no face found
        """
        known_face_locations = [face_location] if face_location else None
        
        encodings = face_recognition.face_encodings(
            image,
            known_face_locations=known_face_locations,
            num_jitters=1
        )
        
        if encodings:
            return encodings[0]
        return None
    
    @staticmethod
    def compare_faces(
        known_encodings: List[np.ndarray],
        face_to_check: np.ndarray,
        tolerance: float = None
    ) -> Tuple[bool, float, int]:
        """
        Compare a face encoding against known encodings.
        
        Returns: (is_match, best_confidence, best_match_index)
        """
        if tolerance is None:
            tolerance = settings.FACE_RECOGNITION_TOLERANCE
        
        if not known_encodings:
            return False, 0.0, -1
        
        # Calculate face distances
        distances = face_recognition.face_distance(known_encodings, face_to_check)
        
        # Find best match
        best_index = np.argmin(distances)
        best_distance = distances[best_index]
        
        # Convert distance to confidence (0-1 scale)
        confidence = 1.0 - best_distance
        
        # Check if match is within tolerance
        is_match = best_distance <= tolerance
        
        return is_match, confidence, int(best_index)
    
    @staticmethod
    def encoding_to_bytes(encoding: np.ndarray) -> bytes:
        """Convert numpy encoding to bytes for database storage."""
        return encoding.tobytes()
    
    @staticmethod
    def bytes_to_encoding(data: bytes) -> np.ndarray:
        """Convert bytes back to numpy encoding."""
        return np.frombuffer(data, dtype=np.float64)
    
    @staticmethod
    def validate_face_quality(
        image: np.ndarray,
        face_location: Tuple[int, int, int, int]
    ) -> Tuple[bool, str]:
        """
        Validate face quality for registration.
        
        Checks:
        - Face size (minimum pixels)
        - Face position (centered)
        - Image brightness
        
        Returns: (is_valid, message)
        """
        top, right, bottom, left = face_location
        face_width = right - left
        face_height = bottom - top
        
        # Check minimum face size
        if face_width < 100 or face_height < 100:
            return False, "Face is too small. Please move closer to the camera."
        
        # Check face is roughly centered
        img_height, img_width = image.shape[:2]
        face_center_x = (left + right) // 2
        face_center_y = (top + bottom) // 2
        
        center_tolerance = 0.3
        if abs(face_center_x - img_width // 2) > img_width * center_tolerance:
            return False, "Please center your face horizontally."
        
        if abs(face_center_y - img_height // 2) > img_height * center_tolerance:
            return False, "Please center your face vertically."
        
        # Check brightness
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        brightness = np.mean(gray)
        
        if brightness < 60:
            return False, "Image is too dark. Please improve lighting."
        if brightness > 240:
            return False, "Image is too bright. Please reduce lighting."
        
        return True, "Face quality is acceptable."
    
    @staticmethod
    def draw_face_box(
        image: np.ndarray,
        face_location: Tuple[int, int, int, int],
        label: str = "",
        color: Tuple[int, int, int] = (0, 255, 0)
    ) -> np.ndarray:
        """Draw bounding box and label on face."""
        top, right, bottom, left = face_location
        
        # Draw box
        cv2.rectangle(image, (left, top), (right, bottom), color, 2)
        
        # Draw label
        if label:
            cv2.rectangle(image, (left, bottom - 25), (right, bottom), color, cv2.FILLED)
            cv2.putText(image, label, (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 1)
        
        return image


# Singleton instance
face_service = FaceService()
