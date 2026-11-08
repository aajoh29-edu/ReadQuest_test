import os
import uuid
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Response, Request, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# Assuming uvicorn is run from the backend directory, standard imports work best
from database import get_db

app = FastAPI(title="ReadQuest API")

DEMO_PASSWORD = os.getenv("DEMO_SEED_PASSWORD", "test_password")
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-development-key")
ALGORITHM = "HS256"

class LoginRequest(BaseModel):
    username: str
    password: str

@app.get("/api/health")
async def health_check():
    """Pinged by Docker Compose to mark the container as healthy."""
    return {"status": "ok"}

@app.get("/api/db-health")
async def db_health_check(db: AsyncSession = Depends(get_db)):
    """Validates the async database connection."""
    result = await db.execute(text("SELECT 1"))
    return {"db_status": "connected", "result": result.scalar()}

@app.post("/api/login")
async def login(credentials: LoginRequest, response: Response):
    """Validates E2E test credentials and issues a real JWT HttpOnly cookie."""
    valid_users = ["teacher_demo", "child_demo"]
    
    if credentials.username not in valid_users or credentials.password != DEMO_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # 1. Determine the account type based on the demo login
    account_type = "adult" if credentials.username == "teacher_demo" else "child"
    
    # 2. Generate a deterministic UUID for the demo users so tests pass consistently
    # In a real app, you would query the database for the user's actual UUID here.
    demo_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, credentials.username))
    
    # 3. Create the JWT payload required by dependencies.py
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    payload = {
        "sub": demo_uuid,
        "type": account_type,
        "exp": expire
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        
    response.set_cookie(
        key="readquest_session",
        value=token,
        httponly=True,
        secure=False, # Must be True in production with HTTPS
        samesite="lax",
        max_age=3600
    )
    
    return {"message": "Authentication successful", "role": account_type}

@app.get("/api/dashboard")
async def get_dashboard(request: Request):
    """Reads the HttpOnly cookie to return UI states."""
    session_token = request.cookies.get("readquest_session")
    
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or missing"
        )
    
    try:
        # Decode the token to check the role without hitting the DB for this mock route
        payload = jwt.decode(session_token, SECRET_KEY, algorithms=[ALGORITHM])
        account_type = payload.get("type")
        
        if account_type == "child":
            return []
        elif account_type == "adult":
            return [
                {"id": 1, "title": "Grade 3 Reading Group", "progress": 75},
                {"id": 2, "title": "Grade 4 Accelerated", "progress": 92}
            ]
            
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token"
        )
        
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role not recognized")
