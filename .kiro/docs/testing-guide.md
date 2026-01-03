# Testing Guide: Authentication, Rate Limiting & User Activity

## Prerequisites

Make sure you have:
- PostgreSQL running with the TitleVault database
- Backend dependencies installed: `pip install -r requirements.txt`
- Frontend running: `cd frontend && bun dev`

---

## 1. Setup: Create Admin User

### Option A: Direct Database Insert
```sql
-- Insert admin user (replace password_hash with bcrypt hash of "admin123")
INSERT INTO users (id, username, password_hash, roles) 
VALUES (
    gen_random_uuid(),
    'admin',
    '$2b$12$your_bcrypt_hash_here',
    '["admin", "user"]'::jsonb
);
```

### Option B: Python Script
```python
from passlib.context import CryptContext
from sqlalchemy import create_engine, text

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed = pwd_context.hash("admin123")
print(f"Hashed password: {hashed}")

# Use this hash in the SQL insert above
```

### Option C: Create User via API (As Admin)
```bash
# First, you need an existing admin token
# Then:
curl -X POST http://localhost:8000/auth/register \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "pass123"}'
```

---

## 2. Test Authentication

### Test 1: Login with Valid Credentials
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# Expected Response:
# {
#   "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "token_type": "bearer"
# }
```

**Save the access_token for next tests!**

### Test 2: Login with Invalid Credentials
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "wrongpassword"
  }'

# Expected: 401 Unauthorized
# Response: {"detail": "Invalid credentials"}
```

### Test 3: Refresh Token
```bash
curl -X POST http://localhost:8000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"token": "{YOUR_REFRESH_TOKEN}"}'

# Expected: New access_token
```

---

## 3. Test Rate Limiting

### Test Login Rate Limit (10 requests/minute)
```bash
#!/bin/bash
# Try to login 15 times quickly
for i in {1..15}; do
  echo "Request $i:"
  curl -s -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "admin123"}' | jq '.status // .detail'
  sleep 0.5
done

# Expected: First 10 succeed, 11-15 return 429 "Too many requests"
```

### Test API Rate Limit (100 requests/hour)
```bash
# Try to create agreement 101 times
# (You'll need valid data and admin token)
for i in {1..101}; do
  curl -X POST http://localhost:8000/agreement/create \
    -H "Authorization: Bearer {ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{...agreement_data...}'
done

# Expected: Request 101 gets 429
```

---

## 4. Test Admin Authorization

### Test 4A: Create Agreement (Admin Only)
```bash
curl -X POST http://localhost:8000/agreement/create \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_type": "LAND",
    "subject_id": "0x...",
    "buyer_address": "0x...",
    "seller_address": "0x...",
    "canonical_json": {...}
  }'

# Expected: 200 OK with created agreement
```

### Test 4B: Create Agreement (Non-Admin)
```bash
# Create a non-admin user first
curl -X POST http://localhost:8000/auth/register \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "pass123"}'

# Then login as user1
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "pass123"}'

# Try to create agreement with user1 token
curl -X POST http://localhost:8000/agreement/create \
  -H "Authorization: Bearer {USER1_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{...agreement_data...}'

# Expected: 403 Forbidden
# Response: {"detail": "Admin only"}
```

---

## 5. Test User Activity Tracking

### Test 5A: View User Activities
```bash
# Get current user's activities
curl -X GET http://localhost:8000/activity/my-activity?limit=50 \
  -H "Authorization: Bearer {ACCESS_TOKEN}"

# Expected Response:
# {
#   "items": [
#     {
#       "id": "uuid",
#       "action": "agreement_created",
#       "timestamp": "2024-01-02T10:30:45.123Z",
#       "metadata": {"agreement_id": "..."}
#     }
#   ],
#   "total": 5
# }
```

### Test 5B: Check RealtimeStatusPanel
1. Open frontend in browser
2. Login as admin
3. Go to RealtimeStatusPanel
4. Verify "Connected" status shows
5. Perform admin action (create agreement, etc.)
6. Check if update appears in "Live Updates" feed within 5 seconds
7. Should see: "agreement_created" or similar action

