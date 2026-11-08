import enum
from datetime import datetime, timezone
from sqlalchemy import Integer, String, ForeignKey, DateTime, Boolean, Enum, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

# Import the engine from your database config and all models
from database import engine, Base

class AdultRole(str, enum.Enum):
    GUARDIAN = "guardian"
    TEACHER = "teacher"
    ADMIN = "admin"

class AdultAccount(Base):
    """
    Holds all PII. Only for Guardians, Teachers, and Admins.
    """
    __tablename__ = "adult_accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[AdultRole] = mapped_column(Enum(AdultRole), nullable=False)
    
    # COPPA Requirement: Record of verifiable parental consent
    consent_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    children: Mapped[list["ChildReader"]] = relationship("ChildReader", back_populates="guardian", cascade="all, delete-orphan")
    classrooms: Mapped[list["Classroom"]] = relationship("Classroom", back_populates="teacher")


class ChildReader(Base):
    """
    Strictly isolated. No PII columns exist on this table.
    """
    __tablename__ = "child_readers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guardian_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("adult_accounts.id", ondelete="CASCADE"), nullable=False)
    
    # Anonymous identifiers only
    anonymous_username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    avatar_id: Mapped[str] = mapped_column(String(50), nullable=False, default="default_hero")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    guardian: Mapped["AdultAccount"] = relationship("AdultAccount", back_populates="children")
    enrollments: Mapped[list["ClassroomEnrollment"]] = relationship("ClassroomEnrollment", back_populates="child")
    mastery_records: Mapped[list["ReadingMastery"]] = relationship("ReadingMastery", back_populates="child", cascade="all, delete-orphan")


class Classroom(Base):
    __tablename__ = "classrooms"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("adult_accounts.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    join_code: Mapped[str] = mapped_column(String(10), unique=True, index=True, nullable=False)

    teacher: Mapped["AdultAccount"] = relationship("AdultAccount", back_populates="classrooms")
    enrollments: Mapped[list["ClassroomEnrollment"]] = relationship("ClassroomEnrollment", back_populates="classroom", cascade="all, delete-orphan")


class ClassroomEnrollment(Base):
    """
    Many-to-Many mapping tying a Child's anonymous profile to a Teacher's classroom.
    """
    __tablename__ = "classroom_enrollments"

    classroom_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("classrooms.id", ondelete="CASCADE"), primary_key=True)
    child_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("child_readers.id", ondelete="CASCADE"), primary_key=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    classroom: Mapped["Classroom"] = relationship("Classroom", back_populates="enrollments")
    child: Mapped["ChildReader"] = relationship("ChildReader", back_populates="enrollments")


class ReadingMastery(Base):
    """
    Progress data is strictly tied to the anonymous Child profile.
    """
    __tablename__ = "reading_mastery"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("child_readers.id", ondelete="CASCADE"), nullable=False)
    skill_key: Mapped[str] = mapped_column(String(100), nullable=False)
    mastery_score: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    child: Mapped["ChildReader"] = relationship("ChildReader", back_populates="mastery_records")
