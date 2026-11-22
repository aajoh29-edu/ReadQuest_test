import os
from collections import defaultdict
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.dependencies import require_current_user, require_session
from app.database import get_db
from app.models.account import AuthSession, AuthToken, User
from app.models.curriculum import Learner
from app.schemas.accounts import (
    ActiveLearnerRequest,
    ChangePasswordRequest,
    CredentialsRequest,
    ForgotPasswordRequest,
    LearnerRequest,
    LearnerResponse,
    LearnerUpdateRequest,
    PasswordRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)
from app.services.security import (
    CSRF_COOKIE,
    SESSION_COOKIE,
    consume_auth_token,
    create_session,
    find_session,
    hash_password,
    issue_auth_token,
    normalize_email,
    revoke_session,
    revoke_user_sessions,
    validate_email,
    validate_password,
    verify_password,
)
from app.services.email import send_auth_link

router = APIRouter(tags=["authentication"])

_rate_limit: dict[str, list[float]] = defaultdict(list)
_AUTO_VERIFY = os.getenv("READQUEST_AUTO_VERIFY_EMAIL", "true").lower() == "true"
_SECURE_COOKIES = os.getenv("READQUEST_COOKIE_SECURE", "false").lower() == "true"


def _iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.isoformat()


def learner_payload(learner: Learner) -> dict:
    return LearnerResponse(
        id=learner.id,
        name=learner.display_name,
        avatar=learner.avatar,
        avatar_name=learner.avatar_name,
        reading_level_id=learner.reading_level_id,
        grade_level=learner.grade_level,
        stars_earned=learner.stars_earned,
        current_streak_days=learner.current_streak_days,
        badges=list(learner.badges or []),
        total_active_practice_seconds=learner.total_active_practice_seconds,
        last_active_lesson_id=learner.last_active_lesson_id,
    ).model_dump(by_alias=True)


def user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "fullName": user.full_name,
        "email": user.email,
        "role": user.role,
        "emailVerified": user.email_verified,
        "createdAt": _iso(user.created_at),
        "practiceGoalMinutesPerDay": user.practice_goal_minutes_per_day,
    }


def owned_learners(db: Session, user_id: str) -> list[Learner]:
    return list(
        db.scalars(
            select(Learner)
            .where(Learner.parent_user_id == user_id)
            .order_by(Learner.created_at)
        )
    )


def auth_payload(db: Session, user: User) -> dict:
    return {
        "user": user_payload(user),
        "childProfiles": [learner_payload(item) for item in owned_learners(db, user.id)],
    }


def set_session_cookies(
    response: Response, session_token: str, csrf_token: str
) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        session_token,
        httponly=True,
        secure=_SECURE_COOKIES,
        samesite="lax",
        path="/",
        max_age=28800,
    )
    response.set_cookie(
        CSRF_COOKIE,
        csrf_token,
        httponly=False,
        secure=_SECURE_COOKIES,
        samesite="lax",
        path="/",
        max_age=28800,
    )


def clear_session_cookies(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(CSRF_COOKIE, path="/")


def _check_rate_limit(key: str) -> None:
    now = datetime.now(UTC).timestamp()
    recent = [stamp for stamp in _rate_limit[key] if now - stamp < 300]
    _rate_limit[key] = recent
    if len(recent) >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please try again later.",
            headers={"Retry-After": "300"},
        )
    recent.append(now)


def _validate_password_or_raise(password: str) -> None:
    if not validate_password(password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Use at least 10 characters with uppercase, lowercase, number, and symbol.",
        )


def _require_owned_learner(db: Session, user: User, learner_id: str) -> Learner:
    learner = db.get(Learner, learner_id)
    if learner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner not found.")
    if user.role != "admin" and learner.parent_user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Learner access denied.")
    return learner


@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    if not payload.accepted_policies:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Policies must be accepted.",
        )
    email = normalize_email(payload.email)
    if not validate_email(email):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    if "<" in payload.full_name or ">" in payload.full_name:
        raise HTTPException(status_code=422, detail="Name contains invalid characters.")
    _validate_password_or_raise(payload.password)
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role="parent",
        email_verified=_AUTO_VERIFY,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    result = auth_payload(db, user)
    if _AUTO_VERIFY:
        raw_session, csrf, _ = create_session(db, user)
        set_session_cookies(response, raw_session, csrf)
        result["requiresEmailVerification"] = False
        result["message"] = "Account created."
    else:
        raw = issue_auth_token(db, user, "verify_email")
        send_auth_link(user.email, "verify_email", raw)
        result["requiresEmailVerification"] = True
        result["message"] = "Check your email to verify your account."
    return result


