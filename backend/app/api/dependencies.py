from collections.abc import Generator
from datetime import UTC, datetime

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import token_digest
from app.db.session import SessionFactory
from app.models.auth import AuthSession
from app.models.enums import UserRole, UserStatus
from app.models.identity import User

COOKIE_NAME = "readquest_session"


def transaction_session() -> Generator[Session, None, None]:
    with SessionFactory.begin() as session:
        yield session


def current_user(request: Request, session: Session = Depends(transaction_session, scope="function")) -> User:
    origin = request.headers.get("origin")
    if request.method not in {"GET", "HEAD", "OPTIONS"} and origin:
        if origin not in get_settings().allowed_origins:
            raise HTTPException(403, "untrusted origin")
    token = request.cookies.get(COOKIE_NAME, "")
    record = session.get(AuthSession, token_digest(token)) if token else None
    if record is None or record.expires_at <= datetime.now(UTC):
        raise HTTPException(401, "authentication required")
    user = session.get(User, record.user_id)
    if user is None or user.status != UserStatus.ACTIVE:
        raise HTTPException(401, "authentication required")
    return user


def require_roles(*roles: UserRole):
    def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "role not permitted")
        return user

    return dependency
