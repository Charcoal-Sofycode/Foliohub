from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from auth import get_current_user
from fastapi import File, UploadFile, Form
from datetime import datetime, timedelta, timezone
import secrets
import random

import s3_utils  # Import your new S3 logic
import email_utils  # OTP email utility
import transcoding_utils

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Limiter initialization
limiter = Limiter(key_func=get_remote_address)

# Import our files
import models, schemas, auth
from database import get_db, engine
import os
import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

app = FastAPI(title="Portfolio SaaS API")

@app.get("/health")
def health_check():
    return {"status": "awake"}

# ── Security Headers Middleware ────────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ───────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Portfolio SaaS API. The engine is running."}

# --- AUTHENTICATION ROUTES ---

@app.post("/signup/request-otp")
@limiter.limit("3/minute")
def request_signup_otp(request: Request, data: schemas.SignupRequestOTP, db: Session = Depends(get_db)):
    # 1. Check if email already exists
    existing_user = db.query(models.User).filter(models.User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Generate OTP
    otp = f"{random.SystemRandom().randint(0, 999999):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # 3. Save to signup_otps table (upsert if already exists)
    db_otp = db.query(models.SignupOTP).filter(models.SignupOTP.email == data.email).first()
    if db_otp:
        db_otp.otp_code = otp
        db_otp.expires_at = expires_at
    else:
        new_otp = models.SignupOTP(email=data.email, otp_code=otp, expires_at=expires_at)
        db.add(new_otp)
    
    db.commit()

    # 4. Send email
    subject = "FolioHub — Your Verification Code"
    body = f"Welcome to FolioHub!\n\nYour 6-digit verification code is: {otp}\n\nThis code will expire in 10 minutes. Use it to complete your studio setup."
    email_utils.send_email(data.email, subject, body)

    return {"message": "Verification code sent to your email."}

@app.post("/signup", response_model=schemas.UserResponse)
@limiter.limit("5/minute")
def create_user(request: Request, user_data: schemas.UserCreateVerified, db: Session = Depends(get_db)):
    # 1. Verify OTP
    db_otp = db.query(models.SignupOTP).filter(
        models.SignupOTP.email == user_data.email,
        models.SignupOTP.otp_code == user_data.otp_code
    ).first()

    if not db_otp:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if db_otp.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code expired. Please request a new one.")

    # 2. Final check if user was created while verifying
    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 3. Hash and Save
    hashed_password = auth.get_password_hash(user_data.password)
    new_user = models.User(email=user_data.email, hashed_password=hashed_password)
    db.add(new_user)
    
    # 4. Cleanup OTP
    db.delete(db_otp)
    
    db.commit()
    db.refresh(new_user)
    
    return new_user

@app.post("/login", response_model=schemas.Token)
@limiter.limit("10/minute")
def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2FA CHECK — uses cryptographically-secure random code
    if user.is_2fa_enabled:
        code = f"{secrets.randbelow(1000000):06d}"
        user.two_factor_code = code
        db.commit()
        # Dispatch verification email
        email_utils.send_2fa_email(user.email, code)
        return {"access_token": None, "token_type": "bearer", "requires_2fa": True}


    access_token = auth.create_access_token(data={"sub": user.email, "id": user.id})
    return {"access_token": access_token, "token_type": "bearer", "requires_2fa": False}

@app.post("/verify-2fa")
def verify_2fa(data: schemas.TwoFactorVerify, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or user.two_factor_code != data.code:
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
    
    # Clear the code and generate token
    user.two_factor_code = None
    db.commit()
    
    access_token = auth.create_access_token(data={"sub": user.email, "id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/enable-2fa")
def enable_2fa(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    current_user.is_2fa_enabled = True
    db.commit()
    return {"message": "2FA strictly enabled."}

@app.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, data: schemas.ForgotPassword, db: Session = Depends(get_db)):
    """Step 1: Generate a 6-digit OTP and email it to the user."""
    user = db.query(models.User).filter(models.User.email == data.email).first()

    if user:
        # Generate a cryptographically-adequate 6-digit OTP
        otp = f"{random.SystemRandom().randint(0, 999999):06d}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        user.reset_otp = otp
        user.reset_otp_expires_at = expires_at
        db.commit()

        # Send the OTP via email (falls back to console print if SMTP not configured)
        email_utils.send_otp_email(data.email, otp)

    # Always return 200 to prevent email enumeration
    return {"message": "If that email exists, a recovery code has been dispatched."}


@app.post("/verify-otp")
def verify_otp(data: schemas.VerifyOTP, db: Session = Depends(get_db)):
    """Step 2: Validate the OTP without consuming it (confirms code is correct before asking for new password)."""
    user = db.query(models.User).filter(models.User.email == data.email).first()

    if not user or not user.reset_otp or user.reset_otp != data.otp:
        raise HTTPException(status_code=400, detail="Invalid or incorrect recovery code.")

    # Check expiry — make reset_otp_expires_at timezone-aware for comparison
    expires_at = user.reset_otp_expires_at
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="Recovery code has expired. Please request a new one.")

    return {"message": "Code verified. You may now set a new password."}


@app.post("/reset-password-otp")
def reset_password_otp(data: schemas.ResetPasswordOTP, db: Session = Depends(get_db)):
    """Step 3: Validate OTP + set the new password atomically."""
    user = db.query(models.User).filter(models.User.email == data.email).first()

    if not user or not user.reset_otp or user.reset_otp != data.otp:
        raise HTTPException(status_code=400, detail="Invalid or incorrect recovery code.")

    expires_at = user.reset_otp_expires_at
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="Recovery code has expired. Please request a new one.")

    # All checks passed — update password and clear OTP
    user.hashed_password = auth.get_password_hash(data.new_password)
    user.reset_otp = None
    user.reset_otp_expires_at = None
    db.commit()
    return {"message": "Password has been successfully reset. You may now log in."}


@app.get("/generate-upload-url")
def get_upload_url(file_name: str, file_type: str, current_user: models.User = Depends(get_current_user)):
    """Generate a presigned post for direct S3 upload."""
    data = s3_utils.generate_presigned_post(file_name, file_type)
    if not data:
        raise HTTPException(status_code=500, detail="Could not generate upload params.")
    return data

@app.post("/reset-password")
def reset_password(data: schemas.ResetPassword, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or user.reset_token != data.token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    user.hashed_password = auth.get_password_hash(data.new_password)
    user.reset_token = None
    db.commit()
    return {"message": "Password has been successfully reset."}

@app.get("/users/me", response_model=schemas.UserResponse)
def get_user_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# --- PORTFOLIO ROUTES ---

@app.post("/portfolios", response_model=schemas.PortfolioResponse)
def create_portfolio(
    portfolio: schemas.PortfolioCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user) # This locks the route!
):
    # 1. Check if the user already has a portfolio (1-to-1 relationship)
    existing_portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).first()
    if existing_portfolio:
        raise HTTPException(status_code=400, detail="User already has a portfolio")

    # 2. Check if the requested subdomain is already taken by someone else
    subdomain_taken = db.query(models.Portfolio).filter(models.Portfolio.subdomain == portfolio.subdomain).first()
    if subdomain_taken:
        raise HTTPException(status_code=400, detail="Subdomain is already taken. Please choose another.")

    # 3. Create the portfolio
    new_portfolio = models.Portfolio(
        user_id=current_user.id,
        subdomain=portfolio.subdomain.lower(), # Always store subdomains in lowercase
        title=portfolio.title,
        bio=portfolio.bio,
        theme_preference=portfolio.theme_preference
    )
    
    db.add(new_portfolio)
    db.commit()
    db.refresh(new_portfolio)
    
    return new_portfolio

