from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError

from models import User, RefreshToken, get_db
from schemas.auth_schema import RegisterRequest, LoginRequest, TokenResponse
from config import settings
from deps.auth import require_admin   # IMPORTANT

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_token(payload: dict, expires_minutes: int):
    payload = payload.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=expires_minutes)
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

    user = User(
        username=req.username,
        password_hash=pwd_context.hash(req.password),
        roles=["user"],
    )

    db.add(user)
    db.commit()
    return {"message": "User created"}


# --------------------------------------------------
# LOGIN
# --------------------------------------------------
@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()

    if not user or not pwd_context.verify(req.password, user.password_hash):
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
# REFRESH
# --------------------------------------------------
@router.post("/refresh")
def refresh(token: str, db: Session = Depends(get_db)):
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
