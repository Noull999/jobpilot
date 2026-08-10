from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
import re

class UserSignup(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=2, max_length=255)

    @field_validator('password')
    def validate_password(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password debe contener al menos una mayúscula')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password debe contener al menos una minúscula')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password debe contener al menos un número')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password debe contener al menos un carácter especial')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None

class CVUpdate(BaseModel):
    summary: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[dict]] = None
    education: Optional[List[dict]] = None
    certifications: Optional[List[dict]] = None

class JobMatchQuery(BaseModel):
    limit: int = Field(10, ge=1, le=50)
    offset: int = Field(0, ge=0)

class NotificationPreferenceUpdate(BaseModel):
    enabled: Optional[bool] = None
    frequency: Optional[str] = Field(None, pattern="^(daily|weekly)$")
    min_match_score: Optional[int] = Field(None, ge=0, le=100)

class ApplicationCreate(BaseModel):
    job_id: int
    cv_id: int
    cover_letter: Optional[str] = None