@app.get("/portfolios/me", response_model=schemas.PortfolioResponse)
def get_my_portfolio(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Fetch the portfolio for the currently logged-in user
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio
    
@app.put("/portfolios/me", response_model=schemas.PortfolioResponse)
def update_my_portfolio(
    update_data: schemas.PortfolioUpdate,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(portfolio, key, value)
        
    db.commit()
    db.refresh(portfolio)
    return portfolio

@app.get("/portfolios", response_model=list[schemas.PortfolioResponse])
def get_all_portfolios(db: Session = Depends(get_db)):
    # Marketplace: discovery of editors
    portfolios = db.query(models.Portfolio).all()
    return portfolios
    
    

@app.post("/projects", response_model=schemas.ProjectResponse)
def create_project(
    background_tasks: BackgroundTasks,
    title: str = Form(...),

    description: str = Form(None),
    project_type: str = Form("video"),
    role: str = Form(None),
    tools_used: str = Form(None),
    category: str = Form("general"),
    timeline_breakdown: str = Form(None),
    file: UploadFile = File(None), # Made optional
    raw_file: UploadFile = File(None),
    project_file: UploadFile = File(None),
    media_key: str = Form(None), # New: Direct S3 keys
    raw_media_key: str = Form(None),
    project_file_key: str = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):



    # 1. Find the user's portfolio
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).first()
    if not portfolio:
        raise HTTPException(status_code=400, detail="You must create a portfolio before uploading projects.")

    # SAAS RESTRICTION: Free plan limited to 5 projects
    if current_user.subscription_tier == "free" or not current_user.subscription_tier:
        project_count = db.query(models.Project).filter(models.Project.portfolio_id == portfolio.id).count()
        if project_count >= 5:
            raise HTTPException(status_code=403, detail="Free plan limit reached (5 edits maximum). Please upgrade your package.")

    # 2. Resolve URLs (Either upload from stream or use direct key)
    file_url = None
    if media_key:
        file_url = f"https://{s3_utils.get_config()['bucket']}.s3.{s3_utils.get_config()['region']}.amazonaws.com/{media_key}"
    elif file:
        file_url = s3_utils.upload_file_to_s3(file.file, file.filename)
    
    if not file_url:
        raise HTTPException(status_code=400, detail="Either a file or a media_key must be provided.")
        
    project_file_url = None
    if project_file_key:
        project_file_url = f"https://{s3_utils.get_config()['bucket']}.s3.{s3_utils.get_config()['region']}.amazonaws.com/{project_file_key}"
    elif project_file:
        project_file_url = s3_utils.upload_file_to_s3(project_file.file, project_file.filename)
        
    raw_media_url = None
    if raw_media_key:
        raw_media_url = f"https://{s3_utils.get_config()['bucket']}.s3.{s3_utils.get_config()['region']}.amazonaws.com/{raw_media_key}"
    elif raw_file:
        raw_media_url = s3_utils.upload_file_to_s3(raw_file.file, raw_file.filename)

    is_verified = False
    if project_file_url and timeline_breakdown:
       is_verified = True

    # 3. Save the project to the Supabase database
    new_project = models.Project(
        portfolio_id=portfolio.id,
        title=title,
        description=description,
        project_type=project_type,
        role=role,
        tools_used=tools_used,
        category=category,
        media_url=file_url,
        raw_media_url=raw_media_url,
        timeline_breakdown=timeline_breakdown,
        project_file_url=project_file_url,
        is_verified=is_verified
    )
    
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    # 4. Trigger Transcoding in background if it's a video
    if project_type == "video":
        background_tasks.add_task(transcoding_utils.transcode_video, new_project.id)

    
    return new_project


@app.put("/projects/{project_id}", response_model=schemas.ProjectResponse)
def update_project(
    project_id: int,
    project_update: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = _get_project_for_user(project_id, current_user, db)
    
    update_data = project_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    
    db.commit()
    db.refresh(project)
    return project

@app.delete("/projects/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = _get_project_for_user(project_id, current_user, db)
    
    # Optional: Delete file from S3 here if you want to save space
    # s3_utils.delete_file_from_s3(project.media_url) etc.
    
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}


@app.get("/portfolios/{subdomain}/projects")

def get_portfolio_projects(subdomain: str, db: Session = Depends(get_db)):
    # This is a PUBLIC route so anyone visiting the creator's portfolio can see their work!
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.subdomain == subdomain).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
        
    return portfolio.projects
    
@app.get("/portfolios/view/{subdomain}", response_model=schemas.PortfolioResponse)
def get_public_portfolio(subdomain: str, db: Session = Depends(get_db)):
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.subdomain == subdomain).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio

