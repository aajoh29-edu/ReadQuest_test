from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db_session


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str


router = APIRouter(tags=["operations"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Liveness check: the API process can answer requests."""
    return HealthResponse(status="ok", service="readquest-api")


@router.get("/ready", response_model=HealthResponse)
def ready(session: Session = Depends(get_db_session)) -> HealthResponse:
    """Readiness check: the API can reach PostgreSQL."""
    try:
        session.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="database unavailable") from error
    return HealthResponse(status="ok", service="readquest-api")
