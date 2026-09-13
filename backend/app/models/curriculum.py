from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING, Any
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ActivityType, ContentStatus
from app.models.mixins import TimestampMixin
from app.models.types import database_enum

if TYPE_CHECKING:
    from app.models.learning import Attempt, Recommendation, SkillMastery


class Skill(Base):
    __tablename__ = "skills"
    __table_args__ = (
        CheckConstraint("level BETWEEN 1 AND 10", name="level_range"),
        Index("ix_skills_category_level_status", "category", "level", "status"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(60), nullable=False)
    level: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    status: Mapped[ContentStatus] = mapped_column(
        database_enum(ContentStatus, "content_status"),
        nullable=False,
        default=ContentStatus.DRAFT,
        server_default=ContentStatus.DRAFT.value,
    )

    activity_links: Mapped[list[ActivitySkill]] = relationship(back_populates="skill")
    mastery_records: Mapped[list[SkillMastery]] = relationship(back_populates="skill")


class Lesson(TimestampMixin, Base):
    __tablename__ = "lessons"
    __table_args__ = (
        CheckConstraint("sequence >= 0", name="sequence_nonnegative"),
        Index("ix_lessons_status_sequence", "status", "sequence"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ContentStatus] = mapped_column(
        database_enum(ContentStatus, "content_status"),
        nullable=False,
        default=ContentStatus.DRAFT,
        server_default=ContentStatus.DRAFT.value,
    )

    activities: Mapped[list[Activity]] = relationship(back_populates="lesson")


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (
        CheckConstraint("difficulty BETWEEN 1 AND 10", name="difficulty_range"),
        CheckConstraint("sequence >= 0", name="sequence_nonnegative"),
        UniqueConstraint("lesson_id", "sequence", name="uq_activities_lesson_sequence"),
        Index("ix_activities_status_difficulty", "status", "difficulty"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    lesson_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("lessons.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    activity_type: Mapped[ActivityType] = mapped_column(
        database_enum(ActivityType, "activity_type"), nullable=False
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    difficulty: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ContentStatus] = mapped_column(
        database_enum(ContentStatus, "content_status"),
        nullable=False,
        default=ContentStatus.DRAFT,
        server_default=ContentStatus.DRAFT.value,
    )

    lesson: Mapped[Lesson] = relationship(back_populates="activities")
    skill_links: Mapped[list[ActivitySkill]] = relationship(
        back_populates="activity", cascade="all, delete-orphan"
    )
    attempts: Mapped[list[Attempt]] = relationship(back_populates="activity")
    recommendations: Mapped[list[Recommendation]] = relationship(back_populates="activity")


class ActivitySkill(Base):
    __tablename__ = "activity_skills"
    __table_args__ = (
        CheckConstraint("weight > 0 AND weight <= 1", name="weight_range"),
        Index("ix_activity_skills_skill_id", "skill_id"),
    )

    activity_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("activities.id", ondelete="CASCADE"),
        primary_key=True,
    )
    skill_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    weight: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)

    activity: Mapped[Activity] = relationship(back_populates="skill_links")
    skill: Mapped[Skill] = relationship(back_populates="activity_links")
