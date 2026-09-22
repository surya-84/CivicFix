from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
import bcrypt
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
import secrets
import urllib.parse
import requests

from database import get_db
import models
import schemas
import config

router = APIRouter()

SECRET_KEY               = config.SECRET_KEY
ALGORITHM                = config.ALGORITHM
ACCESS_TOKEN_EXPIRE_DAYS = config.ACCESS_TOKEN_EXPIRE_DAYS

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire    = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user_optional(
    request: Request,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    token = None
    # 1. Prefer Authorization Bearer header
    if auth and auth.credentials:
        token = auth.credentials
    # 2. Fallback to secure HttpOnly session cookie (for OAuth sessions)
    elif request and request.cookies.get("civicfix_session"):
        token = request.cookies.get("civicfix_session")

    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        user = db.query(models.User).filter(models.User.id == int(user_id_str)).first()
        return user
    except (JWTError, ValueError):
        return None


def get_current_user(
    request: Request,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> models.User:
    user = get_current_user_optional(request, auth, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_role(*allowed_roles: str):
    def role_checker(current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}",
            )
        return current_user
    return role_checker


@router.post("/register", response_model=schemas.Token)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.phone == user.phone).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")

    db_user = models.User(
        name          = user.name,
        phone         = user.phone,
        email         = user.email,
        role          = user.role,
        password_hash = hash_password(user.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    token = create_access_token({"sub": str(db_user.id), "role": db_user.role})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user_id":      db_user.id,
        "name":         db_user.name,
        "role":         db_user.role,
    }


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    ident = (credentials.login_id or credentials.phone or "").strip()
    if not ident:
        raise HTTPException(status_code=400, detail="Mobile number, Email, Worker ID, or Admin ID required")

    # Look up by phone number OR email OR worker_code OR admin_code
    user = db.query(models.User).filter(
        (models.User.phone == ident) | 
        (models.User.email == ident) |
        (models.User.worker_code == ident) |
        (models.User.admin_code == ident)
    ).first()

    if not user:
        # Check if there is an unapproved volunteer application for this phone or email
        vol = db.query(models.VolunteerApplication).filter(
            (models.VolunteerApplication.phone == ident) |
            (models.VolunteerApplication.email == ident)
        ).first()
        if vol:
            if vol.status == "pending":
                raise HTTPException(
                    status_code=403,
                    detail=f"Application {vol.application_id} is PENDING municipal review. Your Worker ID will be activated upon admin approval.",
                )
            elif vol.status == "rejected":
                raise HTTPException(
                    status_code=403,
                    detail=f"Volunteer application {vol.application_id} was rejected: {vol.admin_notes or 'Does not meet current requirements'}.",
                )
        raise HTTPException(status_code=401, detail="Invalid Employee ID / Admin ID / phone number or password")

    if user.is_active is False:
        raise HTTPException(
            status_code=403,
            detail="Your administrator account has been disabled. Please contact the Super Admin.",
        )

    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid Employee ID / Admin ID / phone number or password")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token":         token,
        "token_type":           "bearer",
        "user_id":              user.id,
        "name":                 user.name,
        "role":                 user.role,
        "worker_code":          user.worker_code,
        "admin_code":           user.admin_code,
        "admin_level":          user.admin_level,
        "must_change_password": bool(user.must_change_password),
        "permissions":          [p.strip() for p in user.permissions.split(",")] if user.permissions else [],
    }


@router.post("/change-password")
def change_password(
    payload:      schemas.AdminChangePassword,
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Allows any authenticated user (especially newly generated Co-Admins)
    to update their temporary password to a permanent personal password.
    """
    if not verify_password(payload.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current / temporary password is incorrect.")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    if payload.old_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password.")

    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_change_password = False

    # Log action if admin
    if current_user.role == "admin":
        audit = models.AdminAuditLog(
            admin_id    = current_user.id,
            admin_code  = current_user.admin_code or "ADMIN",
            admin_name  = current_user.name,
            action      = "CHANGE_PASSWORD",
            target_type = "ADMIN",
            target_id   = current_user.admin_code,
            details     = f"Admin {current_user.name} ({current_user.admin_code}) successfully updated account password.",
        )
        db.add(audit)

    db.commit()
    db.refresh(current_user)

    return {
        "message":              "Password updated successfully.",
        "must_change_password": False,
    }


@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {
        "user_id":              current_user.id,
        "name":                 current_user.name,
        "phone":                current_user.phone,
        "email":                current_user.email,
        "role":                 current_user.role,
        "profile_picture":      current_user.profile_picture,
        "auth_provider":        current_user.auth_provider or "local",
        "admin_code":           current_user.admin_code,
        "admin_level":          current_user.admin_level,
        "must_change_password": bool(current_user.must_change_password),
        "permissions":          [p.strip() for p in current_user.permissions.split(",")] if current_user.permissions else [],
        "is_profile_complete":  bool(current_user.is_profile_complete),
    }


# ===========================================================================
# GOOGLE OAUTH 2.0 & SECURE SESSION ENDPOINTS
# ===========================================================================

@router.get("/google/config")
def get_google_config():
    """
    Returns public Google OAuth status for frontend conditional rendering.
    Never exposes client secret.
    """
    return {
        "enabled": config.GOOGLE_OAUTH_CONFIGURED,
        "client_id": config.GOOGLE_CLIENT_ID if config.GOOGLE_OAUTH_CONFIGURED else "",
    }


@router.get("/google")
def google_auth_redirect(request: Request):
    """
    Initiates Google OAuth 2.0 flow.
    Generates a cryptographically secure anti-CSRF state token,
    sets a short-lived HttpOnly cookie, and redirects user to Google.
    """
    if not config.GOOGLE_CLIENT_ID or config.GOOGLE_CLIENT_ID.startswith("your_"):
        return RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=not_configured")

    state = secrets.token_urlsafe(32)

    params = {
        "client_id": config.GOOGLE_CLIENT_ID,
        "redirect_uri": config.GOOGLE_CALLBACK_URL,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)

    redirect_res = RedirectResponse(url=auth_url)
    redirect_res.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        max_age=300,
        samesite="lax",
        secure=config.IS_PRODUCTION,
        path="/api/auth",
    )
    return redirect_res


@router.get("/google/callback")
def google_auth_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Google OAuth 2.0 Callback Handler.
    Validates state, exchanges code for Google tokens, verifies Google identity,
    executes secure account linking, issues CivicFix JWT, and sets an HttpOnly cookie.
    NEVER places tokens or secrets in the browser URL.
    """
    # 1. Check if user cancelled
    if error:
        res = RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=cancelled")
        res.delete_cookie("oauth_state", path="/api/auth")
        return res

    if not code:
        res = RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=error&error_type=missing_code")
        res.delete_cookie("oauth_state", path="/api/auth")
        return res

    # 2. CSRF State validation
    cookie_state = request.cookies.get("oauth_state")
    if not cookie_state or cookie_state != state:
        res = RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=error&error_type=state_mismatch")
        res.delete_cookie("oauth_state", path="/api/auth")
        return res

    # 3. Exchange code for Google access token
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "client_id": config.GOOGLE_CLIENT_ID,
        "client_secret": config.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": config.GOOGLE_CALLBACK_URL,
    }

    try:
        t_res = requests.post(token_url, data=token_data, timeout=12)
        t_json = t_res.json()
        google_access_token = t_json.get("access_token")
        if t_res.status_code != 200 or not google_access_token:
            res = RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=error&error_type=token_exchange_failed")
            res.delete_cookie("oauth_state", path="/api/auth")
            return res
    except Exception:
        res = RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=error&error_type=network_error")
        res.delete_cookie("oauth_state", path="/api/auth")
        return res

    # 4. Fetch Google User Profile (Authoritative)
    userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
    try:
        u_res = requests.get(
            userinfo_url,
            headers={"Authorization": f"Bearer {google_access_token}"},
            timeout=10,
        )
        if u_res.status_code != 200:
            res = RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=error&error_type=userinfo_failed")
            res.delete_cookie("oauth_state", path="/api/auth")
            return res
        u_info = u_res.json()
    except Exception:
        res = RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=error&error_type=userinfo_failed")
        res.delete_cookie("oauth_state", path="/api/auth")
        return res

    google_sub = u_info.get("sub")
    google_email = (u_info.get("email") or "").strip().lower()
    email_verified = bool(u_info.get("email_verified"))
    google_name = (u_info.get("name") or "Citizen").strip()
    google_picture = u_info.get("picture")

    if not google_sub or not google_email:
        res = RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=error&error_type=invalid_google_profile")
        res.delete_cookie("oauth_state", path="/api/auth")
        return res

    # Require email_verified == True
    if not email_verified:
        res = RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=error&error_type=email_not_verified")
        res.delete_cookie("oauth_state", path="/api/auth")
        return res

    # 5. Account matching & linking logic
    # Look up by google_id
    user = db.query(models.User).filter(models.User.google_id == google_sub).first()

    if not user:
        # Look up by verified email
        user_by_email = db.query(models.User).filter(func.lower(models.User.email) == google_email).first()
        if user_by_email:
            # Guardrail: Check if existing account is Worker or Admin
            if user_by_email.role in ["admin", "worker"]:
                res = RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=error&error_type=staff_account")
                res.delete_cookie("oauth_state", path="/api/auth")
                return res

            # Safe Account Linking for Citizen:
            user = user_by_email
            user.google_id = google_sub
            user.auth_provider = "both" if user.password_hash else "google"
            user.email_verified = True
            if google_picture and not user.profile_picture:
                user.profile_picture = google_picture
            db.commit()
            db.refresh(user)

    if user:
        # User is authenticated
        if user.is_active is False:
            res = RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=error&error_type=deactivated")
            res.delete_cookie("oauth_state", path="/api/auth")
            return res

        # Never grant worker/admin privileges
        if user.role != "citizen":
            res = RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=error&error_type=staff_account")
            res.delete_cookie("oauth_state", path="/api/auth")
            return res

        # Generate CivicFix JWT token
        jwt_token = create_access_token({"sub": str(user.id), "role": user.role})

        # Redirect cleanly to frontend with HttpOnly cookie (NO tokens in URL!)
        redirect_res = RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=success")
        redirect_res.set_cookie(
            key="civicfix_session",
            value=jwt_token,
            httponly=True,
            samesite="lax",
            max_age=ACCESS_TOKEN_EXPIRE_DAYS * 86400,
            secure=config.IS_PRODUCTION,
            path="/",
        )
        redirect_res.delete_cookie("oauth_state", path="/api/auth")
        return redirect_res

    # 6. New Citizen: Phone is NOT NULL in database.
    # Store verified Google identity in short-lived signed JWT in HttpOnly cookie
    pending_payload = {
        "sub": google_sub,
        "email": google_email,
        "name": google_name,
        "picture": google_picture,
        "type": "google_pending_registration",
    }
    pending_token = jwt.encode(
        {**pending_payload, "exp": datetime.utcnow() + timedelta(minutes=10)},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    redirect_res = RedirectResponse(f"{config.FRONTEND_URL}/login?google_auth=needs_phone")
    redirect_res.set_cookie(
        key="civicfix_pending_google",
        value=pending_token,
        httponly=True,
        samesite="lax",
        max_age=600,
        secure=config.IS_PRODUCTION,
        path="/api/auth",
    )
    redirect_res.delete_cookie("oauth_state", path="/api/auth")
    return redirect_res


@router.get("/google/pending-info", response_model=schemas.GooglePendingInfoResponse)
def get_google_pending_info(request: Request):
    """
    Returns verified Google identity for pre-filling the Complete Profile modal
    from the secure HttpOnly cookie.
    """
    pending_token = request.cookies.get("civicfix_pending_google")
    if not pending_token:
        raise HTTPException(status_code=400, detail="No pending Google sign-in session found. Please sign in again.")
    try:
        claims = jwt.decode(pending_token, SECRET_KEY, algorithms=[ALGORITHM])
        if claims.get("type") != "google_pending_registration":
            raise HTTPException(status_code=400, detail="Invalid session type.")
        return {
            "name": claims.get("name", "Citizen"),
            "email": claims.get("email", ""),
            "picture": claims.get("picture"),
        }
    except Exception:
        raise HTTPException(status_code=400, detail="Google authentication session expired. Please sign in again.")


@router.post("/complete-google-profile")
def complete_google_profile(
    payload: schemas.CompleteGoogleProfileRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Completes registration for a new Google-authenticated Citizen.
    Validates phone format, validates phone uniqueness, creates Citizen user,
    issues JWT token, and sets the secure HttpOnly cookie.
    """
    pending_token = request.cookies.get("civicfix_pending_google")
    if not pending_token:
        raise HTTPException(status_code=400, detail="Google registration session expired. Please sign in again.")

    try:
        claims = jwt.decode(pending_token, SECRET_KEY, algorithms=[ALGORITHM])
        if claims.get("type") != "google_pending_registration":
            raise HTTPException(status_code=400, detail="Invalid registration session.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired Google session. Please sign in again.")

    # Clean and validate phone number (10 digits)
    phone = payload.phone.strip().replace(" ", "").replace("-", "").replace("+91", "")
    if not phone.isdigit() or len(phone) != 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit Indian mobile number.")

    # Validate phone uniqueness (Guardrail #8)
    existing_phone = db.query(models.User).filter(models.User.phone == phone).first()
    if existing_phone:
        raise HTTPException(
            status_code=400,
            detail="This mobile number is already registered to another account. Please use your existing account or provide a different mobile number.",
        )

    google_sub = claims["sub"]
    google_email = claims["email"]
    google_name = (payload.name or claims.get("name") or "Citizen").strip()
    google_picture = claims.get("picture")

    # Double check email uniqueness
    existing_email = db.query(models.User).filter(func.lower(models.User.email) == google_email.lower()).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")

    # Create new Citizen user record (STRICTLY role='citizen', never worker/admin)
    new_user = models.User(
        name=google_name,
        phone=phone,
        email=google_email,
        role="citizen",
        google_id=google_sub,
        auth_provider="google",
        email_verified=True,
        profile_picture=google_picture,
        password_hash=hash_password(secrets.token_urlsafe(32)),
        is_profile_complete=True,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Issue JWT token
    jwt_token = create_access_token({"sub": str(new_user.id), "role": new_user.role})

    # Set HttpOnly session cookie
    response.set_cookie(
        key="civicfix_session",
        value=jwt_token,
        httponly=True,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 86400,
        secure=config.IS_PRODUCTION,
        path="/",
    )
    # Clear pending cookie
    response.delete_cookie("civicfix_pending_google", path="/api/auth")

    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "user_id": new_user.id,
        "name": new_user.name,
        "role": new_user.role,
        "email": new_user.email,
        "phone": new_user.phone,
        "profile_picture": new_user.profile_picture,
        "auth_provider": new_user.auth_provider,
        "is_profile_complete": True,
    }


@router.get("/session")
def get_session(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Retrieves the authenticated session from the secure HttpOnly cookie (or Bearer header).
    Used by frontend after OAuth redirect to securely populate localStorage
    without exposing tokens in URLs.
    """
    token = request.cookies.get("civicfix_session")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="No active authentication session.")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Session token expired or invalid.")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User account not found or disabled.")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name,
        "role": user.role,
        "phone": user.phone,
        "email": user.email,
        "profile_picture": user.profile_picture,
        "auth_provider": user.auth_provider or "local",
        "worker_code": user.worker_code,
        "admin_code": user.admin_code,
        "admin_level": user.admin_level,
        "must_change_password": bool(user.must_change_password),
        "permissions": [p.strip() for p in user.permissions.split(",")] if user.permissions else [],
        "is_profile_complete": bool(user.is_profile_complete),
    }


