"""User management API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import base64

from database import get_db
from models import User, FaceEncoding
from schemas import (
    UserCreate, UserResponse, UserListResponse,
    FaceRegistrationRequest, FaceRegistrationResponse
)
from services import face_service
from config import settings

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user."""
    # Convert empty strings to None
    if user_data.email == "":
        user_data.email = None
    if user_data.department == "":
        user_data.department = None

    # Check if employee_id already exists
    existing = db.query(User).filter(User.employee_id == user_data.employee_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee ID '{user_data.employee_id}' already exists"
        )
    
    # Check if email already exists
    if user_data.email:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{user_data.email}' already exists"
            )
    
    # Create user
    user = User(**user_data.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return UserResponse(
        id=user.id,
        employee_id=user.employee_id,
        name=user.name,
        email=user.email,
        department=user.department,
        created_at=user.created_at,
        is_active=bool(user.is_active),
        has_face_registered=False
    )


@router.get("/", response_model=UserListResponse)
async def list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List all users."""
    total = db.query(User).filter(User.is_active == 1).count()
    users = db.query(User).filter(User.is_active == 1).offset(skip).limit(limit).all()
    
    user_responses = []
    for user in users:
        has_face = len(user.face_encodings) > 0
        profile_photo = None
        if user.profile_photo:
            profile_photo = base64.b64encode(user.profile_photo).decode()
        
        user_responses.append(UserResponse(
            id=user.id,
            employee_id=user.employee_id,
            name=user.name,
            email=user.email,
            department=user.department,
            created_at=user.created_at,
            is_active=bool(user.is_active),
            has_face_registered=has_face,
            profile_photo=profile_photo
        ))
    
    return UserListResponse(users=user_responses, total=total)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a specific user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    has_face = len(user.face_encodings) > 0
    profile_photo = None
    if user.profile_photo:
        profile_photo = base64.b64encode(user.profile_photo).decode()
    
    return UserResponse(
        id=user.id,
        employee_id=user.employee_id,
        name=user.name,
        email=user.email,
        department=user.department,
        created_at=user.created_at,
        is_active=bool(user.is_active),
        has_face_registered=has_face,
        profile_photo=profile_photo
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user (soft delete)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    user.is_active = 0
    db.commit()


@router.post("/register-face", response_model=FaceRegistrationResponse)
async def register_face(request: FaceRegistrationRequest, db: Session = Depends(get_db)):
    """
    Register face images for a user.
    
    Expects multiple base64-encoded images from different angles.
    """
    # Find user
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {request.user_id} not found"
        )
    
    quality_issues = []
    encodings_saved = 0
    
    # Default angle labels
    angle_labels = request.angle_labels or ["front"] * len(request.images)
    
    for i, image_b64 in enumerate(request.images):
        try:
            # Decode image
            image = face_service.decode_base64_image(image_b64)
            
            # Detect faces
            face_locations = face_service.detect_faces(image)
            
            if len(face_locations) == 0:
                quality_issues.append(f"Image {i+1}: No face detected")
                continue
            
            if len(face_locations) > 1:
                quality_issues.append(f"Image {i+1}: Multiple faces detected, using largest")
            
            # Use the largest face
            face_location = max(face_locations, key=lambda loc: (loc[2] - loc[0]) * (loc[1] - loc[3]))
            
            # Validate face quality
            is_valid, message = face_service.validate_face_quality(image, face_location)
            if not is_valid:
                quality_issues.append(f"Image {i+1}: {message}")
                continue
            
            # Generate encoding
            encoding = face_service.get_face_encoding(image, face_location)
            if encoding is None:
                quality_issues.append(f"Image {i+1}: Could not generate face encoding")
                continue
            
            # Store encoding
            face_encoding = FaceEncoding(
                user_id=user.id,
                encoding=face_service.encoding_to_bytes(encoding),
                confidence=0.95,  # Placeholder, would use actual detection confidence
                angle_label=angle_labels[i] if i < len(angle_labels) else "front"
            )
            db.add(face_encoding)
            encodings_saved += 1
            
            # Set first good image as profile photo
            if user.profile_photo is None:
                top, right, bottom, left = face_location
                face_crop = image[top:bottom, left:right]
                user.profile_photo = base64.b64decode(
                    face_service.encode_image_to_base64(face_crop)
                )
        
        except Exception as e:
            quality_issues.append(f"Image {i+1}: Error - {str(e)}")
            continue
    
    db.commit()
    
    success = encodings_saved > 0
    message = f"Successfully registered {encodings_saved} face encoding(s)" if success else "No faces could be registered"
    
    return FaceRegistrationResponse(
        success=success,
        message=message,
        encodings_saved=encodings_saved,
        quality_issues=quality_issues
    )


@router.get("/{user_id}/face-encodings")
async def get_face_encodings_count(user_id: int, db: Session = Depends(get_db)):
    """Get count of registered face encodings for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    return {
        "user_id": user_id,
        "encoding_count": len(user.face_encodings),
        "encodings": [
            {
                "id": enc.id,
                "angle": enc.angle_label,
                "created_at": enc.created_at
            }
            for enc in user.face_encodings
        ]
    }


@router.delete("/{user_id}/face-encodings", status_code=status.HTTP_204_NO_CONTENT)
async def delete_face_encodings(user_id: int, db: Session = Depends(get_db)):
    """Delete all face encodings for a user (for re-registration)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    db.query(FaceEncoding).filter(FaceEncoding.user_id == user_id).delete()
    user.profile_photo = None
    db.commit()
