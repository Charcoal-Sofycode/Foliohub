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
import re
import json
import logging

# Configure logging to ensure errors show up in Render/Production logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

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
import requests

PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox")
PAYPAL_PLAN_ID = os.getenv("PAYPAL_PLAN_ID", "")

PAYPAL_API_BASE = (
    "https://api-m.sandbox.paypal.com"
    if PAYPAL_MODE == "sandbox"
    else "https://api-m.paypal.com"
)

# ── Dynamic Schema Sync ───────────────────────────────────────────────────────
# This ensures that any new models (like SignupOTP) are created automatically
models.Base.metadata.create_all(bind=engine)

from sqlalchemy import text
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_subscription_id VARCHAR;"))
        conn.commit()
    logger.info("Successfully synced database schema for paypal_subscription_id.")
except Exception as schema_err:
    logger.warning(f"Database schema sync warning (might already exist): {schema_err}")

app = FastAPI(title="Portfolio SaaS API")

# Session middleware required for SQLAdmin authentication
from starlette.middleware.sessions import SessionMiddleware
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "change-me-in-production"))

# ── SQLAdmin Integration (Option B) ───────────────────────────────────────────
from sqladmin import Admin, ModelView, BaseView, expose
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request as StarletteRequest
from starlette.responses import RedirectResponse

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@foliohub.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "FolioHub@Admin2025")

class AdminAuth(AuthenticationBackend):
    async def login(self, request: StarletteRequest) -> bool:
        form = await request.form()
        username = form.get("username", "")
        password = form.get("password", "")
        if username == ADMIN_EMAIL and password == ADMIN_PASSWORD:
            request.session.update({"admin_authenticated": True})
            return True
        return False

    async def logout(self, request: StarletteRequest) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: StarletteRequest) -> bool:
        return request.session.get("admin_authenticated", False)

admin_auth = AdminAuth(secret_key=os.getenv("SECRET_KEY", "change-me-in-production"))

class UserAdmin(ModelView, model=models.User):
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"
    column_list = [models.User.id, models.User.email, models.User.is_active, models.User.subscription_tier, models.User.created_at]
    column_searchable_list = [models.User.email]
    column_sortable_list = [models.User.id, models.User.created_at]

class PortfolioAdmin(ModelView, model=models.Portfolio):
    name = "Portfolio"
    name_plural = "Portfolios"
    icon = "fa-solid fa-folder-open"
    column_list = [models.Portfolio.id, models.Portfolio.subdomain, models.Portfolio.custom_domain, models.Portfolio.title, models.Portfolio.view_count]
    column_searchable_list = [models.Portfolio.subdomain, models.Portfolio.custom_domain, models.Portfolio.title]
    column_sortable_list = [models.Portfolio.id, models.Portfolio.view_count]

class ProjectAdmin(ModelView, model=models.Project):
    name = "Project"
    name_plural = "Projects"
    icon = "fa-solid fa-video"
    column_list = [models.Project.id, models.Project.title, models.Project.project_type, models.Project.transcoding_status, models.Project.is_verified, models.Project.is_published, models.Project.view_count]
    column_searchable_list = [models.Project.title, models.Project.description]
    column_sortable_list = [models.Project.id, models.Project.view_count, models.Project.created_at]

class InquiryAdmin(ModelView, model=models.Inquiry):
    name = "Inquiry"
    name_plural = "Inquiries"
    icon = "fa-solid fa-envelope"
    column_list = [models.Inquiry.id, models.Inquiry.name, models.Inquiry.email, models.Inquiry.is_read, models.Inquiry.created_at]
    column_searchable_list = [models.Inquiry.name, models.Inquiry.email, models.Inquiry.project_details]
    column_sortable_list = [models.Inquiry.id, models.Inquiry.created_at]

class ProjectCommentAdmin(ModelView, model=models.ProjectComment):
    name = "Comment"
    name_plural = "Comments"
    icon = "fa-solid fa-comments"
    column_list = [models.ProjectComment.id, models.ProjectComment.author_name, models.ProjectComment.timestamp, models.ProjectComment.is_resolved, models.ProjectComment.created_at]
    column_searchable_list = [models.ProjectComment.author_name, models.ProjectComment.text]
    column_sortable_list = [models.ProjectComment.id, models.ProjectComment.created_at]

