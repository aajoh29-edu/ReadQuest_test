import hashlib
import os
import re
import secrets
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import AuthSession, AuthToken, User

SESSION_COOKIE = "rq_session"
CSRF_COOKIE = os.getenv("READQUEST_CSRF_COOKIE", "rq_csrf_token")
SESSION_SECONDS = int(os.getenv("READQUEST_SESSION_SECONDS", "28800"))

_hasher = PasswordHasher()
_email_re = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_email(value: str) -> str:
    return value.strip().lower()


def validate_email(value: str) -> bool:
    return bool(_email_re.fullmatch(normalize_email(value)))


def validate_password(value: str) -> bool:
    return (
        len(value) >= 10
        and any(char.islower() for char in value)
        and any(char.isupper() for char in value)
        and any(char.isdigit() for char in value)
        and any(not char.isalnum() for char in value)
    )


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (InvalidHashError, VerifyMismatchError):
        return False


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(db: Session, user: User) -> tuple[str, str, AuthSession]:
    session_token = secrets.token_urlsafe(48)
    csrf_token = secrets.token_urlsafe(32)
    session = AuthSession(
        user_id=user.id,
        token_hash=token_hash(session_token),
        csrf_token_hash=token_hash(csrf_token),
        expires_at=datetime.now(UTC) + timedelta(seconds=SESSION_SECONDS),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session_token, csrf_token, session


def revoke_session(db: Session, session: AuthSession) -> None:
    session.revoked_at = datetime.now(UTC)
    db.commit()


def revoke_user_sessions(db: Session, user_id: str) -> None:
    sessions = db.scalars(
        select(AuthSession).where(
            AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None)
        )
    ).all()
    for session in sessions:
        session.revoked_at = datetime.now(UTC)
    db.commit()


def find_session(db: Session, raw_token: str | None) -> AuthSession | None:
    if not raw_token:
        return None
    session = db.scalar(
        select(AuthSession).where(AuthSession.token_hash == token_hash(raw_token))
    )
    if session is None or session.revoked_at is not None:
        return None
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at <= datetime.now(UTC):
        session.revoked_at = datetime.now(UTC)
        db.commit()
        return None
    return session


def current_session(request: Request, db: Session) -> AuthSession | None:
    return find_session(db, request.cookies.get(SESSION_COOKIE))


def csrf_valid(request: Request, session: AuthSession) -> bool:
    cookie = request.cookies.get(CSRF_COOKIE)
    header = request.headers.get("X-CSRF-Token")
    return bool(
        cookie
        and header
        and secrets.compare_digest(cookie, header)
        and secrets.compare_digest(token_hash(cookie), session.csrf_token_hash)
    )


def issue_auth_token(db: Session, user: User, purpose: str) -> str:
    raw = secrets.token_urlsafe(32)
    expires = datetime.now(UTC) + timedelta(
        hours=24 if purpose == "verify_email" else 0.5
    )
    db.add(
        AuthToken(
            user_id=user.id,
            purpose=purpose,
            token_hash=token_hash(raw),
            expires_at=expires,
        )
    )
    db.commit()
    return raw


def consume_auth_token(db: Session, raw: str, purpose: str) -> AuthToken | None:
    token = db.scalar(
        select(AuthToken).where(
            AuthToken.token_hash == token_hash(raw),
            AuthToken.purpose == purpose,
            AuthToken.used_at.is_(None),
        )
    )
    if token is None:
        return None
    expires_at = token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at <= datetime.now(UTC):
        return None
    token.used_at = datetime.now(UTC)
    db.commit()
    return token
