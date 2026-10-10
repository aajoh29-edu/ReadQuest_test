import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.api.dependencies import COOKIE_NAME, current_user, transaction_session
from app.api.schemas import LoginInput, PasswordInput, UserView
from app.core.config import get_settings
from app.core.security import hash_password, token_digest, verify_password
from app.db.session import get_db_session
from app.models.auth import AuthSession, LoginThrottle
from app.models.enums import UserStatus
from app.models.identity import User

router = APIRouter(prefix="/auth", tags=["authentication"])


def trusted_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin and origin not in get_settings().allowed_origins:
        raise HTTPException(403, "untrusted origin")


@router.post("/login", response_model=UserView)
def login(payload: LoginInput, request: Request, response: Response,
          session: Session = Depends(get_db_session)):
    trusted_origin(request)
    email = str(payload.email).lower()
    now = datetime.now(UTC)
    token = secrets.token_urlsafe(32)
    failure = None
    # Commit throttle changes even on invalid credentials, then raise outside transaction.
    with session.begin():
        session.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
                        {"key": "login:" + email})
        throttle = session.get(LoginThrottle, email)
        if throttle is None:
            throttle = LoginThrottle(email=email, failures=0, window_start=now)
            session.add(throttle)
        if now - throttle.window_start >= timedelta(minutes=15):
            throttle.failures = 0
            throttle.window_start = now
        if throttle.failures >= 5:
            failure = 429
        else:
            user = session.scalar(select(User).where(User.email == email).with_for_update())
            valid = verify_password(payload.password, user.password_hash if user else "")
            if not valid or user is None or user.status != UserStatus.ACTIVE:
                throttle.failures += 1
                failure = 401
            else:
                throttle.failures = 0
                session.add(AuthSession(token_hash=token_digest(token), user_id=user.id,
                    expires_at=now + timedelta(hours=get_settings().session_hours)))
    if failure:
        raise HTTPException(failure, "try again later" if failure == 429 else "invalid credentials")
    response.set_cookie(COOKIE_NAME, token, httponly=True, samesite="lax",
        secure=get_settings().environment == "production",
        max_age=get_settings().session_hours * 3600, path="/")
    response.headers["Cache-Control"] = "no-store"
    return user


@router.get("/me", response_model=UserView)
def me(user: User = Depends(current_user)):
    return user


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, user: User = Depends(current_user),
           session: Session = Depends(transaction_session, scope="function")):
    session.execute(delete(AuthSession).where(
        AuthSession.token_hash == token_digest(request.cookies.get(COOKIE_NAME, ""))))
    response.delete_cookie(COOKIE_NAME, path="/")


@router.post("/password", status_code=204)
def change_password(payload: PasswordInput, response: Response,
                    user: User = Depends(current_user),
                    session: Session = Depends(transaction_session, scope="function")):
    # Lock account before changing credentials; login takes the same lock.
    user = session.scalar(select(User).where(User.id == user.id).with_for_update())
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(401, "invalid credentials")
    user.password_hash = hash_password(payload.new_password)
    session.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    response.delete_cookie(COOKIE_NAME, path="/")