class S3MetricsAdmin(BaseView):
    name = "System & Cost Monitor"
    icon = "fa-solid fa-chart-pie"

    @expose("/s3-metrics", methods=["GET"])
    async def s3_metrics_page(self, request: Request):
        import boto3
        import os
        from sqlalchemy.orm import Session
        from database import engine
        import models
        
        aws_key = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY")
        bucket_name = os.getenv("AWS_BUCKET_NAME", "sofycode-portfolio-assets")
        aws_region = os.getenv("AWS_REGION", "eu-north-1")
        
        error_msg = None
        metrics = None
        system_metrics = None
        
        # Calculate Database & Operations Stats
        try:
            with Session(engine) as db:
                users_count = db.query(models.User).count()
                premium_users = db.query(models.User).filter(models.User.subscription_tier == "premium").count()
                portfolios_count = db.query(models.Portfolio).count()
                projects_count = db.query(models.Project).count()
                inquiries_count = db.query(models.Inquiry).count()
                comments_count = db.query(models.ProjectComment).count()
                trusted_devices_count = db.query(models.TrustedDevice).count()
                
                # Transcoding
                pending_transcodes = db.query(models.Project).filter(models.Project.transcoding_status == "pending").count()
                processing_transcodes = db.query(models.Project).filter(models.Project.transcoding_status == "processing").count()
                completed_transcodes = db.query(models.Project).filter(models.Project.transcoding_status == "completed").count()
                failed_transcodes = db.query(models.Project).filter(models.Project.transcoding_status == "failed").count()
                
                # Financials (Premium plan costs $5.00/mo. PayPal transaction fee is 2.9% + $0.30 by default, fully configurable via env)
                PREMIUM_PRICE = float(os.getenv("PREMIUM_PRICE", "5.00"))
                PAYPAL_FEE_PERCENT = float(os.getenv("PAYPAL_FEE_PERCENT", "2.9"))
                PAYPAL_FEE_FIXED = float(os.getenv("PAYPAL_FEE_FIXED", "0.30"))
                
                gross_mrr = premium_users * PREMIUM_PRICE
                PAYPAL_FEE_PER_TX = (PREMIUM_PRICE * (PAYPAL_FEE_PERCENT / 100)) + PAYPAL_FEE_FIXED
                total_paypal_fees = premium_users * PAYPAL_FEE_PER_TX
                net_mrr = gross_mrr - total_paypal_fees
                
                # Estimate Resend sent volume
                estimated_emails_sent = (users_count * 2) + trusted_devices_count
                
                system_metrics = {
                    "users_count": users_count,
                    "premium_users": premium_users,
                    "free_users": users_count - premium_users,
                    "portfolios_count": portfolios_count,
                    "projects_count": projects_count,
                    "inquiries_count": inquiries_count,
                    "comments_count": comments_count,
                    "trusted_devices_count": trusted_devices_count,
                    "total_rows": users_count + portfolios_count + projects_count + inquiries_count + comments_count + trusted_devices_count,
                    
                    "gross_mrr": round(gross_mrr, 2),
                    "total_paypal_fees": round(total_paypal_fees, 2),
                    "net_mrr": round(net_mrr, 2),
                    
                    "estimated_emails_sent": estimated_emails_sent,
                    
                    "transcoding_pending": pending_transcodes,
                    "transcoding_processing": processing_transcodes,
                    "transcoding_completed": completed_transcodes,
                    "transcoding_failed": failed_transcodes,
                    "premium_price_usd": PREMIUM_PRICE,
                    "paypal_fee_percent": PAYPAL_FEE_PERCENT,
                    "paypal_fee_fixed": PAYPAL_FEE_FIXED
                }
        except Exception as db_err:
            # Non-blocking operational metrics error
            print(f"Failed to query database stats: {db_err}")
        
        # Fetch Official AWS Billing from CloudWatch (us-east-1)
        official_s3_bill = None
        official_total_bill = None
        if aws_key and aws_secret:
            try:
                from datetime import datetime, timezone, timedelta
                cw = boto3.client(
                    'cloudwatch',
                    aws_access_key_id=aws_key,
                    aws_secret_access_key=aws_secret,
                    region_name='us-east-1'  # Billing metrics are ALWAYS stored in us-east-1
                )
                
                # Fetch S3 billing specifically
                s3_res = cw.get_metric_data(
                    MetricDataQueries=[
                        {
                            'Id': 's3_bill',
                            'MetricStat': {
                                'Metric': {
                                    'Namespace': 'AWS/Billing',
                                    'MetricName': 'EstimatedCharges',
                                    'Dimensions': [
                                        {'Name': 'Currency', 'Value': 'USD'},
                                        {'Name': 'ServiceName', 'Value': 'AmazonS3'}
                                    ]
                                },
                                'Period': 86400,
                                'Stat': 'Maximum'
                            }
                        }
                    ],
                    StartTime=datetime.now(timezone.utc) - timedelta(days=2),
                    EndTime=datetime.now(timezone.utc)
                )
                
                # Fetch total billing across all AWS services
                total_res = cw.get_metric_data(
                    MetricDataQueries=[
                        {
                            'Id': 'total_bill',
                            'MetricStat': {
                                'Metric': {
                                    'Namespace': 'AWS/Billing',
                                    'MetricName': 'EstimatedCharges',
                                    'Dimensions': [
                                        {'Name': 'Currency', 'Value': 'USD'}
                                    ]
                                },
                                'Period': 86400,
                                'Stat': 'Maximum'
                            }
                        }
                    ],
                    StartTime=datetime.now(timezone.utc) - timedelta(days=2),
                    EndTime=datetime.now(timezone.utc)
                )
                
                if s3_res and 'MetricDataResults' in s3_res and s3_res['MetricDataResults'][0]['Values']:
                    official_s3_bill = round(s3_res['MetricDataResults'][0]['Values'][0], 2)
                    
                if total_res and 'MetricDataResults' in total_res and total_res['MetricDataResults'][0]['Values']:
                    official_total_bill = round(total_res['MetricDataResults'][0]['Values'][0], 2)
                    
            except Exception as cw_err:
                print(f"CloudWatch Billing metrics fetch skipped (expected if billing metrics are disabled or lack IAM ce/billing permissions): {cw_err}")
        
        # Calculate AWS Storage Metrics
        if not aws_key or not aws_secret:
            error_msg = "AWS credentials not fully configured in backend environment (.env)"
        else:
            try:
                s3 = boto3.client(
                    's3',
                    aws_access_key_id=aws_key,
                    aws_secret_access_key=aws_secret,
                    region_name=aws_region
                )
                
                total_size_bytes = 0
                total_objects = 0
                
                paginator = s3.get_paginator('list_objects_v2')
                for page in paginator.paginate(Bucket=bucket_name):
                    if 'Contents' in page:
                        for obj in page['Contents']:
                            total_size_bytes += obj['Size']
                            total_objects += 1
                            
                total_size_gb = total_size_bytes / (1024 ** 3)
                S3_PRICE_PER_GB = float(os.getenv("S3_PRICE_PER_GB", "0.023"))
                estimated_monthly_cost = total_size_gb * S3_PRICE_PER_GB
                
                metrics = {
                    "bucket_name": bucket_name,
                    "region": aws_region,
                    "total_objects": total_objects,
                    "total_size_bytes": total_size_bytes,
                    "total_size_gb": round(total_size_gb, 4),
                    "estimated_monthly_cost_usd": round(estimated_monthly_cost, 4),
                    "pricing_rate_usd_per_gb": S3_PRICE_PER_GB
                }
            except Exception as e:
                error_msg = f"Failed to fetch S3 metrics from AWS API: {str(e)}"
        
        return await self.templates.TemplateResponse(
            request,
            "s3_metrics.html",
            {
                "request": request,
                "metrics": metrics,
                "system_metrics": system_metrics,
                "official_s3_bill": official_s3_bill,
                "official_total_bill": official_total_bill,
                "error": error_msg
            }
        )

# Initialize Admin
admin = Admin(app, engine, templates_dir="templates", authentication_backend=admin_auth)
admin.add_view(UserAdmin)
admin.add_view(PortfolioAdmin)
admin.add_view(ProjectAdmin)
admin.add_view(InquiryAdmin)
admin.add_view(ProjectCommentAdmin)
admin.add_base_view(S3MetricsAdmin)

@app.get("/health")
def health_check():
    return {"status": "awake"}

