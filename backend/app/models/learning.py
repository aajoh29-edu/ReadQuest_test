from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import MasteryBand, MasteryConfidence, RecommendationStatus
from app.models.mixins import CreatedAtMixin
from app.models.types import database_enum

if TYPE_CHECKING:
    from app.models.curriculum import Activity, Skill
    from app.models.identity import ChildProfile


class Attempt(CreatedAtMixin, Base):
    __tablename__ = "attempts"
    __table_args__ = (
        CheckConstraint(
            "response_ms IS NULL OR response_ms BETWEEN 0 AND 3600000",
            name="response_ms_range",
        ),
        Index("ix_attempts_child_occurred", "child_id", "occurred_at"),
        Index("ix_attempts_child_activity", "child_id", "activity_id"),
        Index("ix_attempts_activity_id", "activity_id"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    child_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("child_profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    activity_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("activities.id", ondelete="RESTRICT"), nullable=False
    )
    is_correct: Mapped[bool] = mapped_column(nullable=False)
    response_ms: Mapped[int | None] = mapped_column(Integer)
    answer: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    child: Mapped[ChildProfile] = relationship(back_populates="attempts")
    activity: Mapped[Activity] = relationship(back_populates="attempts")
    triggered_recommendations: Mapped[list[Recommendation]] = relationship(
        back_populates="triggering_attempt"
    )


class SkillMastery(Base):
    __tablename__ = "skill_mastery"
    __table_args__ = (
        CheckConstraint("score BETWEEN 0 AND 1", name="score_range"),
        CheckConstraint("attempt_count >= 0", name="attempt_count_nonnegative"),
        CheckConstraint("version >= 1", name="version_positive"),
        Index("ix_skill_mastery_child_band", "child_id", "band"),
        Index("ix_skill_mastery_skill_score", "skill_id", "score"),
    )

    child_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("child_profiles.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    skill_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("skills.id", ondelete="RESTRICT"), primary_key=True
    )
    score: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    band: Mapped[MasteryBand] = mapped_column(
        database_enum(MasteryBand, "mastery_band"), nullable=False
    )
    confidence: Mapped[MasteryConfidence] = mapped_column(
        database_enum(MasteryConfidence, "mastery_confidence"), nullable=False
    )
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_practiced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    algorithm_version: Mapped[str] = mapped_column(String(30), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __mapper_args__ = {"version_id_col": version}

    child: Mapped[ChildProfile] = relationship(back_populates="mastery_records")
    skill: Mapped[Skill] = relationship(back_populates="mastery_records")


class Recommendation(CreatedAtMixin, Base):
    __tablename__ = "recommendations"
    __table_args__ = (
        CheckConstraint("priority_score BETWEEN 0 AND 1", name="priority_score_range"),
        Index("ix_recommendations_child_created", "child_id", "created_at"),
        Index("ix_recommendations_child_status", "child_id", "status"),
        Index("ix_recommendations_triggering_attempt", "triggering_attempt_id"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    child_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("child_profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    activity_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("activities.id", ondelete="RESTRICT"), nullable=False
    )
    triggering_attempt_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("attempts.id", ondelete="SET NULL")
    )
    priority_score: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    reason_code: Mapped[str] = mapped_column(String(50), nullable=False)
    reason_details: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    algorithm_version: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[RecommendationStatus] = mapped_column(
        database_enum(RecommendationStatus, "recommendation_status"),
        nullable=False,
        default=RecommendationStatus.SERVED,
        server_default=RecommendationStatus.SERVED.value,
    )

    child: Mapped[ChildProfile] = relationship(back_populates="recommendations")
    activity: Mapped[Activity] = relationship(back_populates="recommendations")
    triggering_attempt: Mapped[Attempt | None] = relationship(
        back_populates="triggered_recommendations"
    )
