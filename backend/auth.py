import jwt
import datetime
from flask import request
from config import settings


SECRET = settings.SECRET_KEY
ALGO = settings.JWT_ALGORITHM


def create_token(subject: str, roles: list, expires_minutes=60*24):
    payload = {
        'sub': subject,
        'roles': roles,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=expires_minutes)
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)


def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGO])
    except Exception:
        return None


def require_role(required_roles):
    def decorator(f):
        def wrapper(*args, **kwargs):
            auth = request.headers.get('Authorization')
            if not auth or not auth.startswith('Bearer '):
                return {'error': 'unauthorized'}, 401

            token = auth.split(' ', 1)[1]
            data = decode_token(token)
            if not data:
                return {'error': 'invalid token'}, 401

            user_roles = data.get('roles', [])
            if not any(r in user_roles for r in required_roles):
                return {'error': 'forbidden'}, 403

            request.user = data
            return f(*args, **kwargs)

        wrapper.__name__ = f.__name__
        return wrapper

    return decorator
