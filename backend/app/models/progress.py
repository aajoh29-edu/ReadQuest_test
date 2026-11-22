from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.curriculum import JsonType


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: uuid4().hex
    )
    child_id: Mapped[str] = mapped_column(
        ForeignKey("child_profiles.id", ondelete="CASCADE"), nullable=False
    )
    activity_id: Mapped[str] = mapped_column(
        ForeignKey("activities.id", ondelete="RESTRICT"), nullable=False
    )
    skill_id: Mapped[str] = mapped_column(
        ForeignKey("skills.id", ondelete="RESTRICT"), nullable=False
    )
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    answer: Mapped[dict] = mapped_column(JsonType, nullable=False)
    active_duration_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class SkillMastery(Base):
    __tablename__ = "skill_mastery"

    child_id: Mapped[str] = mapped_column(
        ForeignKey("child_profiles.id", ondelete="CASCADE"), primary_key=True
    )
    skill_id: Mapped[str] = mapped_column(
        ForeignKey("skills.id", ondelete="RESTRICT"), primary_key=True
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy: Mapped[float] = mapped_column(Float, nullable=False)
    window_attempt_count: Mapped[int] = mapped_column(Integer, nullable=False)
    total_attempt_count: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
