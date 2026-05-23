from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, BigInteger, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    subscription_tier = Column(String, default="free") # "free" or "premium"
    stripe_customer_id = Column(String, unique=True, nullable=True)
    paypal_subscription_id = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Security
    reset_token = Column(String, nullable=True)        # legacy UUID token (kept for compat)
    reset_otp = Column(String(6), nullable=True)        # 6-digit OTP for email recovery
    reset_otp_expires_at = Column(DateTime, nullable=True)  # UTC expiry for the OTP
    is_2fa_enabled = Column(Boolean, default=False)
    two_factor_code = Column(String, nullable=True)
    # Relationships
    portfolio = relationship("Portfolio", back_populates="owner", uselist=False, cascade="all, delete-orphan")
    trusted_devices = relationship("TrustedDevice", back_populates="user", cascade="all, delete-orphan")

class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    subdomain = Column(String, unique=True, index=True, nullable=False) # e.g., "username"
    custom_domain = Column(String, unique=True, index=True, nullable=True) # Premium feature
    title = Column(String, default="My Portfolio")
    bio = Column(Text, nullable=True)
    theme_preference = Column(String, default="cinematic-dark")
    
    # Custom Branding
    logo_url = Column(String, nullable=True)
    cover_image_url = Column(String, nullable=True)
    accent_color = Column(String, default="#ffffff")
    typography = Column(String, default="sans")
    intro_style = Column(String, default="default")
    
    # Portfolio Extensions
    showreel_url = Column(String, nullable=True)
    skills = Column(String, nullable=True)
    location = Column(String, nullable=True)
    availability = Column(String, nullable=True)
    fixed_packages = Column(Text, nullable=True)
    hourly_rate = Column(String, nullable=True)
    booking_link = Column(String, nullable=True)
    
    # Easy Contact / Hiring System
    whatsapp_number = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    fiverr_url = Column(String, nullable=True)
    
    # Skill Heatmap
    skill_cutting = Column(Integer, default=50)
    skill_motion = Column(Integer, default=50)
    skill_color = Column(Integer, default=50)

    # Social integrations
    youtube_url = Column(String, nullable=True)
    instagram_url = Column(String, nullable=True)

    # Style Fingerprint — computed from uploaded videos
    style_fingerprint = Column(JSON, nullable=True)
    fingerprint_computed_at = Column(DateTime, nullable=True)

    # Social Proof
    social_proof_headline = Column(String, nullable=True) # e.g., "Edited shorts that reached 5M+ views"
    brands_worked_with = Column(String, nullable=True) # comma separated
    platform_rating = Column(String, nullable=True) # e.g., "5.0 on Fiverr (100+ Reviews)"

    # Analytics
    view_count = Column(Integer, default=0)

    # Rework & Agreements
    revision_policy = Column(Text, nullable=True)
    agreement_url = Column(String, nullable=True)

    # Relationships
    owner = relationship("User", back_populates="portfolio")
    projects = relationship("Project", back_populates="portfolio", cascade="all, delete-orphan")
    inquiries = relationship("Inquiry", back_populates="portfolio", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    project_type = Column(String, default="video") # "video", "gallery", "system"
    
    # Project Extensions
    role = Column(String, nullable=True)
    tools_used = Column(String, nullable=True)
    category = Column(String, default="general", nullable=True)
    
    # AI Tagging and Client Review
    tags = Column(String, nullable=True) # Comma-separated AI generated tags
    status = Column(String, default="published") # "draft", "published", "needs_revision", "approved"
    max_recorrections = Column(Integer, default=3)
    recorrections_used = Column(Integer, default=0)
    
    # Proof of Work System
    timeline_breakdown = Column(Text, nullable=True)
    project_file_url = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)

    # Performance Metrics (Results)
    metric_views = Column(String, nullable=True)
    metric_likes = Column(String, nullable=True)
    metric_comments = Column(String, nullable=True)
    metric_retention = Column(String, nullable=True)
    metric_ctr = Column(String, nullable=True)
    metric_watch_time = Column(String, nullable=True)
    
    # Hybrid Model Additions
    source_link = Column(String, nullable=True)
    client_goals = Column(Text, nullable=True)
    strategy_notes = Column(Text, nullable=True)
    monetization_results = Column(Text, nullable=True)

    # Media Links (Will point to your AWS S3 buckets)
    media_url = Column(String, nullable=True) 
    raw_media_url = Column(String, nullable=True) 
    optimized_url = Column(String, nullable=True) # Optimized H.264 version
    transcoding_status = Column(String, default="pending") # "pending", "processing", "completed", "failed"
    thumbnail_url = Column(String, nullable=True)

    # Split View Settings
    sync_offset_ms = Column(Integer, default=0, nullable=True)
    audio_mode = Column(String, default="crossfade", nullable=True)
    raw_hidden = Column(Boolean, default=False, nullable=True)
    timeline_markers = Column(JSON, nullable=True)
    
    view_count = Column(Integer, default=0)
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    portfolio = relationship("Portfolio", back_populates="projects")
    story     = relationship("ProjectStory", back_populates="project", uselist=False, cascade="all, delete-orphan")
    comments  = relationship("ProjectComment", back_populates="project", cascade="all, delete-orphan")


class ProjectStory(Base):
    """One story per project — 5 ordered production stages, each holding
    text notes + arrays of image/clip S3 keys."""
    __tablename__ = "project_stories"

    id         = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), unique=True, nullable=False)

    # Each stage: text note + JSON list of media S3 keys
    # Stage 1 — Brief / Client Brief
    brief_note        = Column(Text, nullable=True)
    brief_media       = Column(JSON, default=list)  # [{type: 'image'|'video', url: '...', key: '...'}]

    # Stage 2 — Storyboard / Shot List
    storyboard_note   = Column(Text, nullable=True)
    storyboard_media  = Column(JSON, default=list)

    # Stage 3 — Rough Cut
    rough_cut_note    = Column(Text, nullable=True)
    rough_cut_media   = Column(JSON, default=list)

    # Stage 4 — Revision Rounds (stored as JSON list of revision objects)
    revisions_note    = Column(Text, nullable=True)  # general notes
    revisions_data    = Column(JSON, default=list)   # [{round: 1, note: '...', media: [...]}, ...]

    # Stage 5 — Final Export / Delivery
    final_note        = Column(Text, nullable=True)
    final_media       = Column(JSON, default=list)

    updated_at = Column(DateTime, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="story")


class Inquiry(Base):
    __tablename__ = "inquiries"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    project_details = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship
    portfolio = relationship("Portfolio", back_populates="inquiries")

class ProjectComment(Base):
    """Client feedback and timestamps for Draft projects"""
    __tablename__ = "project_comments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    timestamp = Column(Integer, nullable=True) # Time in seconds on the video player
    text = Column(Text, nullable=False)
    author_name = Column(String, nullable=True)
    is_resolved = Column(Boolean, default=False)
    is_draft = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="comments")

class SignupOTP(Base):
    __tablename__ = "signup_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp_code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class TrustedDevice(Base):
    __tablename__ = "trusted_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String, index=True, nullable=False)
    device_name = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)

    # Relationships
    user = relationship("User", back_populates="trusted_devices")