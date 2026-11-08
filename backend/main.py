import os
from fastapi import FastAPI, Response, Request, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# Import the database dependency you created in backend/database.py
from database import get_db

app = FastAPI(title="ReadQuest API")

DEMO_PASSWORD = os.getenv("DEMO_SEED_PASSWORD", "test_password")

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
    """Validates E2E test credentials and issues the HttpOnly cookie."""
    valid_users = ["teacher_demo", "child_demo"]
    
    if credentials.username not in valid_users or credentials.password != DEMO_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
        
    response.set_cookie(
        key="readquest_session",
        value=f"mock_token_for_{credentials.username}",
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=3600
    )
    
    return {"message": "Authentication successful", "role": credentials.username.split('_')[0]}

@app.get("/api/dashboard")
async def get_dashboard(request: Request):
    """Reads the HttpOnly cookie to return UI states."""
    session_token = request.cookies.get("readquest_session")
    
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or missing"
        )
        
    if "child" in session_token:
        return []
    elif "teacher" in session_token:
        return [
            {"id": 1, "title": "Grade 3 Reading Group", "progress": 75},
            {"id": 2, "title": "Grade 4 Accelerated", "progress": 92}
        ]
        
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role not recognized")