@app.post("/ai/match", response_model=list[schemas.MatchResult])
def ai_match_editors(request: schemas.MatchRequest, db: Session = Depends(get_db)):
    text = request.reference_text.lower()
    portfolios = db.query(models.Portfolio).all()
    results = []
    
    for p in portfolios:
        score = 0
        reasons = []
        
        # Heuristic 1: Keyword matching in skills/bio
        p_text = f"{p.skills or ''} {p.title or ''} {p.bio or ''}".lower()
        keywords = ["motion", "color", "vfx", "gaming", "documentary", "cinematic", "fast", "slow", "tiktok", "reels"]
        
        matches = 0
        for kw in keywords:
            if kw in text and kw in p_text:
                score += 20
                matches += 1
                
        if matches > 0:
            reasons.append(f"Strong match for {matches} requested styles.")
            
        # Heuristic 2: Heatmap matching
        if "color" in text or "grade" in text:
            if p.skill_color > 70:
                score += 30
                reasons.append("Top percentile colorist.")
        
        if "motion" in text or "effect" in text or "vfx" in text:
            if p.skill_motion > 70:
                score += 30
                reasons.append("Elite motion graphics capabilities.")
                
        if "fast" in text or "pacing" in text or "tiktok" in text or "reels" in text:
            if p.skill_cutting > 70:
                score += 30
                reasons.append("High-speed dynamic cutter.")
                
        # Base vibe score to ensure someone always shows up
        score += 15
        
        # Max score cap
        score = min(score, 98)
        if score > 75 and not reasons:
             reasons.append("Excellent thematic match.")
        elif not reasons:
             reasons.append("Solid underlying capability match.")

        if score >= 40:
            results.append(schemas.MatchResult(
                portfolio=p,
                match_score=score,
                match_reason=" ".join(reasons)
            ))
            
    # Sort by descending score
    results.sort(key=lambda x: x.match_score, reverse=True)
    return results[:5]

