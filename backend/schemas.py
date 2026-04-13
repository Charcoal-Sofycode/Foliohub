from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional

# Schema for when a user signs up
class UserCreate(BaseModel):
    email: EmailStr
    password: str

# Schema for what we return to the frontend (notice we NEVER return the password)
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    is_active: bool
    subscription_tier: str
    created_at: datetime
    is_2fa_enabled: bool

    class Config:
        from_attributes = True

# Schema for the Login Token
class Token(BaseModel):
    access_token: Optional[str] = None
    token_type: str = "bearer"
    requires_2fa: bool = False
    
class TwoFactorVerify(BaseModel):
    email: EmailStr
    code: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    token: str
    new_password: str

    
    
from typing import Optional

# What the user sends us to create a portfolio
class PortfolioCreate(BaseModel):
    subdomain: str
    title: Optional[str] = "My Portfolio"
    bio: Optional[str] = None
    theme_preference: Optional[str] = "cinematic-dark"

# Create a PortfolioUpdate for updating profile details
class PortfolioUpdate(BaseModel):
    title: Optional[str] = None
    bio: Optional[str] = None
    theme_preference: Optional[str] = None
    showreel_url: Optional[str] = None
    skills: Optional[str] = None
    location: Optional[str] = None
    availability: Optional[str] = None
    fixed_packages: Optional[str] = None
    hourly_rate: Optional[str] = None
    booking_link: Optional[str] = None
    youtube_url: Optional[str] = None
    instagram_url: Optional[str] = None
    skill_cutting: Optional[int] = None
    skill_motion: Optional[int] = None
    skill_color: Optional[int] = None

# What we send back to the frontend
class PortfolioResponse(BaseModel):
    id: int
    user_id: int
    subdomain: str
    title: str
    bio: Optional[str]
    theme_preference: str
    showreel_url: Optional[str] = None
    skills: Optional[str] = None
    location: Optional[str] = None
    availability: Optional[str] = None
    fixed_packages: Optional[str] = None
    hourly_rate: Optional[str] = None
    booking_link: Optional[str] = None
    youtube_url: Optional[str] = None
    instagram_url: Optional[str] = None
    skill_cutting: Optional[int] = 50
    skill_motion: Optional[int] = 50
    skill_color: Optional[int] = 50
    projects: list["ProjectResponse"] = []

    class Config:
        from_attributes = True

class ProjectResponse(BaseModel):
    id: int
    portfolio_id: int
    title: str
    description: Optional[str]
    project_type: str
    role: Optional[str] = None
    tools_used: Optional[str] = None
    category: Optional[str] = None
    timeline_breakdown: Optional[str] = None
    project_file_url: Optional[str] = None
    is_verified: bool = False
    media_url: Optional[str]
    raw_media_url: Optional[str] = None
    created_at: datetime

    @field_validator("media_url", "raw_media_url", mode="after")
    @classmethod
    def presign_url(cls, v):
        import s3_utils
        if v:
            return s3_utils.get_presigned_url(v)
        return v

    class Config:
        from_attributes = True

class MatchRequest(BaseModel):
    reference_text: str

class MatchResult(BaseModel):
    portfolio: PortfolioResponse
    match_score: int
    match_reason: str

PortfolioResponse.model_rebuild()