#!/usr/bin/env python3
"""
Script to create test users in the database
Run this ONCE to set up test accounts
"""

import sys
import uuid
from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.insert(0, '/path/to/backend')

from models import User, Base
from config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database connection
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Test users to create
TEST_USERS = [
    {
        "username": "admin@gmail.com",
        "password": "admin@123",
        "roles": ["admin", "user"],
    },
    {
        "username": "user1@gmail.com",
        "password": "user1@123",
        "roles": ["user"],
    },
]

def create_users():
    """Create test users"""
    for user_data in TEST_USERS:
        # Check if user already exists
        existing = session.query(User).filter(User.username == user_data["username"]).first()
        if existing:
            print(f"⚠️  User '{user_data['username']}' already exists, skipping...")
            continue
        
        # Create new user
        # Bcrypt has a 72-byte limit - truncate password to ensure compatibility
        password_truncated = user_data["password"][:72] if len(user_data["password"]) > 72 else user_data["password"]
        
        user = User(
            id=uuid.uuid4(),
            username=user_data["username"],
            password_hash=pwd_context.hash(password_truncated),
            roles=user_data["roles"],
        )
        session.add(user)
        print(f"✅ Created user '{user_data['username']}' with password '{user_data['password']}'")
    
    # Commit all changes
    session.commit()
    print("\n✅ All users created successfully!")
    print("\n📋 Test Credentials:")
    for user_data in TEST_USERS:
        print(f"  - Username: {user_data['username']}, Password: {user_data['password']}, Roles: {', '.join(user_data['roles'])}")

if __name__ == "__main__":
    try:
        create_users()
    except Exception as e:
        print(f"❌ Error creating users: {e}")
        session.rollback()
    finally:
        session.close()
