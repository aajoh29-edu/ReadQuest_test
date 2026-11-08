import os
import uuid
import jwt # Requires: pip install pyjwt
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .database import get_db
from .models import AdultAccount, ChildReader

# In production, load this from an environment variable
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-development-key")
ALGORITHM = "HS256"

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Extract the HttpOnly session cookie, validate its JWT, and fetch the
    corresponding isolated user record from the database.
    """
    token = request.cookies.get("readquest_session")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session cookie missing"
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        account_type = payload.get("type")

        if not user_id_str or not account_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        user_id = uuid.UUID(user_id_str)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid"
        )

    if account_type == "adult":
        stmt = select(AdultAccount).where(AdultAccount.id == user_id)
    elif account_type == "child":
        stmt = select(ChildReader).where(ChildReader.id == user_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unknown account type"
        )

    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User record not found"
        )

    # Preserve the role from the validated token for endpoint authorization.
    user.account_type = account_type
    return user

async def get_current_adult(user = Depends(get_current_user)):
    """Blocks child accounts from accessing adult-only endpoints."""
    if user.account_type != "adult":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to guardians and teachers"
        )
    return user

async def get_current_child(user = Depends(get_current_user)):
    """Blocks adult accounts from accessing child-only endpoints like reading quests."""
    if user.account_type != "child":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to child readers"
        )
    return user