@app.get("/api/admin/s3-metrics")
def get_s3_metrics(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Calculate S3 bucket storage usage and estimate monthly billing cost in real-time.
    Protected: requires authenticated user."""
    import boto3
    import os
    
    aws_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY")
    bucket_name = os.getenv("AWS_BUCKET_NAME", "sofycode-portfolio-assets")
    aws_region = os.getenv("AWS_REGION", "eu-north-1")
    
    if not aws_key or not aws_secret:
        raise HTTPException(
            status_code=400, 
            detail="AWS credentials not fully configured in backend environment (.env)"
        )
        
    try:
        # Initialize boto3 S3 client
        s3 = boto3.client(
            's3',
            aws_access_key_id=aws_key,
            aws_secret_access_key=aws_secret,
            region_name=aws_region
        )
        
        total_size_bytes = 0
        total_objects = 0
        
        # Paginate S3 objects safely
        paginator = s3.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=bucket_name):
            if 'Contents' in page:
                for obj in page['Contents']:
                    total_size_bytes += obj['Size']
                    total_objects += 1
                    
        total_size_gb = total_size_bytes / (1024 ** 3)
        
        # Standard S3 pricing: $0.023 per GB/month for standard tier
        S3_PRICE_PER_GB = 0.023
        estimated_monthly_cost = total_size_gb * S3_PRICE_PER_GB
        
        return {
            "status": "success",
            "bucket_name": bucket_name,
            "region": aws_region,
            "total_objects": total_objects,
            "total_size_bytes": total_size_bytes,
            "total_size_gb": round(total_size_gb, 4),
            "estimated_monthly_cost_usd": round(estimated_monthly_cost, 4),
            "pricing_rate_usd_per_gb": S3_PRICE_PER_GB
        }
    except Exception as e:
        logger.error(f"S3 metrics error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch S3 metrics from AWS API: {str(e)}"
        )

# NOTE: /debug/test-email route REMOVED for production security

# ── CORS ───────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# If "*" is allowed, we must use allow_origin_regex or reflect origin to work with allow_credentials=True
if "*" in ALLOWED_ORIGINS:
    allow_origins = []
    allow_origin_regex = ".*" # Match everything but satisfy credentials requirement
else:
    allow_origins = ALLOWED_ORIGINS
    allow_origin_regex = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

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

from fastapi.responses import JSONResponse
@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    response = JSONResponse(
        status_code=429,
        content={"detail": "Studio rate limit exceeded. Please wait a moment before trying again."},
    )
    origin = request.headers.get("origin")
    if origin and ("*" in ALLOWED_ORIGINS or origin in ALLOWED_ORIGINS):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.get("/")
def read_root():
    return {"message": "Welcome to the Portfolio SaaS API. The engine is running."}

# --- UTILITIES ---
def validate_password_strength(password: str):
    """Enforce industry-standard password complexity."""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Security key must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="Security key must contain at least one uppercase letter.")
    if not re.search(r"[0-9!@#$%^&*]", password):
        raise HTTPException(status_code=400, detail="Security key must contain at least one number or special character.")

# --- AUTHENTICATION ROUTES ---

@app.post("/signup/request-otp")
@limiter.limit("3/minute")
def request_signup_otp(
    request: Request, 
    background_tasks: BackgroundTasks,
    data: schemas.SignupRequestOTP, 
    db: Session = Depends(get_db)
):
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

    # 4. Send email in background
    subject = "FolioHub — Your Verification Code"
    body = f"Welcome to FolioHub!\n\nYour 6-digit verification code is: {otp}\n\nThis code will expire in 10 minutes. Use it to complete your studio setup."
    background_tasks.add_task(email_utils.send_email, data.email, subject, body)

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
    
    # 3. Security Level Check
    validate_password_strength(user_data.password)

    # 4. Hash and Save
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
def login_for_access_token(
    request: Request, 
    background_tasks: BackgroundTasks,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2FA CHECK
    if user.is_2fa_enabled:
        trusted_device_token = request.cookies.get("trusted_device_token")
        is_trusted = False
        if trusted_device_token:
            import hashlib
            token_hash = hashlib.sha256(trusted_device_token.encode()).hexdigest()
            device_record = db.query(models.TrustedDevice).filter(
                models.TrustedDevice.user_id == user.id,
                models.TrustedDevice.token_hash == token_hash
            ).first()
            if device_record:
                now = datetime.now(timezone.utc)
                expiry = device_record.expires_at
                if expiry.tzinfo is None:
                    expiry = expiry.replace(tzinfo=timezone.utc)
                if expiry > now:
                    is_trusted = True
        
        if not is_trusted:
            return {"access_token": None, "token_type": "bearer", "requires_2fa": True}


    access_token = auth.create_access_token(data={"sub": user.email, "id": user.id})
    return {"access_token": access_token, "token_type": "bearer", "requires_2fa": False}

@app.post("/verify-2fa")
@limiter.limit("5/minute")
def verify_2fa(
    data: schemas.TwoFactorVerify, 
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not user.two_factor_code or not auth.verify_password(data.code, user.two_factor_code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
    
    if data.trust_device:
        import secrets
        import hashlib
        
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        user_agent = request.headers.get("user-agent", "Unknown Device")
        ip_addr = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "Unknown IP")
        
        device_record = models.TrustedDevice(
            user_id=user.id,
            token_hash=token_hash,
            device_name=user_agent[:255] if user_agent else None,
            ip_address=ip_addr[:50] if ip_addr else None,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        db.add(device_record)
        db.commit()
        
        response.set_cookie(
            key="trusted_device_token",
            value=token,
            max_age=30 * 24 * 60 * 60,  # 30 days
            httponly=True,
            secure=True,
            samesite="none"
        )
    
    access_token = auth.create_access_token(data={"sub": user.email, "id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@app.patch("/users/me/email", response_model=schemas.UserResponse)
def update_user_email(data: schemas.UserUpdateEmail, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Re-authenticate before allowing email change
    if not data.current_password or not auth.verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="Current password verification required to change email.")
    
    # Check if new email already exists
    exists = db.query(models.User).filter(models.User.email == data.new_email).first()
    if exists:
        raise HTTPException(status_code=400, detail="This email is already registered to another studio.")
    
    current_user.email = data.new_email
    db.commit()
    db.refresh(current_user)
    return current_user

@app.patch("/users/me/password")
def update_user_password(data: schemas.UserUpdatePassword, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Verify current password
    if not auth.verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="Current password verification failed.")
    
    # Update to new password
    validate_password_strength(data.new_password)
    current_user.hashed_password = auth.get_password_hash(data.new_password)
    db.commit()
    return {"message": "Security key successfully rotated."}

@app.delete("/users/me")
def delete_user_account(data: schemas.UserDelete, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 1. Final verification
    if not auth.verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="Authentication failed. Account deletion aborted.")

    # 2. Collect ALL S3 keys for deletion
    keys_to_delete = []
    
    portfolio = current_user.portfolio
    if portfolio:
        try:
            for project in portfolio.projects:
                if project.media_url: keys_to_delete.append(project.media_url)
                if project.raw_media_url: keys_to_delete.append(project.raw_media_url)
                if project.optimized_url: keys_to_delete.append(project.optimized_url)
                if project.thumbnail_url: keys_to_delete.append(project.thumbnail_url)
                
                # Story media sanity checks
                if project.story:
                    story = project.story
                    # Stages media
                    for stage_media in [story.brief_media, story.storyboard_media, story.rough_cut_media, story.final_media]:
                        if isinstance(stage_media, list):
                            for item in stage_media:
                                if isinstance(item, dict) and item.get('key'):
                                    keys_to_delete.append(item['key'])
                    
                    # Revision media
                    if isinstance(story.revisions_data, list):
                        for round_item in story.revisions_data:
                            if isinstance(round_item, dict) and round_item.get('media'):
                                for m in round_item['media']:
                                    if isinstance(m, dict) and m.get('key'):
                                        keys_to_delete.append(m['key'])
        except Exception as e:
            print(f"Key Collection Warning: {e}")

    # 3. Cleanse S3 (Scrubbing AWS)
    # Remove duplicates
    unique_keys = list(set(keys_to_delete))
    for key in unique_keys:
        if key:
            try:
                s3_utils.delete_file(key)
            except Exception as e:
                print(f"S3 Deletion Skip: {key} - {e}")

    # 4. Wipe Database entries (Atomic Cascade)
    # (Cascading deletes if configured in models, otherwise manual)
    db.delete(current_user)
    db.commit()

    return {"message": "Account and all associated assets have been permanently deleted from the grid."}

@app.get("/users/me/export")
def export_user_data(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """GDPR Right to Portability: Export all user data in JSON format."""
    portfolio = current_user.portfolio
    
    export_data = {
        "user_profile": {
            "email": current_user.email,
            "subscription_tier": current_user.subscription_tier,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "portfolio": None,
        "exported_at": datetime.now(timezone.utc).isoformat()
    }

    if portfolio:
        export_data["portfolio"] = {
            "title": portfolio.title,
            "subdomain": portfolio.subdomain,
            "bio": portfolio.bio,
            "location": portfolio.location,
            "skills": portfolio.skills,
            "theme": portfolio.theme_preference,
            "projects": [
                {
                    "title": p.title,
                    "description": p.description,
                    "category": p.category,
                    "role": p.role,
                    "tools": p.tools_used,
                    "views": p.view_count,
                    "media_url": p.media_url,
                    "created_at": p.created_at.isoformat() if p.created_at else None
                } for p in portfolio.projects
            ],
            "leads": [
                {
                    "from_name": i.name,
                    "from_email": i.email,
                    "details": i.project_details,
                    "date": i.created_at.isoformat() if i.created_at else None
                } for i in portfolio.inquiries
            ]
        }
    
    return export_data

@app.post("/enable-2fa")
def enable_2fa(data: schemas.Enable2FARequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not auth.verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="Authentication failed. Incorrect password.")
    if not data.code or len(data.code) < 4:
        raise HTTPException(status_code=400, detail="PIN/code must be at least 4 characters long.")
    current_user.is_2fa_enabled = True
    current_user.two_factor_code = auth.get_password_hash(data.code)
    db.commit()
    return {"message": "2FA successfully enabled."}

@app.post("/disable-2fa")
def disable_2fa(data: schemas.Disable2FARequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not auth.verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="Authentication failed. Incorrect password.")
    current_user.is_2fa_enabled = False
    current_user.two_factor_code = None
    db.commit()
    return {"message": "2FA successfully disabled."}

@app.post("/edit-2fa")
def edit_2fa(data: schemas.Edit2FARequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not auth.verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="Authentication failed. Incorrect password.")
    if not data.new_code or len(data.new_code) < 4:
        raise HTTPException(status_code=400, detail="PIN/code must be at least 4 characters long.")
    current_user.two_factor_code = auth.get_password_hash(data.new_code)
    db.commit()
    return {"message": "2FA PIN successfully updated."}

@app.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(
    request: Request, 
    background_tasks: BackgroundTasks,
    data: schemas.ForgotPassword, 
    db: Session = Depends(get_db)
):
    """Step 1: Generate a 6-digit OTP and email it to the user."""
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        # Return success even if user doesn't exist to prevent email enumeration
        return {"message": "If an account with that email exists, a verification code has been dispatched."}

    # Generate a cryptographically-adequate 6-digit OTP
    otp = f"{random.SystemRandom().randint(0, 999999):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    user.reset_otp = otp
    user.reset_otp_expires_at = expires_at
    db.commit()

    # Send the OTP via email in background
    background_tasks.add_task(email_utils.send_otp_email, data.email, otp)

    return {"message": "Verification code dispatched to your studio email."}


@app.post("/verify-otp")
@limiter.limit("5/minute")
def verify_otp(request: Request, data: schemas.VerifyOTP, db: Session = Depends(get_db)):
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
@limiter.limit("5/minute")
def reset_password_otp(request: Request, data: schemas.ResetPasswordOTP, db: Session = Depends(get_db)):
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
    validate_password_strength(data.new_password)
    user.hashed_password = auth.get_password_hash(data.new_password)
    user.reset_otp = None
    user.reset_otp_expires_at = None
    db.commit()
    return {"message": "Password has been successfully reset. You may now log in."}

@app.post("/upload/initiate")
def initiate_upload(data: schemas.MultipartInitiate, current_user: models.User = Depends(get_current_user)):
    """Initiate a multi-stage upload session for large cinematic files."""
    return s3_utils.initiate_multipart_upload(data.file_name, data.file_type)

@app.get("/upload/presign-part")
def presign_part(object_key: str, upload_id: str, part_number: int, current_user: models.User = Depends(get_current_user)):
    """Generate a high-security temporary signature for a specific video chunk."""
    url = s3_utils.generate_presigned_part_url(object_key, upload_id, part_number)
    return {"url": url}

@app.post("/upload/complete")
def complete_upload(data: schemas.MultipartComplete, current_user: models.User = Depends(get_current_user)):
    """Instruct S3 to assemble all uploaded chunks into a finalized master file."""
    parts_dicts = [p.model_dump() for p in data.parts]
    success = s3_utils.complete_multipart_upload(data.object_key, data.upload_id, parts_dicts)
    if not success:
        raise HTTPException(status_code=400, detail="Media assembly failed. Network fragments may be missing.")
    return {"message": "Cinematic master assembled successfully."}

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
    
    # SAAS SECURITY: Verify premium status for custom domains
    if 'custom_domain' in update_dict and update_dict['custom_domain']:
        if current_user.subscription_tier != 'premium':
            raise HTTPException(status_code=403, detail="Custom domain mapping is a Premium feature. Please upgrade your plan.")
        
        # Normalize the domain: strip protocol, whitespace, trailing slash, lowercase
        raw = update_dict['custom_domain']
        clean = raw.strip().lower().replace("https://", "").replace("http://", "").replace("www.", "").rstrip("/")
        update_dict['custom_domain'] = clean
        
        # Check for duplicate domain mapping
        existing = db.query(models.Portfolio).filter(
            models.Portfolio.custom_domain == clean,
            models.Portfolio.id != portfolio.id
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"The domain '{clean}' is already mapped to another portfolio.")

    for key, value in update_dict.items():
        setattr(portfolio, key, value)
        
    db.commit()
    db.refresh(portfolio)
    return portfolio

@app.get("/portfolios", response_model=list[schemas.PortfolioResponse])
def get_all_portfolios(db: Session = Depends(get_db)):
    # Discovery of editors
    portfolios = db.query(models.Portfolio).all()
    return portfolios

@app.post("/portfolios/match", response_model=list[schemas.MatchResult])
def match_portfolios(request: schemas.MatchRequest, db: Session = Depends(get_db)):
    """The Matchmaker Engine: Semantic keyword scoring for creator discovery."""
    query = request.reference_text.lower()
    portfolios = db.query(models.Portfolio).all()
    results = []

    for p in portfolios:
        score = 0
        reasons = []
        
        # 1. Check Skills (High Weight)
        if p.skills:
            skills_list = [s.strip().lower() for s in p.skills.split(',')]
            for s in skills_list:
                if s in query:
                    score += 40
                    reasons.append(f"Mastery in {s}")
        
        # 2. Check Bio
        if p.bio and any(word in p.bio.lower() for word in query.split()):
            score += 20
            reasons.append("Clinical profile match")
            
        # 3. Check Projects (Visual Proof)
        project_hits = 0
        for project in p.projects:
            proj_text = (project.title + " " + (project.description or "")).lower()
            if any(word in proj_text for word in query.split()):
                project_hits += 1
        
        if project_hits > 0:
            score += min(project_hits * 10, 40)
            reasons.append(f"Visual proof in {project_hits} project(s)")

        if score > 0:
            results.append({
                "portfolio": p,
                "match_score": min(score, 100),
                "match_reason": " • ".join(reasons[:2])
            })

    # Sort by score descending
    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results
    
    

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
    thumbnail: UploadFile = File(None),
    media_key: str = Form(None), # New: Direct S3 keys
    raw_media_key: str = Form(None),
    project_file_key: str = Form(None),
    thumbnail_key: str = Form(None),
    metric_views: str = Form(None),
    metric_retention: str = Form(None),
    metric_ctr: str = Form(None),
    metric_watch_time: str = Form(None),
    metric_likes: str = Form(None),
    metric_comments: str = Form(None),
    source_link: str = Form(None),
    client_goals: str = Form(None),
    strategy_notes: str = Form(None),
    monetization_results: str = Form(None),
    tags: str = Form(None),
    status: str = Form("published"),
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
    print(f"DEBUG: Processing Project Creation. media_key='{media_key}', raw_media_key='{raw_media_key}'")
    
    if media_key and media_key != "undefined":
        config = s3_utils.get_config()
        file_url = f"https://{config['bucket']}.s3.{config['region']}.amazonaws.com/{media_key}"
    elif file:
        file_url = s3_utils.upload_file_to_s3(file.file, file.filename)
    
    if not file_url:
        print("ERROR: Project creation aborted. No valid media_url resolved.")
        raise HTTPException(status_code=400, detail="Either a file or a valid media_key must be provided.")
        
    print(f"SUCCESS: Resolved media_url='{file_url}'")

    project_file_url = None
    if project_file_key and project_file_key != "undefined":
        config = s3_utils.get_config()
        try:
            keys = json.loads(project_file_key)
            if isinstance(keys, list):
                project_file_url = json.dumps([f"https://{config['bucket']}.s3.{config['region']}.amazonaws.com/{k}" for k in keys])
            else:
                project_file_url = f"https://{config['bucket']}.s3.{config['region']}.amazonaws.com/{project_file_key}"
        except:
            project_file_url = f"https://{config['bucket']}.s3.{config['region']}.amazonaws.com/{project_file_key}"
    elif project_file:
        project_file_url = s3_utils.upload_file_to_s3(project_file.file, project_file.filename)
        
    raw_media_url = None
    if raw_media_key and raw_media_key != "undefined":
        config = s3_utils.get_config()
        raw_media_url = f"https://{config['bucket']}.s3.{config['region']}.amazonaws.com/{raw_media_key}"
    elif raw_file:
        raw_media_url = s3_utils.upload_file_to_s3(raw_file.file, raw_file.filename)
        
    thumbnail_url = None
    if thumbnail_key and thumbnail_key != "undefined":
        config = s3_utils.get_config()
        thumbnail_url = f"https://{config['bucket']}.s3.{config['region']}.amazonaws.com/{thumbnail_key}"
    elif thumbnail:
        thumbnail_url = s3_utils.upload_file_to_s3(thumbnail.file, thumbnail.filename)

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
        thumbnail_url=thumbnail_url,
        timeline_breakdown=timeline_breakdown,
        project_file_url=project_file_url,
        is_verified=is_verified,
        metric_views=metric_views,
        metric_retention=metric_retention,
        metric_ctr=metric_ctr,
        metric_watch_time=metric_watch_time,
        metric_likes=metric_likes,
        metric_comments=metric_comments,
        source_link=source_link,
        client_goals=client_goals,
        strategy_notes=strategy_notes,
        monetization_results=monetization_results,
        tags=tags,
        status=status
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
    
    # Clean up S3 assets to prevent orphaned files
    for url_field in [project.media_url, project.raw_media_url, project.optimized_url, project.thumbnail_url]:
        if url_field:
            try:
                s3_utils.delete_file(url_field)
            except Exception as e:
                logger.warning(f"S3 cleanup skip: {e}")
    
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}


@app.post("/projects/{project_id}/comments", response_model=schemas.ProjectCommentResponse)
def create_project_comment(
    project_id: int,
    comment: schemas.ProjectCommentCreate,
    db: Session = Depends(get_db)
):
    # Public route, anyone with the draft link can comment
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if project.portfolio.owner.subscription_tier != 'premium':
        raise HTTPException(status_code=403, detail="Client Review Room is a Premium feature. The portfolio owner must upgrade their plan.")
        
    new_comment = models.ProjectComment(
        project_id=project_id,
        timestamp=comment.timestamp,
        text=comment.text,
        author_name=comment.author_name
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment

@app.get("/projects/{project_id}/comments", response_model=list[schemas.ProjectCommentResponse])
def get_project_comments(
    project_id: int,
    db: Session = Depends(get_db)
):
    # Public route, anyone with the draft link can see comments
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if project.portfolio.owner.subscription_tier != 'premium':
        raise HTTPException(status_code=403, detail="Client Review Room is a Premium feature. The portfolio owner must upgrade their plan.")

    comments = db.query(models.ProjectComment).filter(models.ProjectComment.project_id == project_id).all()
    return comments

@app.put("/comments/{comment_id}", response_model=schemas.ProjectCommentResponse)
def update_comment(
    comment_id: int,
    update: schemas.ProjectCommentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    comment = db.query(models.ProjectComment).filter(models.ProjectComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    # Verify the comment belongs to a project owned by this user
    project = comment.project
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == project.portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=403, detail="Access denied")
    if update.text is not None:
        comment.text = update.text
    if update.is_resolved is not None:
        comment.is_resolved = update.is_resolved
    db.commit()
    db.refresh(comment)
    return comment

@app.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    comment = db.query(models.ProjectComment).filter(models.ProjectComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    # Verify the comment belongs to a project owned by this user
    project = comment.project
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == project.portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted successfully"}

# Editor endpoint: get all comments across all their projects
@app.get("/my-reviews")
def get_my_reviews(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).first()
    if not portfolio:
        return []
    
    if current_user.subscription_tier != 'premium':
        return []
    
    projects = db.query(models.Project).filter(models.Project.portfolio_id == portfolio.id).all()
    if not projects:
        return []

    project_ids = [p.id for p in projects]
    all_comments = db.query(models.ProjectComment).filter(
        models.ProjectComment.project_id.in_(project_ids),
        models.ProjectComment.is_draft == False
    ).order_by(models.ProjectComment.created_at.desc()).all()

    # Map comments to their respective projects in memory to avoid N+1 query loops
    comments_by_project = {}
    for c in all_comments:
        comments_by_project.setdefault(c.project_id, []).append(c)

    result = []
    for project in projects:
        comments = comments_by_project.get(project.id, [])
        if comments or project.status in ["needs_revision", "approved", "under_review", "review_needed"]:
            result.append({
                "project_id": project.id,
                "project_title": project.title,
                "project_status": project.status or "published",
                "thumbnail_url": project.thumbnail_url,
                "comments": [
                    {
                        "id": c.id,
                        "project_id": c.project_id,
                        "timestamp": c.timestamp,
                        "text": c.text,
                        "author_name": c.author_name,
                        "is_resolved": c.is_resolved,
                        "created_at": c.created_at.isoformat() if c.created_at else None,
                    }
                    for c in comments
                ]
            })
    return result

@app.delete("/projects/{project_id}/comments")
def clear_project_comments(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = _get_project_for_user(project_id, current_user, db)
    db.query(models.ProjectComment).filter(models.ProjectComment.project_id == project_id).delete()
    project.status = "published"
    project.recorrections_used = 0
    db.commit()
    return {"message": "All project comments cleared successfully and status reset to published."}

@app.delete("/my-reviews/clear-all")
def clear_all_review_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    projects = db.query(models.Project).filter(models.Project.portfolio_id == portfolio.id).all()
    project_ids = [p.id for p in projects]
    
    db.query(models.ProjectComment).filter(models.ProjectComment.project_id.in_(project_ids)).delete(synchronize_session=False)
    
    for project in projects:
        project.status = "published"
        project.recorrections_used = 0
        
    db.commit()
    return {"message": "All review histories cleared successfully across all projects."}

@app.post("/comments/bulk-delete")
def bulk_delete_comments(
    req: schemas.BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
        
    projects = db.query(models.Project).filter(models.Project.portfolio_id == portfolio.id).all()
    project_ids = {p.id for p in projects}
    
    comments = db.query(models.ProjectComment).filter(models.ProjectComment.id.in_(req.comment_ids)).all()
    for comment in comments:
        if comment.project_id not in project_ids:
            raise HTTPException(status_code=403, detail="Access denied")
            
    db.query(models.ProjectComment).filter(models.ProjectComment.id.in_(req.comment_ids)).delete(synchronize_session=False)
    db.commit()
    return {"message": "Selected comments deleted successfully."}

# Public endpoint: client can approve or request changes from review page
@app.put("/projects/{project_id}/status")
def update_project_status(
    project_id: int,
    status_update: dict,
    db: Session = Depends(get_db)
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if project.portfolio.owner.subscription_tier != 'premium':
        raise HTTPException(status_code=403, detail="Client Review Room is a Premium feature. The portfolio owner must upgrade their plan.")
    new_status = status_update.get("status")
    if new_status not in ["draft", "needs_revision", "approved", "published", "under_review", "review_needed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    if new_status == "needs_revision":
        # Ensure we don't exceed the max recorrections limit
        max_recs = project.max_recorrections if project.max_recorrections is not None else 3
        used_recs = project.recorrections_used if project.recorrections_used is not None else 0
        if used_recs >= max_recs:
            raise HTTPException(status_code=400, detail="No remaining recorrections available according to the editor's recorrection policy.")
        project.recorrections_used = used_recs + 1

        # Publish all draft comments!
        db.query(models.ProjectComment).filter(
            models.ProjectComment.project_id == project_id,
            models.ProjectComment.is_draft == True
        ).update({"is_draft": False})

    project.status = new_status
    db.commit()
    return {"message": f"Status updated to {new_status}", "status": new_status, "recorrections_used": project.recorrections_used}

@app.get("/projects/{project_id}", response_model=schemas.ProjectResponse)
def get_single_project(
    project_id: int,
    db: Session = Depends(get_db)
):
    # Public route for draft review links
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.get("/portfolios/{subdomain}/projects", response_model=list[schemas.ProjectResponse])
def get_portfolio_projects(subdomain: str, db: Session = Depends(get_db)):
    # This is a PUBLIC route so anyone visiting the creator's portfolio can see their work!
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.subdomain == subdomain).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    projects = portfolio.projects
    is_premium = portfolio.owner.subscription_tier == "premium"

    # SAAS LOGIC: If not premium, mask the master media_url with the optimized one
    # This enforces "Standard Quality" for free users
    if not is_premium:
        for p in projects:
            if p.optimized_url:
                p.media_url = p.optimized_url
                
    return projects
    
@app.get("/portfolios/view/{subdomain}", response_model=schemas.PortfolioResponse)
def get_public_portfolio(subdomain: str, db: Session = Depends(get_db)):
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.subdomain == subdomain).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Track view
    portfolio.view_count = (portfolio.view_count or 0) + 1
    db.commit()
    db.refresh(portfolio)

    # Map subscription tier from owner to response
    portfolio.subscription_tier = portfolio.owner.subscription_tier
    
    return portfolio

@app.get("/portfolios/by-domain/{domain}", response_model=schemas.PortfolioResponse)
def get_portfolio_by_custom_domain(domain: str, db: Session = Depends(get_db)):
    """Resolve a portfolio by its custom domain (e.g., chanuka.com).
    Used by the frontend middleware to serve portfolios on custom domains."""
    # Normalize: strip protocol prefixes, trailing slashes, whitespace
    clean_domain = domain.strip().lower().replace("https://", "").replace("http://", "").rstrip("/")
    
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.custom_domain == clean_domain
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio is mapped to this domain.")
    
    # Verify the owner is still on premium (domain could've been set before downgrade)
    if portfolio.owner.subscription_tier != "premium":
        raise HTTPException(status_code=403, detail="Custom domain is inactive. The portfolio owner's premium subscription has expired.")
    
    # Track view
    portfolio.view_count = (portfolio.view_count or 0) + 1
    db.commit()
    db.refresh(portfolio)

    # Map subscription tier from owner to response
    portfolio.subscription_tier = portfolio.owner.subscription_tier
    
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

def get_paypal_access_token() -> str:
    """Helper to fetch a PayPal OAuth2 access token."""
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="PayPal credentials are not configured on the server."
        )
    url = f"{PAYPAL_API_BASE}/v1/oauth2/token"
    headers = {
        "Accept": "application/json",
        "Accept-Language": "en_US",
    }
    data = {
        "grant_type": "client_credentials"
    }
    response = requests.post(
        url,
        headers=headers,
        data=data,
        auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
        timeout=10
    )
    if response.status_code != 200:
        logger.error(f"PayPal Token Error: {response.text}")
        raise HTTPException(
            status_code=500,
            detail="Failed to authenticate with PayPal."
        )
    return response.json().get("access_token")

@app.post("/create-checkout-session")
def create_checkout_session(current_user: models.User = Depends(get_current_user)):
    try:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        token = get_paypal_access_token()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }

        # If a PayPal Plan ID is configured, create a Subscription
        if PAYPAL_PLAN_ID:
            url = f"{PAYPAL_API_BASE}/v1/billing/subscriptions"
            payload = {
                "plan_id": PAYPAL_PLAN_ID,
                "application_context": {
                    "brand_name": "Foliohub",
                    "user_action": "SUBSCRIBE_NOW",
                    "return_url": f"{frontend_url}/dashboard?paypal_status=success",
                    "cancel_url": f"{frontend_url}/dashboard?paypal_status=cancel",
                }
            }
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code not in (200, 201):
                logger.error(f"PayPal Subscription Error: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to create PayPal subscription.")
            
            res_data = response.json()
            approval_url = next(link["href"] for link in res_data["links"] if link["rel"] == "approve")
            return {"url": approval_url, "id": res_data["id"]}
        
        # Fallback: Create a $5.00 one-time Order
        else:
            url = f"{PAYPAL_API_BASE}/v2/checkout/orders"
            payload = {
                "intent": "CAPTURE",
                "purchase_units": [{
                    "amount": {
                        "currency_code": "USD",
                        "value": "5.00"
                    },
                    "description": "Foliohub Premium Upgrade"
                }],
                "application_context": {
                    "brand_name": "Foliohub",
                    "user_action": "PAY_NOW",
                    "return_url": f"{frontend_url}/dashboard?paypal_status=success",
                    "cancel_url": f"{frontend_url}/dashboard?paypal_status=cancel",
                }
            }
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code not in (200, 201):
                logger.error(f"PayPal Order Error: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to create PayPal order.")
            
            res_data = response.json()
            approval_url = next(link["href"] for link in res_data["links"] if link["rel"] == "approve")
            return {"url": approval_url, "id": res_data["id"]}

    except Exception as e:
        logger.error(f"PayPal Session Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate premium checkout.")

@app.get("/verify-session/{session_id}")
def verify_session(session_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        token = get_paypal_access_token()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }

        # Check if the session_id is a subscription ID (usually starts with I-)
        is_subscription = session_id.startswith("I-")

        if is_subscription:
            url = f"{PAYPAL_API_BASE}/v1/billing/subscriptions/{session_id}"
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                res_data = response.json()
                if res_data.get("status") in ("ACTIVE", "APPROVED"):
                    current_user.subscription_tier = "premium"
                    current_user.paypal_subscription_id = session_id
                    db.commit()
                    return {"status": "premium"}
        else:
            # It's an Order ID, let's capture it if it isn't already captured
            url = f"{PAYPAL_API_BASE}/v2/checkout/orders/{session_id}"
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                order_data = response.json()
                status = order_data.get("status")
                
                # If approved, capture it
                if status == "APPROVED":
                    capture_url = f"{PAYPAL_API_BASE}/v2/checkout/orders/{session_id}/capture"
                    cap_response = requests.post(capture_url, headers=headers, timeout=10)
                    if cap_response.status_code in (200, 201):
                        order_data = cap_response.json()
                        status = order_data.get("status")
                
                if status == "COMPLETED":
                    current_user.subscription_tier = "premium"
                    current_user.paypal_subscription_id = session_id
                    db.commit()
                    return {"status": "premium"}

        return {"status": current_user.subscription_tier or "free"}
    except Exception as e:
        logger.error(f"PayPal Session Verification Error: {e}")
        return {"status": current_user.subscription_tier or "free"}

from fastapi import Request

@app.post("/webhook/paypal")
async def paypal_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        payload = await request.json()
        event_type = payload.get("event_type")
        resource = payload.get("resource", {})
        
        logger.info(f"Received PayPal Webhook: {event_type}")

        if event_type == "BILLING.SUBSCRIPTION.CANCELLED":
            subscription_id = resource.get("id")
            if subscription_id:
                user = db.query(models.User).filter(models.User.paypal_subscription_id == subscription_id).first()
                if user:
                    user.subscription_tier = "free"
                    db.commit()
                    logger.info(f"🛑 User {user.email} downgraded to Free (Subscription Cancelled).")

        elif event_type == "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
            subscription_id = resource.get("id")
            if subscription_id:
                user = db.query(models.User).filter(models.User.paypal_subscription_id == subscription_id).first()
                if user:
                    user.subscription_tier = "free"
                    db.commit()
                    logger.info(f"🛑 User {user.email} downgraded to Free (Payment Failed).")

        return {"status": "success"}
    except Exception as e:
        logger.error(f"PayPal Webhook Error: {e}")
        return {"status": "ignored"}
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


def _refresh_media_item_url(item: dict) -> dict:
    """Regenerate a fresh presigned URL for a single media item using its stored key."""
    key = item.get("key", "")
    if not key:
        return item
    config = s3_utils.get_config()
    full_url = f"https://{config['bucket']}.s3.{config['region']}.amazonaws.com/{key}"
    fresh_url = s3_utils.get_presigned_url(full_url)
    return {**item, "url": fresh_url}


def _refresh_story_urls(story: models.ProjectStory) -> models.ProjectStory:
    """
    Walk all media lists in a story and replace stored (possibly-expired) presigned
    URLs with fresh ones.  The `key` field is always the bare S3 object key and is
    used as the authoritative source of truth.
    """
    try:
        for field in ("brief_media", "storyboard_media", "rough_cut_media", "final_media"):
            items = getattr(story, field) or []
            if items:
                setattr(story, field, [_refresh_media_item_url(it) for it in items])

        rev_data = story.revisions_data or []
        if rev_data:
            refreshed_revs = []
            for rev in rev_data:
                refreshed_media = [_refresh_media_item_url(m) for m in rev.get("media", [])]
                refreshed_revs.append({**rev, "media": refreshed_media})
            story.revisions_data = refreshed_revs
    except Exception as e:
        print(f"Warning: Could not refresh story URLs: {e}")
    return story


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

    # Always return fresh presigned URLs so the frontend can render media immediately
    return _refresh_story_urls(story)


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
    return _refresh_story_urls(story)


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
        
        # Upload to S3 — upload_file_to_s3 returns the full public URL
        file_url = s3_utils.upload_file_to_s3(file.file, file.filename)
        if not file_url:
            raise HTTPException(status_code=500, detail="Upload to cloud storage failed.")
        s3_key = file_url.split(".amazonaws.com/")[-1]
    
    if not s3_key:
        raise HTTPException(status_code=400, detail="Either a file or a direct_key must be provided.")

    # Build the full URL from the key so get_presigned_url can sign it correctly
    config = s3_utils.get_config()
    full_url = f"https://{config['bucket']}.s3.{config['region']}.amazonaws.com/{s3_key}"
    presigned = s3_utils.get_presigned_url(full_url)
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


# ─────────────────────────────────────────────────────────────────────────────
# STYLE FINGERPRINT ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

def _run_fingerprint_background(portfolio_id: int):
    """Background task: compute fingerprint from all published videos."""
    from database import SessionLocal
    import fingerprint_utils

    db = SessionLocal()
    try:
        portfolio = db.query(models.Portfolio).filter(models.Portfolio.id == portfolio_id).first()
        if not portfolio:
            return

        video_urls = []
        for project in portfolio.projects:
            if project.is_published and project.media_url:
                try:
                    signed = s3_utils.get_presigned_url(project.media_url)
                    if signed:
                        video_urls.append(signed)
                except Exception:
                    pass
            if project.is_published and project.optimized_url:
                try:
                    signed = s3_utils.get_presigned_url(project.optimized_url)
                    if signed:
                        video_urls.append(signed)
                except Exception:
                    pass

        if not video_urls:
            return

        fingerprint = fingerprint_utils.compute_fingerprint(video_urls)
        if fingerprint:
            portfolio.style_fingerprint = fingerprint
            portfolio.fingerprint_computed_at = datetime.now(timezone.utc)
            db.commit()
            print(f"[fingerprint] Portfolio {portfolio_id} done: {fingerprint['style_tags']}")
    except Exception as e:
        print(f"[fingerprint] Error for portfolio {portfolio_id}: {e}")
    finally:
        db.close()


@app.post("/portfolio/fingerprint/compute")
def trigger_fingerprint_computation(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Trigger a style fingerprint computation for the current user's portfolio."""
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    published_videos = [p for p in portfolio.projects if p.is_published and p.media_url]
    if not published_videos:
        raise HTTPException(status_code=400, detail="No published videos to analyse. Upload at least one project first.")

    background_tasks.add_task(_run_fingerprint_background, portfolio.id)
    return {
        "message": "Style fingerprint analysis initiated. This may take 30–90 seconds depending on your library.",
        "videos_queued": len(published_videos)
    }


@app.get("/portfolio/fingerprint")
def get_my_fingerprint(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve the current user's style fingerprint."""
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if not portfolio.style_fingerprint:
        return {"fingerprint": None, "computed_at": None, "message": "No fingerprint computed yet."}

    return {
        "fingerprint": portfolio.style_fingerprint,
        "computed_at": portfolio.fingerprint_computed_at,
        "portfolio_title": portfolio.title,
    }


@app.get("/portfolios/fingerprint/{subdomain}")
def get_public_fingerprint(subdomain: str, db: Session = Depends(get_db)):
    """Public endpoint — return the style fingerprint for a portfolio page."""
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.subdomain == subdomain).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if not portfolio.style_fingerprint:
        return {"fingerprint": None}

    return {
        "fingerprint": portfolio.style_fingerprint,
        "computed_at": portfolio.fingerprint_computed_at,
        "portfolio_title": portfolio.title,
    }