@router.post("/auth/login")
def login(
    payload: CredentialsRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    email = normalize_email(payload.email)
    _check_rate_limit(f"login:{request.client.host if request.client else 'unknown'}:{email}")
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(user.password_hash, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verify your email before signing in.",
        )
    raw_session, csrf, _ = create_session(db, user)
    set_session_cookies(response, raw_session, csrf)
    return auth_payload(db, user)


@router.get("/auth/me")
def current_user(
    request: Request, db: Session = Depends(get_db)
) -> dict:
    session = find_session(db, request.cookies.get(SESSION_COOKIE))
    if session is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return auth_payload(db, user)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> None:
    _, session = session_data
    revoke_session(db, session)
    clear_session_cookies(response)


@router.post("/auth/refresh")
def refresh(
    response: Response,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user, old_session = session_data
    revoke_session(db, old_session)
    raw_session, csrf, _ = create_session(db, user)
    set_session_cookies(response, raw_session, csrf)
    return auth_payload(db, user)


@router.post("/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict:
    email = normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))
    if user is not None:
        raw = issue_auth_token(db, user, "reset_password")
        send_auth_link(user.email, "reset_password", raw)
    return {"message": "If an account exists for that email, a reset link has been sent."}


@router.post("/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict:
    _validate_password_or_raise(payload.new_password)
    token = consume_auth_token(db, payload.token, "reset_password")
    if token is None:
        raise HTTPException(status_code=422, detail="Reset token is invalid or expired.")
    user = db.get(User, token.user_id)
    if user is None:
        raise HTTPException(status_code=422, detail="Reset token is invalid or expired.")
    user.password_hash = hash_password(payload.new_password)
    revoke_user_sessions(db, user.id)
    db.commit()
    return {"message": "Password reset successfully."}


@router.post("/auth/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)) -> dict:
    token = consume_auth_token(db, payload.token, "verify_email")
    if token is None:
        raise HTTPException(status_code=422, detail="Verification token is invalid or expired.")
    user = db.get(User, token.user_id)
    if user is None:
        raise HTTPException(status_code=422, detail="Verification token is invalid or expired.")
    user.email_verified = True
    db.commit()
    return {"message": "Email verified successfully."}


@router.post("/auth/resend-verification")
def resend_verification(
    payload: ResendVerificationRequest, db: Session = Depends(get_db)
) -> dict:
    user = db.scalar(select(User).where(User.email == normalize_email(payload.email)))
    if user is not None and not user.email_verified:
        db.execute(
            delete(AuthToken).where(
                AuthToken.user_id == user.id,
                AuthToken.purpose == "verify_email",
                AuthToken.used_at.is_(None),
            )
        )
        raw = issue_auth_token(db, user, "verify_email")
        send_auth_link(user.email, "verify_email", raw)
    return {"message": "If verification is required, a new link has been sent."}


@router.post("/auth/change-password")
def change_password(
    payload: ChangePasswordRequest,
    response: Response,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    if not verify_password(user.password_hash, payload.current_password):
        raise HTTPException(status_code=422, detail="Current password is incorrect.")
    _validate_password_or_raise(payload.new_password)
    user.password_hash = hash_password(payload.new_password)
    revoke_user_sessions(db, user.id)
    raw_session, csrf, _ = create_session(db, user)
    set_session_cookies(response, raw_session, csrf)
    return {"message": "Password changed successfully."}


@router.post("/auth/reauthenticate")
def reauthenticate(
    payload: PasswordRequest,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
) -> dict:
    user, _ = session_data
    if not verify_password(user.password_hash, payload.password):
        raise HTTPException(status_code=401, detail="Password verification failed.")
    return {"verified": True}


@router.delete("/auth/account")
def delete_account(
    payload: PasswordRequest,
    response: Response,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    if not verify_password(user.password_hash, payload.password):
        raise HTTPException(status_code=422, detail="Password is incorrect.")
    revoke_user_sessions(db, user.id)
    db.delete(user)
    db.commit()
    clear_session_cookies(response)
    return {"message": "Account deleted."}


@router.get("/learners")
def list_learners(
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> list[dict]:
    user, _ = session_data
    return [learner_payload(item) for item in owned_learners(db, user.id)]


@router.post("/learners", status_code=status.HTTP_201_CREATED)
def create_learner(
    payload: LearnerRequest,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user, session = session_data
    learner = Learner(
        parent_user_id=user.id,
        display_name=payload.name.strip(),
        avatar=payload.avatar,
        avatar_name=payload.avatar_name,
        reading_level_id=payload.reading_level_id,
        grade_level=payload.grade_level,
    )
    db.add(learner)
    db.flush()
    if session.active_learner_id is None:
        session.active_learner_id = learner.id
    db.commit()
    db.refresh(learner)
    return learner_payload(learner)


@router.get("/learners/{learner_id}")
def get_learner(
    learner_id: str,
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    return learner_payload(_require_owned_learner(db, user, learner_id))


@router.patch("/learners/{learner_id}")
def update_learner(
    learner_id: str,
    payload: LearnerUpdateRequest,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    learner = _require_owned_learner(db, user, learner_id)
    updates = payload.model_dump(exclude_unset=True)
    mapping = {
        "name": "display_name",
        "avatar": "avatar",
        "avatar_name": "avatar_name",
        "reading_level_id": "reading_level_id",
        "grade_level": "grade_level",
    }
    for key, value in updates.items():
        if value is not None:
            setattr(learner, mapping[key], value)
    db.commit()
    db.refresh(learner)
    return learner_payload(learner)


@router.delete("/learners/{learner_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_learner(
    learner_id: str,
    payload: PasswordRequest,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> None:
    user, session = session_data
    if not verify_password(user.password_hash, payload.password):
        raise HTTPException(status_code=422, detail="Password is incorrect.")
    learner = _require_owned_learner(db, user, learner_id)
    if session.active_learner_id == learner.id:
        session.active_learner_id = None
    db.delete(learner)
    db.commit()


@router.post("/learners/active")
def select_active_learner(
    payload: ActiveLearnerRequest,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user, session = session_data
    learner = _require_owned_learner(db, user, payload.learner_id)
    session.active_learner_id = learner.id
    db.commit()
    return learner_payload(learner)