@app.post("/create-checkout-session")
def create_checkout_session(current_user: models.User = Depends(get_current_user)):
    try:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Premium Editor Plan',
                        'description': 'Unlimited projects, 4K High Res Videos, and Premium Features',
                    },
                    'unit_amount': 500, # $5.00
                },
                'quantity': 1,
            }],
            mode='payment', # Use subscription for real recurring billing
            success_url=f'{frontend_url}/dashboard?session_id={{CHECKOUT_SESSION_ID}}',
            cancel_url=f'{frontend_url}/dashboard',
            client_reference_id=str(current_user.id)
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/verify-session/{session_id}")
def verify_session(session_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status == 'paid' and session.client_reference_id == str(current_user.id):
            # Force update in case webhook hasn't fired yet
            current_user.subscription_tier = "premium"
            current_user.stripe_customer_id = session.customer
            db.commit()
            return {"status": "premium"}
        return {"status": current_user.subscription_tier or "free"}
    except Exception as e:
        print(f"Session Verification Error: {e}")
        return {"status": current_user.subscription_tier or "free"}

from fastapi import Request

@app.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    # Verify webhook signature if secret is configured (strongly recommended in production)
    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature.")
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        # Fallback for local dev without a webhook secret (unsafe for production)
        try:
            import json
            event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('client_reference_id')
        
        if user_id:
            user = db.query(models.User).filter(models.User.id == int(user_id)).first()
            if user:
                user.subscription_tier = "premium"
                user.stripe_customer_id = session.get('customer')
                db.commit()

    return {"status": "success"}
@app.post("/downgrade")
def downgrade_plan(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Note: In a live subscription environment, this would call stripe.Subscription.modify
    # to cancel at period end. For now, we perform an immediate tier reset.
    current_user.subscription_tier = 'free'
    db.commit()
    return {'message': 'Plan downgraded to free. No refund processed as per policy.'}


# ─────────────────────────────────────────────────────────────────────────────
# PROJECT STORY ROUTES
# ─────────────────────────────────────────────────────────────────────────────

def _get_project_for_user(project_id: int, current_user: models.User, db: Session) -> models.Project:
    """Helper: fetch project and verify it belongs to the current user."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == project.portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=403, detail="Access denied")
    return project


@app.get("/projects/{project_id}/story", response_model=schemas.ProjectStoryResponse)
def get_project_story(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Fetch the story for a project (auto-creates it if it doesn't exist yet)."""
    project = _get_project_for_user(project_id, current_user, db)

    story = db.query(models.ProjectStory).filter(
        models.ProjectStory.project_id == project.id
    ).first()

    if not story:
        story = models.ProjectStory(
            project_id=project.id,
            brief_media=[], storyboard_media=[], rough_cut_media=[],
            revisions_data=[], final_media=[]
        )
        db.add(story)
        db.commit()
        db.refresh(story)

    return story


@app.put("/projects/{project_id}/story", response_model=schemas.ProjectStoryResponse)
def update_project_story(
    project_id: int,
    data: schemas.ProjectStoryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update text notes or replace media arrays for any stage."""
    project = _get_project_for_user(project_id, current_user, db)

    story = db.query(models.ProjectStory).filter(
        models.ProjectStory.project_id == project.id
    ).first()
    if not story:
        story = models.ProjectStory(
            project_id=project.id,
            brief_media=[], storyboard_media=[], rough_cut_media=[],
            revisions_data=[], final_media=[]
        )
        db.add(story)

    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(story, key, value)

    story.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(story)
    return story


@app.post("/projects/{project_id}/story/upload")
async def upload_story_media(
    project_id: int,

    stage: str = Form(...),         # brief | storyboard | rough_cut | revisions | final
    file: UploadFile = File(None),
    direct_key: str = Form(None),
    media_type_override: str = Form(None), # image | video
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Upload a screenshot or short clip for a specific story stage."""
    valid_stages = {"brief", "storyboard", "rough_cut", "revisions", "final"}
    if stage not in valid_stages:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Choose from: {valid_stages}")

    project = _get_project_for_user(project_id, current_user, db)

    story = db.query(models.ProjectStory).filter(
        models.ProjectStory.project_id == project.id
    ).first()
    if not story:
        story = models.ProjectStory(
            project_id=project.id,
            brief_media=[], storyboard_media=[], rough_cut_media=[],
            revisions_data=[], final_media=[]
        )
        db.add(story)
        db.commit()
        db.refresh(story)

    # Resolve media type and key
    s3_key = None
    media_type = None

    if direct_key:
        s3_key = direct_key
        media_type = media_type_override or "video"
    elif file:
        # Determine media type from MIME
        content_type = file.content_type or ""
        if content_type.startswith("image/"):
            media_type = "image"
        elif content_type.startswith("video/"):
            media_type = "video"
        else:
            raise HTTPException(status_code=400, detail="Only image or video files are accepted.")
        
        # Upload using the full S3 URL but we store relative keys in story media
        file_url = s3_utils.upload_file_to_s3(file.file, file.filename)
        if not file_url:
            raise HTTPException(status_code=500, detail="Upload to cloud storage failed.")
        s3_key = file_url.split(".amazonaws.com/")[-1]
    
    if not s3_key:
        raise HTTPException(status_code=400, detail="Either a file or a direct_key must be provided.")

    presigned = s3_utils.get_presigned_url(s3_key)
    media_item = {"type": media_type, "url": presigned, "key": s3_key}


    # Append to the correct stage media list
    media_field = f"{stage}_media"
    if stage == "revisions":
        # Revisions use a flat media list inside revisions_data for the latest round
        rev_data = list(story.revisions_data or [])
        if not rev_data:
            rev_data.append({"round": 1, "note": "", "media": []})
        rev_data[-1]["media"] = rev_data[-1].get("media", []) + [media_item]
        story.revisions_data = rev_data
    else:
        current_list = list(getattr(story, media_field) or [])
        current_list.append(media_item)
        setattr(story, media_field, current_list)

    story.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(story)
    return {"message": "Media uploaded successfully.", "item": media_item, "story_id": story.id}


@app.delete("/projects/{project_id}/story/media")
def delete_story_media(
    project_id: int,
    stage: str,
    key: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Remove a single media item from a story stage by its S3 key."""
    project = _get_project_for_user(project_id, current_user, db)

    story = db.query(models.ProjectStory).filter(
        models.ProjectStory.project_id == project.id
    ).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    if stage == "revisions":
        rev_data = list(story.revisions_data or [])
        for rev in rev_data:
            rev["media"] = [m for m in rev.get("media", []) if m.get("key") != key]
        story.revisions_data = rev_data
    else:
        media_field = f"{stage}_media"
        current_list = list(getattr(story, media_field) or [])
        setattr(story, media_field, [m for m in current_list if m.get("key") != key])

    story.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Media item removed."}


@app.post("/portfolios/{portfolio_id}/inquire")
def send_inquiry(portfolio_id: int, inquiry: schemas.InquiryCreate, db: Session = Depends(get_db)):
    db_portfolio = db.query(models.Portfolio).filter(models.Portfolio.id == portfolio_id).first()
    if not db_portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    db_inquiry = models.Inquiry(
        portfolio_id=portfolio_id,
        name=inquiry.name,
        email=inquiry.email,
        project_details=inquiry.project_details
    )

    db.add(db_inquiry)
    db.commit()
    return {"message": "Inquiry sent successfully"}

@app.get("/inquiries/me", response_model=list[schemas.InquiryResponse])
def get_my_inquiries(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).first()
    if not portfolio:
        return []
    
    inquiries = db.query(models.Inquiry).filter(models.Inquiry.portfolio_id == portfolio.id).order_by(models.Inquiry.created_at.desc()).all()
    return inquiries

@app.patch("/inquiries/{inquiry_id}/read")
def mark_inquiry_read(inquiry_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
        
    db_inquiry = db.query(models.Inquiry).filter(models.Inquiry.id == inquiry_id, models.Inquiry.portfolio_id == portfolio.id).first()
    if not db_inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    db_inquiry.is_read = True
    db.commit()
    return {"message": "Inquiry marked as read"}

@app.delete("/inquiries/{inquiry_id}")
def delete_inquiry(inquiry_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
        
    db_inquiry = db.query(models.Inquiry).filter(models.Inquiry.id == inquiry_id, models.Inquiry.portfolio_id == portfolio.id).first()
    if not db_inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    db.delete(db_inquiry)
    db.commit()
    return {"message": "Inquiry deleted"}

@app.post("/inquiries/{inquiry_id}/report")
def report_inquiry(inquiry_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
        
    db_inquiry = db.query(models.Inquiry).filter(models.Inquiry.id == inquiry_id, models.Inquiry.portfolio_id == portfolio.id).first()
    if not db_inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    # Send report to official email
    from email_utils import send_email
    report_content = f"""
    SPAM REPORT ALERT
    -----------------
    Reporter: {current_user.email} (Portfolio: {portfolio.subdomain})
    Inquiry ID: {db_inquiry.id}
    Sender Name: {db_inquiry.name}
    Sender Email: {db_inquiry.email}
    Details: {db_inquiry.project_details}
    """
    
    try:
        send_email("officialsofycode@gmail.com", "FOLIOHUB SPAM REPORTED", report_content)
    except Exception as e:
        print(f"Failed to send spam report email: {e}")

    # Optionally mark it as read or move to a "reported" state
    db_inquiry.is_read = True
    db.commit()
    
    return {"message": "Report submitted. Our team will investigate. Thank you."}


