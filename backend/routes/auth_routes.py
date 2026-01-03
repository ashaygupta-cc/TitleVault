from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from slowapi import Limiter
from slowapi.util import get_remote_address

from models import User, RefreshToken, get_db
from schemas.auth_schema import RegisterRequest, LoginRequest, TokenResponse
from config import settings
from deps.auth import require_admin  

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
limiter = Limiter(key_func=get_remote_address)


def create_token(payload: dict, expires_minutes: int):
    payload = payload.copy()
    # Use timezone-aware UTC time to prevent expiration issues
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    print(f"[AUTH] Creating token with exp: {payload['exp']}, current time: {datetime.now(timezone.utc)}")
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# --------------------------------------------------
# ADMIN ONLY: CREATE USER
# --------------------------------------------------
@router.post("/register")
def register(
    req: RegisterRequest,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="User exists")

    # Bcrypt has a 72-byte limit - truncate password to ensure compatibility
    password_truncated = req.password[:72] if len(req.password) > 72 else req.password
    
    user = User(
        username=req.username,
        password_hash=pwd_context.hash(password_truncated),
        roles=["user"],
    )

    db.add(user)
    db.commit()
    return {"message": "User created"}


# --------------------------------------------------
# LOGIN - Rate limited to 10 requests per minute
# --------------------------------------------------
@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(
    request: Request,
    req: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == req.username).first()

    # Bcrypt has a 72-byte limit - truncate password to ensure compatibility
    password_truncated = req.password[:72] if len(req.password) > 72 else req.password
    
    if not user or not pwd_context.verify(password_truncated, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_token(
        {
            "sub": str(user.id),
            "username": user.username,
            "roles": user.roles,
            "type": "access",
        },
        expires_minutes=60,
    )

    refresh_token = create_token(
        {
            "sub": str(user.id),
            "type": "refresh",
        },
        expires_minutes=60 * 24 * 7,
    )

    db.add(
        RefreshToken(
            user_id=user.id,
            token=refresh_token,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
    )
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# --------------------------------------------------
# REFRESH - Rate limited to 30 requests per minute
# --------------------------------------------------
@router.post("/refresh")
@limiter.limit("30/minute")
def refresh(request: Request, token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Wrong token type")

    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == token,
        RefreshToken.expires_at > datetime.utcnow(),
    ).first()

    if not db_token:
        raise HTTPException(status_code=401, detail="Refresh token expired")

    user = db.query(User).get(payload["sub"])

    access_token = create_token(
        {
            "sub": str(user.id),
            "username": user.username,
            "roles": user.roles,
            "type": "access",
        },
        expires_minutes=60,
    )

    return {"access_token": access_token, "token_type": "bearer"}
