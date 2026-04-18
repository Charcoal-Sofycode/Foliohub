from pydantic import BaseModel, EmailStr, field_validator, Field
from datetime import datetime
from typing import Optional, Any

# Schema for when a user signs up
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class SignupRequestOTP(BaseModel):
    email: EmailStr

class UserCreateVerified(BaseModel):
    email: EmailStr
    password: str
    otp_code: str

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

# Step 2: User submits the OTP code to verify their email identity
class VerifyOTP(BaseModel):
    email: EmailStr
    otp: str

# Step 3: User provides the verified OTP + new password together
class ResetPasswordOTP(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

# Legacy token-based reset (kept for backward compatibility)
class ResetPassword(BaseModel):
    email: EmailStr
    token: str
    new_password: str

# ─── Project Story Schemas ─────────────────────────────────────────────────

class StoryMediaItem(BaseModel):
    """A single uploaded asset within a story stage."""
    type: str      # 'image' or 'video'
    url: str       # presigned URL or public URL
    key: str       # S3 key for deletion

class RevisionEntry(BaseModel):
    """A single revision round."""
    round: int
    note: Optional[str] = None
    media: list[StoryMediaItem] = []

class ProjectStoryResponse(BaseModel):
    id: int
    project_id: int
    brief_note:       Optional[str] = None
    brief_media:      list[dict] = []
    storyboard_note:  Optional[str] = None
    storyboard_media: list[dict] = []
    rough_cut_note:   Optional[str] = None
    rough_cut_media:  list[dict] = []
    revisions_note:   Optional[str] = None
    revisions_data:   list[dict] = []
    final_note:       Optional[str] = None
    final_media:      list[dict] = []
    updated_at:       Optional[datetime] = None

    class Config:
        from_attributes = True

class ProjectStoryUpdate(BaseModel):
    """Partial update for any stage — only send what changed."""
    brief_note:       Optional[str] = None
    brief_media:      Optional[list[dict]] = None
    storyboard_note:  Optional[str] = None
    storyboard_media: Optional[list[dict]] = None
    rough_cut_note:   Optional[str] = None
    rough_cut_media:  Optional[list[dict]] = None
    revisions_note:   Optional[str] = None
    revisions_data:   Optional[list[dict]] = None
    final_note:       Optional[str] = None
    final_media:      Optional[list[dict]] = None

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

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    role: Optional[str] = None
    tools_used: Optional[str] = None
    category: Optional[str] = None
    timeline_breakdown: Optional[str] = None

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
    optimized_url: Optional[str] = None
    transcoding_status: str = "pending"
    created_at: datetime
    story: Optional[ProjectStoryResponse] = None


    @field_validator("media_url", "raw_media_url", "optimized_url", mode="after")
    @classmethod
    def presign_url(cls, v):
        import s3_utils
        if v:
            return s3_utils.get_presigned_url(v)
        return v

    class Config:
        from_attributes = True

class InquiryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    project_details: str = Field(..., min_length=10, max_length=2000)

class InquiryResponse(BaseModel):
    id: int
    name: str
    email: str
    project_details: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class MatchRequest(BaseModel):
    reference_text: str

class MatchResult(BaseModel):
    portfolio: PortfolioResponse
    match_score: int
    match_reason: str



PortfolioResponse.model_rebuild()