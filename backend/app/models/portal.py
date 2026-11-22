from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.curriculum import JsonType


class Classroom(Base):
    __tablename__ = "classrooms"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: uuid4().hex
    )
    teacher_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    grade: Mapped[str] = mapped_column(String(80), nullable=False)
    school_name: Mapped[str] = mapped_column(String(240), default="", nullable=False)


class ClassroomEnrollment(Base):
    __tablename__ = "classroom_enrollments"

    class_id: Mapped[str] = mapped_column(
        ForeignKey("classrooms.id", ondelete="CASCADE"), primary_key=True
    )
    learner_id: Mapped[str] = mapped_column(
        ForeignKey("child_profiles.id", ondelete="CASCADE"), primary_key=True
    )


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: uuid4().hex
    )
    class_id: Mapped[str | None] = mapped_column(
        ForeignKey("classrooms.id", ondelete="SET NULL")
    )
    teacher_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    lesson_id: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    skill_id: Mapped[str | None] = mapped_column(String(64))
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    instructions: Mapped[str | None] = mapped_column(Text)
    assigned_learner_ids: Mapped[list[str]] = mapped_column(
        JsonType, default=list, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class AssignmentTarget(Base):
    __tablename__ = "assignment_targets"

    assignment_id: Mapped[str] = mapped_column(
        ForeignKey("assignments.id", ondelete="CASCADE"), primary_key=True
    )
    learner_id: Mapped[str] = mapped_column(
        ForeignKey("child_profiles.id", ondelete="CASCADE"), primary_key=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
