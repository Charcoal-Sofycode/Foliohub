from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from auth import get_current_user
from fastapi import File, UploadFile, Form

import s3_utils # Import your new S3 logic

# Import our files
import models, schemas, auth
from database import get_db, engine
import os
import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

app = FastAPI(title="Portfolio SaaS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Portfolio SaaS API. The engine is running."}

# --- AUTHENTICATION ROUTES ---

@app.post("/signup", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Check if the email already exists in Supabase
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Hash the password
    hashed_password = auth.get_password_hash(user.password)
    
    # 3. Create the new user and save to database
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@app.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2FA CHECK
    if user.is_2fa_enabled:
        import random
        # Generate a fake 6-digit code for testing (in reality send via email/sms)
        code = str(random.randint(100000, 999999))
        user.two_factor_code = code
        db.commit()
        print(f"--- 2FA CODE FOR {user.email}: {code} ---")
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
def forgot_password(data: schemas.ForgotPassword, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    import uuid
    if user:
        reset_token = str(uuid.uuid4())
        user.reset_token = reset_token
        db.commit()
        print(f"--- RESET TOKEN FOR {user.email}: {reset_token} ---")
    # Always return 200 for security
    return {"message": "If that email exists, a reset link has been sent."}

@app.post("/reset-password")
def reset_password(data: schemas.ResetPassword, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or user.reset_token != data.token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    user.hashed_password = auth.get_password_hash(data.new_password)
    user.reset_token = None
    db.commit()
    return {"message": "Password has been successfully reset."}

@app.get("/users/me")
def get_user_me(current_user: models.User = Depends(get_current_user)):
    return {"subscription_tier": current_user.subscription_tier or "free"}

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
    title: str = Form(...),
    description: str = Form(None),
    project_type: str = Form("video"),
    role: str = Form(None),
    tools_used: str = Form(None),
    category: str = Form("general"),
    timeline_breakdown: str = Form(None),
    file: UploadFile = File(...),
    raw_file: UploadFile = File(None),
    project_file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # Locked to logged-in users
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

    # 2. Upload the file to AWS S3
    file_url = s3_utils.upload_file_to_s3(file.file, file.filename)
    
    if not file_url:
        raise HTTPException(status_code=500, detail="Failed to upload media to cloud storage.")
        
    project_file_url = None
    if project_file:
        project_file_url = s3_utils.upload_file_to_s3(project_file.file, project_file.filename)
        
    raw_media_url = None
    if raw_file:
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
    
    return new_project

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
            success_url='http://localhost:3000/dashboard?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='http://localhost:3000/dashboard',
            client_reference_id=str(current_user.id)
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import Request

@app.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    # In production, specify the endpoint secret here
    # endpoint_secret = 'whsec_...'
    # event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    
    try:
        import json
        event = stripe.Event.construct_from(
            json.loads(payload), stripe.api_key
        )
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