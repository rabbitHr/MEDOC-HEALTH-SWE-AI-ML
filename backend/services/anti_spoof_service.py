"""Anti-spoofing service for liveness detection."""
import numpy as np
import cv2
from typing import List, Tuple, Optional
from scipy.spatial import distance as spatial_distance
from collections import deque

from config import settings


class AntiSpoofService:
    """Service for detecting face spoofing attempts."""
    
    # Eye landmark indices (for 68-point model)
    LEFT_EYE_INDICES = list(range(36, 42))
    RIGHT_EYE_INDICES = list(range(42, 48))
    
    def __init__(self):
        self.blink_history = deque(maxlen=30)  # Track last 30 frames
        self.motion_history = deque(maxlen=10)
        
    def calculate_eye_aspect_ratio(self, eye_points: np.ndarray) -> float:
        """
        Calculate Eye Aspect Ratio (EAR) for blink detection.
        
        EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
        
        When eye is open: EAR ~ 0.25-0.35
        When eye is closed: EAR ~ 0.1-0.2
        """
        # Vertical distances
        v1 = spatial_distance.euclidean(eye_points[1], eye_points[5])
        v2 = spatial_distance.euclidean(eye_points[2], eye_points[4])
        
        # Horizontal distance
        h = spatial_distance.euclidean(eye_points[0], eye_points[3])
        
        if h == 0:
            return 0.0
            
        ear = (v1 + v2) / (2.0 * h)
        return ear
    
    def detect_blink(self, left_eye: np.ndarray, right_eye: np.ndarray) -> Tuple[bool, float]:
        """
        Detect if eyes are blinking.
        
        Returns: (is_blinking, average_ear)
        """
        left_ear = self.calculate_eye_aspect_ratio(left_eye)
        right_ear = self.calculate_eye_aspect_ratio(right_eye)
        
        avg_ear = (left_ear + right_ear) / 2.0
        is_blinking = avg_ear < settings.BLINK_THRESHOLD
        
        self.blink_history.append(avg_ear)
        
        return is_blinking, avg_ear
    
    def check_blink_pattern(self) -> Tuple[bool, str]:
        """
        Check if natural blink pattern has been detected.
        
        A valid blink is: open -> closed -> open transition
        """
        if len(self.blink_history) < 10:
            return False, "Collecting frames..."
        
        history = list(self.blink_history)
        
        # Look for blink pattern
        blink_detected = False
        for i in range(len(history) - 5):
            window = history[i:i+6]
            
            # Check for open-close-open pattern
            max_ear = max(window)
            min_ear = min(window)
            
            if max_ear > 0.25 and min_ear < 0.2:
                # Found transition
                blink_detected = True
                break
        
        if blink_detected:
            return True, "Blink detected - liveness confirmed"
        
        return False, "Please blink naturally"
    
    def analyze_texture(self, face_image: np.ndarray) -> Tuple[bool, float]:
        """
        Analyze face texture using Local Binary Patterns (LBP).
        
        Real faces have more texture variation than printed photos.
        """
        # Convert to grayscale
        if len(face_image.shape) == 3:
            gray = cv2.cvtColor(face_image, cv2.COLOR_RGB2GRAY)
        else:
            gray = face_image
        
        # Resize for consistent analysis
        face_resized = cv2.resize(gray, (128, 128))
        
        # Calculate LBP
        lbp = self._compute_lbp(face_resized)
        
        # Calculate histogram
        hist, _ = np.histogram(lbp.ravel(), bins=256, range=(0, 256))
        hist = hist.astype(float)
        hist /= (hist.sum() + 1e-7)
        
        # Calculate texture score (entropy-based)
        entropy = -np.sum(hist * np.log2(hist + 1e-7))
        
        # Normalize to 0-1 range (typical entropy range is 4-8)
        texture_score = min(1.0, entropy / 8.0)
        
        # Real faces typically have higher texture scores
        is_real = texture_score > settings.TEXTURE_THRESHOLD
        
        return is_real, texture_score
    
    def _compute_lbp(self, image: np.ndarray, radius: int = 1, points: int = 8) -> np.ndarray:
        """Compute Local Binary Pattern of image."""
        rows, cols = image.shape
        output = np.zeros((rows - 2*radius, cols - 2*radius), dtype=np.uint8)
        
        for i in range(radius, rows - radius):
            for j in range(radius, cols - radius):
                center = image[i, j]
                binary = 0
                
                for p in range(points):
                    angle = 2 * np.pi * p / points
                    x = int(round(i + radius * np.sin(angle)))
                    y = int(round(j + radius * np.cos(angle)))
                    
                    if image[x, y] >= center:
                        binary |= (1 << p)
                
                output[i - radius, j - radius] = binary
        
        return output
    
    def detect_motion(
        self,
        current_landmarks: np.ndarray,
        previous_landmarks: Optional[np.ndarray] = None
    ) -> Tuple[bool, float]:
        """
        Detect natural face motion.
        
        Printed photos and screens show no natural micro-movements.
        """
        if previous_landmarks is None:
            self.motion_history.append(current_landmarks)
            return False, 0.0
        
        # Calculate movement
        movement = np.mean(np.abs(current_landmarks - previous_landmarks))
        
        self.motion_history.append(current_landmarks)
        
        # Check if there's natural motion (small but present)
        # Printed photos: ~0 movement
        # Real faces: subtle movement (0.5-5 pixels)
        has_movement = 0.3 < movement < 20.0
        
        return has_movement, movement
    
    def verify_liveness(
        self,
        frames: List[np.ndarray],
        face_locations: List[Tuple],
        landmarks_list: Optional[List] = None
    ) -> Tuple[bool, dict]:
        """
        Comprehensive liveness verification across multiple frames.
        
        Args:
            frames: List of face images
            face_locations: Face bounding boxes for each frame
            landmarks_list: Optional facial landmarks for each frame
            
        Returns: (passed, details dict)
        """
        results = {
            "blink_detected": False,
            "texture_passed": False,
            "motion_passed": False,
            "overall_passed": False,
            "confidence": 0.0,
            "message": ""
        }
        
        if len(frames) < settings.LIVENESS_FRAMES_REQUIRED:
            results["message"] = f"Need at least {settings.LIVENESS_FRAMES_REQUIRED} frames"
            return False, results
        
        # Texture analysis on first clear frame
        is_real, texture_score = self.analyze_texture(frames[0])
        results["texture_passed"] = is_real
        results["texture_score"] = texture_score
        
        # Motion analysis across frames
        if landmarks_list and len(landmarks_list) >= 2:
            for i in range(1, len(landmarks_list)):
                has_motion, _ = self.detect_motion(
                    landmarks_list[i],
                    landmarks_list[i-1]
                )
                if has_motion:
                    results["motion_passed"] = True
                    break
        
        # Calculate overall confidence
        confidence = 0.0
        checks_passed = 0
        
        if results["texture_passed"]:
            confidence += 0.5
            checks_passed += 1
        
        if results["motion_passed"]:
            confidence += 0.3
            checks_passed += 1
        
        if results.get("blink_detected", False):
            confidence += 0.2
            checks_passed += 1
        
        results["confidence"] = confidence
        results["overall_passed"] = confidence >= 0.5
        
        if results["overall_passed"]:
            results["message"] = "Liveness verification passed"
        else:
            results["message"] = "Liveness verification failed - possible spoof detected"
        
        return results["overall_passed"], results
    
    def reset(self):
        """Reset detection history."""
        self.blink_history.clear()
        self.motion_history.clear()


# Singleton instance
anti_spoof_service = AntiSpoofService()