@router.post("/logout")
def logout(response: Response):
    """
    Clears the HttpOnly session cookie.
    """
    response.delete_cookie("civicfix_session", path="/")
    response.delete_cookie("civicfix_pending_google", path="/api/auth")
    return {"message": "Logged out successfully"}


@router.post("/google/dev-demo-login")
def dev_demo_google_login(
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Development/Demo helper: Simulates a verified Google sign-in for existing citizen Ravi Kumar
    without needing external Google Cloud credentials during offline testing.
    Strictly disabled in production.
    """
    if config.IS_PRODUCTION:
        raise HTTPException(status_code=403, detail="Not available in production.")

    user = db.query(models.User).filter(models.User.phone == "9000000001").first()
    if not user:
        raise HTTPException(status_code=404, detail="Demo user not found.")

    user.google_id = "google_demo_ravi_sub_10928374"
    user.auth_provider = "both"
    user.email_verified = True
    db.commit()
    db.refresh(user)

    jwt_token = create_access_token({"sub": str(user.id), "role": user.role})
    response.set_cookie(
        key="civicfix_session",
        value=jwt_token,
        httponly=True,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 86400,
        path="/",
    )
    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name,
        "role": user.role,
        "email": user.email,
        "phone": user.phone,
        "auth_provider": user.auth_provider,
    }

