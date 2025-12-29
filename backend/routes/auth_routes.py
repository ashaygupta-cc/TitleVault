# backend/routes/auth_routes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt  # PyJWT

from models import User, get_db
from schemas.auth_schema import RegisterRequest, LoginRequest, TokenResponse
from config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------------------------------------
# Helper: JWT creation
# ---------------------------------------
def create_access_token(payload: dict, expires_minutes: int = 60):
    to_encode = payload.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=expires_minutes)

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


# ---------------------------------------
# POST /auth/register
# ---------------------------------------
@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = pwd_context.hash(req.password)

    user = User(
        username=req.username,
        password_hash=hashed_password,
        roles=["user"],  # future-ready
    )

    db.add(user)
    db.commit()

    return {"message": "User registered successfully"}


# ---------------------------------------
# POST /auth/login
# ---------------------------------------
@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()

    if not user or not pwd_context.verify(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        {
            "sub": user.username,
            "roles": user.roles,
        }
    )

    return TokenResponse(access_token=token)
