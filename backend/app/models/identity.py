from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, SmallInteger, String, func
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ClassStatus, EnrollmentStatus, UserRole, UserStatus
from app.models.mixins import CreatedAtMixin, TimestampMixin
from app.models.types import database_enum

if TYPE_CHECKING:
    from app.models.learning import Attempt, Recommendation, SkillMastery


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (Index("ix_users_role_status", "role", "status"),)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(CITEXT(), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(database_enum(UserRole, "user_role"), nullable=False)
    status: Mapped[UserStatus] = mapped_column(
        database_enum(UserStatus, "user_status"),
        nullable=False,
        default=UserStatus.ACTIVE,
        server_default=UserStatus.ACTIVE.value,
    )

    child_profile: Mapped[ChildProfile | None] = relationship(
        back_populates="user", cascade="all, delete-orphan", single_parent=True
    )
    teaching_classes: Mapped[list[Classroom]] = relationship(back_populates="teacher")
    guardian_links: Mapped[list[GuardianChild]] = relationship(back_populates="guardian")


class ChildProfile(CreatedAtMixin, Base):
    __tablename__ = "child_profiles"
    __table_args__ = (
        CheckConstraint("grade_level BETWEEN 0 AND 12", name="grade_level_range"),
        CheckConstraint("current_level BETWEEN 1 AND 10", name="current_level_range"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), unique=True
    )
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    grade_level: Mapped[int | None] = mapped_column(SmallInteger)
    current_level: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, default=1, server_default="1"
    )

    user: Mapped[User] = relationship(back_populates="child_profile")
    guardian_links: Mapped[list[GuardianChild]] = relationship(back_populates="child")
    enrollments: Mapped[list[Enrollment]] = relationship(back_populates="child")
    attempts: Mapped[list[Attempt]] = relationship(back_populates="child")
    mastery_records: Mapped[list[SkillMastery]] = relationship(back_populates="child")
    recommendations: Mapped[list[Recommendation]] = relationship(back_populates="child")


class GuardianChild(CreatedAtMixin, Base):
    __tablename__ = "guardian_children"
    __table_args__ = (Index("ix_guardian_children_child_id", "child_id"),)

    guardian_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True
    )
    child_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("child_profiles.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    relationship_label: Mapped[str | None] = mapped_column(String(40))

    guardian: Mapped[User] = relationship(back_populates="guardian_links")
    child: Mapped[ChildProfile] = relationship(back_populates="guardian_links")


class Classroom(CreatedAtMixin, Base):
    __tablename__ = "classes"
    __table_args__ = (Index("ix_classes_teacher_status", "teacher_id", "status"),)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    teacher_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    join_code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    status: Mapped[ClassStatus] = mapped_column(
        database_enum(ClassStatus, "class_status"),
        nullable=False,
        default=ClassStatus.ACTIVE,
        server_default=ClassStatus.ACTIVE.value,
    )

    teacher: Mapped[User] = relationship(back_populates="teaching_classes")
    enrollments: Mapped[list[Enrollment]] = relationship(
        back_populates="classroom", cascade="all, delete-orphan"
    )


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (Index("ix_enrollments_child_status", "child_id", "status"),)

    class_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("classes.id", ondelete="CASCADE"),
        primary_key=True,
    )
    child_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("child_profiles.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[EnrollmentStatus] = mapped_column(
        database_enum(EnrollmentStatus, "enrollment_status"),
        nullable=False,
        default=EnrollmentStatus.ACTIVE,
        server_default=EnrollmentStatus.ACTIVE.value,
    )

    classroom: Mapped[Classroom] = relationship(back_populates="enrollments")
    child: Mapped[ChildProfile] = relationship(back_populates="enrollments")
