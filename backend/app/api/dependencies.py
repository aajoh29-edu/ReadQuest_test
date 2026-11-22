from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import AuthSession, User
from app.services.security import csrf_valid, current_session


def require_session(
    request: Request, db: Session = Depends(get_db)
) -> tuple[User, AuthSession]:
    session = current_session(request, db)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return user, session


def require_current_user(
    request: Request, db: Session = Depends(get_db)
) -> tuple[User, AuthSession]:
    user, session = require_session(request, db)
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and not csrf_valid(
        request, session
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token.")
    return user, session