### Test 5C: Verify User Isolation
```bash
# Login as User1
curl -X POST http://localhost:8000/auth/login \
  -d '{"username": "user1", "password": "pass123"}'

# Get activities for User1
curl -X GET http://localhost:8000/activity/my-activity \
  -H "Authorization: Bearer {USER1_TOKEN}"

# Should return ONLY User1's activities, NOT admin's activities
```

---

## 6. Integration Test: Full Flow

### Step 1: Start Backend
```bash
cd backend
uvicorn app:app --reload
```

### Step 2: Start Frontend
```bash
cd frontend
bun dev
```

### Step 3: Create Admin User
```bash
# Use one of the methods above
```

### Step 4: Test Complete Flow
```bash
# 1. Login as admin
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  | jq -r '.access_token')

# 2. Create a property record
curl -X POST http://localhost:8000/registry/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...property_data...}'

# 3. Check activities
curl -X GET http://localhost:8000/activity/my-activity \
  -H "Authorization: Bearer $TOKEN" \
  | jq

# 4. Open frontend, login, go to RealtimeStatusPanel
# 5. Verify activity appears in live feed
```

---

## 7. Debugging

### Check Rate Limiter Status
```python
# In Python shell
from slowapi.util import get_remote_address
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)
# Check current limits in response headers
```

### View Database Activities
```sql
SELECT user_id, action, timestamp, metadata_json 
FROM audit_logs 
ORDER BY timestamp DESC 
LIMIT 20;
```

### Check Token Contents
```python
import jwt
import base64

token = "YOUR_ACCESS_TOKEN"
# Remove 'Bearer ' if present
parts = token.split('.')

# Decode header
header = base64.urlsafe_b64decode(parts[0] + '==')
print(header)

# Decode payload
payload = base64.urlsafe_b64decode(parts[1] + '==')
print(payload)

# Note: Signature verification requires the secret key
```

---

## 8. Common Issues & Solutions

### Issue: "user not found" on login
- **Solution:** User doesn't exist in database. Create admin user first.

### Issue: "Invalid credentials"
- **Solution:** Password is incorrect or hashed with different algorithm.

### Issue: "Too many requests" on first login
- **Solution:** Previous test made >10 attempts. Wait 1 minute or restart backend.

### Issue: 403 Forbidden on admin endpoints
- **Solution:** User doesn't have "admin" role. Create admin user or add role.

### Issue: No activities showing in RealtimeStatusPanel
- **Solution:** 
  1. Verify token is valid: `GET /auth/me` or similar
  2. Check activity endpoint: `GET /activity/my-activity`
  3. Check browser console for errors
  4. Verify activity was logged to database

### Issue: CORS errors when calling API from frontend
- **Solution:** Ensure backend has correct CORS origins in app.py

---

## 9. Performance Testing

### Load Test Login Endpoint
```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:8000/auth/login

# Expected: Rate limiter should kick in after 10 requests/minute
```

### Monitor Rate Limiter
```bash
# Check response headers for rate limit info
curl -v -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' 2>&1 | grep -i "ratelimit\|x-ratelimit"
```

---

## 10. Success Criteria

✅ **Authentication:**
- [x] Login returns valid JWT tokens
- [x] Refresh token updates access token
- [x] Invalid credentials return 401

✅ **Rate Limiting:**
- [x] Login limited to 10 requests/minute
- [x] Admin endpoints limited to 100 requests/hour
- [x] Exceeding limit returns 429

✅ **Admin Authorization:**
- [x] Admin can create records/agreements
- [x] Non-admin gets 403 Forbidden
- [x] Role checking works correctly

✅ **User Activity:**
- [x] User activities logged to database
- [x] User sees only their own activities
- [x] RealtimeStatusPanel displays activities
- [x] Polling updates every 5 seconds

---

All tests should pass before deploying to production!