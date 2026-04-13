from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Security
    reset_token = Column(String, nullable=True)
    is_2fa_enabled = Column(Boolean, default=False)
    two_factor_code = Column(String, nullable=True)
    # Relationships
    portfolio = relationship("Portfolio", back_populates="owner", uselist=False)

class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    subdomain = Column(String, unique=True, index=True, nullable=False) # e.g., "username"
    custom_domain = Column(String, unique=True, index=True, nullable=True) # Premium feature
    title = Column(String, default="My Portfolio")
    bio = Column(Text, nullable=True)
    theme_preference = Column(String, default="cinematic-dark")
    
    # Portfolio Extensions
    showreel_url = Column(String, nullable=True)
    skills = Column(String, nullable=True)
    location = Column(String, nullable=True)
    availability = Column(String, nullable=True)
    fixed_packages = Column(Text, nullable=True)
    hourly_rate = Column(String, nullable=True)
    booking_link = Column(String, nullable=True)
    
    # Skill Heatmap
    skill_cutting = Column(Integer, default=50)
    skill_motion = Column(Integer, default=50)
    skill_color = Column(Integer, default=50)

    # Social integrations
    youtube_url = Column(String, nullable=True)
    instagram_url = Column(String, nullable=True)

    # Relationships
    owner = relationship("User", back_populates="portfolio")
    projects = relationship("Project", back_populates="portfolio", cascade="all, delete-orphan")

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
    
    # Proof of Work System
    timeline_breakdown = Column(Text, nullable=True)
    project_file_url = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)

    # Media Links (Will point to your AWS S3 buckets)
    media_url = Column(String, nullable=True) 
    raw_media_url = Column(String, nullable=True) 
    thumbnail_url = Column(String, nullable=True)
    
    view_count = Column(Integer, default=0)
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    portfolio = relationship("Portfolio", back_populates="projects")