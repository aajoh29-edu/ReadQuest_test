import os
from fastapi import FastAPI, Response, Request, HTTPException, status
from pydantic import BaseModel

app = FastAPI(title="ReadQuest API")

# Pulls the explicit seed password mapped in your docker-compose.test.yml
DEMO_PASSWORD = os.getenv("DEMO_SEED_PASSWORD", "test_password")

class LoginRequest(BaseModel):
    username: str
    password: str

@app.get("/api/health")
async def health_check():
    """
    Pinged by Docker Compose. When this returns 200 OK, 
    the container is marked 'healthy' and tests begin.
    """
    return {"status": "ok"}

@app.post("/api/login")
async def login(credentials: LoginRequest, response: Response):
    """
    Validates E2E test credentials and issues the HttpOnly cookie.
    """
    valid_users = ["teacher_demo", "child_demo"]
    
    if credentials.username not in valid_users or credentials.password != DEMO_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
        
    # Issues the HttpOnly cookie to strictly isolate it from browser storage
    response.set_cookie(
        key="readquest_session",
        value=f"mock_token_for_{credentials.username}",
        httponly=True,
        secure=False,  # Set to True in production (HTTPS)
        samesite="lax",
        max_age=3600  # 1 hour expiration
    )
    
    return {"message": "Authentication successful", "role": credentials.username.split('_')[0]}

@app.get("/api/dashboard")
async def get_dashboard(request: Request):
    """
    Reads the HttpOnly cookie automatically attached by the browser.
    Returns 401 to trigger the frontend 'Expired Session' state if missing.
    """
    session_token = request.cookies.get("readquest_session")
    
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or missing"
        )
        
    # Triggers the React 'Empty State' for children, or returns mock data for teachers
    if "child" in session_token:
        return []
    elif "teacher" in session_token:
        return [
            {"id": 1, "title": "Grade 3 Reading Group", "progress": 75},
            {"id": 2, "title": "Grade 4 Accelerated", "progress": 92}
        ]
        
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role not recognized")
