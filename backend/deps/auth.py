from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from config import settings
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        print("[AUTH] No token received in request")
        return None
    
    print(f"[AUTH] Token received, length: {len(token)}")
    
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        print(f"[AUTH] Token decoded successfully, sub: {payload.get('sub')}")
        return payload
    except JWTError as e:
        print(f"[AUTH] JWT decode error: {e}")
        return None


def get_current_user_required(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_admin(user=Depends(get_current_user_required)):
    if "admin" not in user["roles"]:
        raise HTTPException(status_code=403, detail="Admin only")
    return user
