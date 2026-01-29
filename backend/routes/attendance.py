"""Attendance management API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta
from typing import Optional
import base64

from database import get_db
from models import User, FaceEncoding, AttendanceLog, AttendanceType
from schemas import (
    PunchRequest, PunchResponse,
    AttendanceLogResponse, AttendanceHistoryResponse,
    TodayStatsResponse, RecognitionRequest, RecognitionResponse,
    LivenessCheckRequest, LivenessCheckResponse
)
from services import face_service, anti_spoof_service
from config import settings

router = APIRouter(prefix="/attendance", tags=["attendance"])


def get_all_encodings(db: Session):
    """Get all face encodings from database."""
    all_encodings = db.query(FaceEncoding).join(User).filter(User.is_active == 1).all()
    
    encodings_data = []
    for enc in all_encodings:
        encodings_data.append({
            "user_id": enc.user_id,
            "user_name": enc.user.name,
            "employee_id": enc.user.employee_id,
            "encoding": face_service.bytes_to_encoding(enc.encoding)
        })
    
    return encodings_data


def recognize_face(image_b64: str, db: Session):
    """Recognize a face from an image."""
    # Decode image
    image = face_service.decode_base64_image(image_b64)
    
    # Detect faces
    face_locations = face_service.detect_faces(image)
    
    if len(face_locations) == 0:
        return None, "No face detected in the image"
    
    if len(face_locations) > 1:
        # Use the largest face
        face_location = max(face_locations, key=lambda loc: (loc[2] - loc[0]) * (loc[1] - loc[3]))
    else:
        face_location = face_locations[0]
    
    # Get encoding
    encoding = face_service.get_face_encoding(image, face_location)
    if encoding is None:
        return None, "Could not extract face features"
    
    # Get all stored encodings
    all_encodings_data = get_all_encodings(db)
    
    if not all_encodings_data:
        return None, "No registered users in the system"
    
    # Group encodings by user
    user_encodings = {}
    for enc_data in all_encodings_data:
        user_id = enc_data["user_id"]
        if user_id not in user_encodings:
            user_encodings[user_id] = {
                "encodings": [],
                "name": enc_data["user_name"],
                "employee_id": enc_data["employee_id"]
            }
        user_encodings[user_id]["encodings"].append(enc_data["encoding"])
    
    # Find best match across all users
    best_match = None
    best_confidence = 0.0
    
    for user_id, data in user_encodings.items():
        is_match, confidence, _ = face_service.compare_faces(
            data["encodings"],
            encoding
        )
        
        if is_match and confidence > best_confidence:
            best_confidence = confidence
            best_match = {
                "user_id": user_id,
                "user_name": data["name"],
                "employee_id": data["employee_id"],
                "confidence": confidence,
                "face_location": list(face_location)
            }
    
    if best_match:
        return best_match, "Face recognized successfully"
    
    return None, "Face not recognized - not a registered user"


@router.post("/recognize", response_model=RecognitionResponse)
async def recognize(request: RecognitionRequest, db: Session = Depends(get_db)):
    """Recognize a face without marking attendance."""
    match, message = recognize_face(request.image, db)
    
    if match:
        return RecognitionResponse(
            success=True,
            recognized=True,
            user_id=match["user_id"],
            user_name=match["user_name"],
            confidence=match["confidence"],
            face_location=match["face_location"],
            message=message
        )
    
    return RecognitionResponse(
        success=True,
        recognized=False,
        message=message
    )


@router.post("/punch", response_model=PunchResponse)
async def punch(request: PunchRequest, db: Session = Depends(get_db)):
    """
    Smart punch - automatically determines punch-in or punch-out.
    
    - First punch of the day = Punch In
    - Subsequent punch after minimum hours = Punch Out
    """
    # Recognize face
    match, message = recognize_face(request.image, db)
    
    if not match:
        return PunchResponse(
            success=False,
            message=message,
            liveness_passed=False
        )
    
    user_id = match["user_id"]
    confidence = match["confidence"]
    
    # Liveness check if multiple frames provided
    liveness_passed = True
    if request.frames and len(request.frames) >= 2:
        frames = [face_service.decode_base64_image(f) for f in request.frames[:5]]
        face_locations = [face_service.detect_faces(f) for f in frames]
        
        # Filter frames with detected faces
        valid_frames = []
        valid_locations = []
        for f, locs in zip(frames, face_locations):
            if locs:
                valid_frames.append(f)
                valid_locations.append(locs[0])
        
        if len(valid_frames) >= 2:
            liveness_passed, liveness_result = anti_spoof_service.verify_liveness(
                valid_frames, valid_locations
            )
            
            if not liveness_passed:
                return PunchResponse(
                    success=False,
                    message=f"Liveness check failed: {liveness_result.get('message', 'Possible spoof detected')}",
                    user_id=user_id,
                    user_name=match["user_name"],
                    confidence=confidence,
                    liveness_passed=False
                )
    
    # Check today's attendance
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    today_logs = db.query(AttendanceLog).filter(
        AttendanceLog.user_id == user_id,
        AttendanceLog.timestamp >= today_start,
        AttendanceLog.timestamp <= today_end
    ).order_by(AttendanceLog.timestamp.desc()).all()
    
    # Determine punch type
    if not today_logs:
        # First punch of the day = Punch In
        punch_type = AttendanceType.PUNCH_IN
    else:
        last_punch = today_logs[0]
        
        if last_punch.punch_type == AttendanceType.PUNCH_OUT:
            # Already punched out, new punch in
            punch_type = AttendanceType.PUNCH_IN
        else:
            # Check if enough time has passed for punch out
            time_since_punch_in = datetime.utcnow() - last_punch.timestamp
            min_hours = timedelta(hours=settings.MIN_HOURS_FOR_PUNCHOUT)
            
            if time_since_punch_in >= min_hours:
                punch_type = AttendanceType.PUNCH_OUT
            else:
                # Not enough time for punch out
                remaining = min_hours - time_since_punch_in
                hours, remainder = divmod(int(remaining.total_seconds()), 3600)
                minutes = remainder // 60
                
                return PunchResponse(
                    success=False,
                    message=f"Already punched in. Punch out available in {hours}h {minutes}m",
                    user_id=user_id,
                    user_name=match["user_name"],
                    punch_type="punch_in",
                    timestamp=last_punch.timestamp,
                    confidence=confidence,
                    liveness_passed=liveness_passed
                )
    
    # Create attendance log
    photo_bytes = None
    try:
        if "," in request.image:
            photo_bytes = base64.b64decode(request.image.split(",")[1])
        else:
            photo_bytes = base64.b64decode(request.image)
    except:
        pass
    
    attendance = AttendanceLog(
        user_id=user_id,
        punch_type=punch_type,
        confidence_score=confidence,
        liveness_passed=1 if liveness_passed else 0,
        photo_evidence=photo_bytes
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    
    return PunchResponse(
        success=True,
        message=f"{punch_type.value.replace('_', ' ').title()} successful",
        user_id=user_id,
        user_name=match["user_name"],
        punch_type=punch_type.value,
        timestamp=attendance.timestamp,
        confidence=confidence,
        liveness_passed=liveness_passed
    )


@router.get("/history", response_model=AttendanceHistoryResponse)
async def get_attendance_history(
    user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get attendance history with optional filters."""
    query = db.query(AttendanceLog).join(User)
    
    if user_id:
        query = query.filter(AttendanceLog.user_id == user_id)
    
    if start_date:
        query = query.filter(AttendanceLog.timestamp >= datetime.combine(start_date, datetime.min.time()))
    
    if end_date:
        query = query.filter(AttendanceLog.timestamp <= datetime.combine(end_date, datetime.max.time()))
    
    total = query.count()
    logs = query.order_by(AttendanceLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    log_responses = []
    for log in logs:
        photo_evidence = None
        if log.photo_evidence:
            photo_evidence = base64.b64encode(log.photo_evidence).decode()
        
        log_responses.append(AttendanceLogResponse(
            id=log.id,
            user_id=log.user_id,
            user_name=log.user.name,
            employee_id=log.user.employee_id,
            punch_type=log.punch_type.value,
            timestamp=log.timestamp,
            confidence=log.confidence_score,
            liveness_passed=bool(log.liveness_passed),
            photo_evidence=photo_evidence
        ))
    
    return AttendanceHistoryResponse(logs=log_responses, total=total)


@router.get("/today", response_model=AttendanceHistoryResponse)
async def get_today_attendance(db: Session = Depends(get_db)):
    """Get today's attendance logs."""
    today = date.today()
    return await get_attendance_history(start_date=today, end_date=today, db=db)


@router.get("/stats/today", response_model=TodayStatsResponse)
async def get_today_stats(db: Session = Depends(get_db)):
    """Get today's attendance statistics."""
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    # Total active employees
    total_employees = db.query(User).filter(User.is_active == 1).count()
    
    # Get today's logs
    today_logs = db.query(AttendanceLog).filter(
        AttendanceLog.timestamp >= today_start,
        AttendanceLog.timestamp <= today_end
    ).all()
    
    # Count unique users who punched in
    punched_in_users = set()
    punched_out_users = set()
    
    for log in today_logs:
        if log.punch_type == AttendanceType.PUNCH_IN:
            punched_in_users.add(log.user_id)
        elif log.punch_type == AttendanceType.PUNCH_OUT:
            punched_out_users.add(log.user_id)
    
    return TodayStatsResponse(
        total_employees=total_employees,
        present_today=len(punched_in_users),
        punched_in=len(punched_in_users - punched_out_users),
        punched_out=len(punched_out_users)
    )


@router.post("/liveness-check", response_model=LivenessCheckResponse)
async def check_liveness(request: LivenessCheckRequest):
    """
    Perform liveness check on multiple frames.
    
    Used to verify a real person is present before punch.
    """
    if len(request.frames) < 2:
        return LivenessCheckResponse(
            passed=False,
            confidence=0.0,
            blink_detected=False,
            texture_passed=False,
            motion_passed=False,
            message="At least 2 frames required for liveness check"
        )
    
    # Decode frames
    frames = [face_service.decode_base64_image(f) for f in request.frames[:5]]
    
    # Get face locations
    face_locations = []
    valid_frames = []
    
    for frame in frames:
        locs = face_service.detect_faces(frame)
        if locs:
            face_locations.append(locs[0])
            valid_frames.append(frame)
    
    if len(valid_frames) < 2:
        return LivenessCheckResponse(
            passed=False,
            confidence=0.0,
            blink_detected=False,
            texture_passed=False,
            motion_passed=False,
            message="Could not detect face in enough frames"
        )
    
    # Perform liveness check
    passed, result = anti_spoof_service.verify_liveness(valid_frames, face_locations)
    
    return LivenessCheckResponse(
        passed=passed,
        confidence=result.get("confidence", 0.0),
        blink_detected=result.get("blink_detected", False),
        texture_passed=result.get("texture_passed", False),
        motion_passed=result.get("motion_passed", False),
        message=result.get("message", "")
    )
