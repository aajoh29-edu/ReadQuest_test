from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import (
    Enum as SqlEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.curriculum import JsonType
from app.models.enums import (
    VoiceAttemptStatus,
    VoiceProvider,
    VoiceScope,
    WordResultType,
)


def enum_values(values):
    return [value.value for value in values]


class VoiceConsent(Base):
    __tablename__ = "voice_consents"
    __table_args__ = (
        UniqueConstraint(
            "child_id", "provider", "scope", name="uq_voice_consents_child_provider_scope"
        ),
    )

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: uuid4().hex
    )
    child_id: Mapped[str] = mapped_column(
        ForeignKey("child_profiles.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[VoiceProvider] = mapped_column(
        SqlEnum(VoiceProvider, name="voice_provider", values_callable=enum_values),
        nullable=False,
    )
    scope: Mapped[VoiceScope] = mapped_column(
        SqlEnum(VoiceScope, name="voice_scope", values_callable=enum_values),
        nullable=False,
    )
    granted: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    granted_by: Mapped[str | None] = mapped_column(String(128))
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class VoiceAttempt(Base):
    __tablename__ = "voice_attempts"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: uuid4().hex
    )
    child_id: Mapped[str] = mapped_column(
        ForeignKey("child_profiles.id", ondelete="CASCADE"), nullable=False
    )
    activity_id: Mapped[str] = mapped_column(
        ForeignKey("activities.id", ondelete="RESTRICT"), nullable=False
    )
    reading_text_id: Mapped[str] = mapped_column(
        ForeignKey("reading_texts.id", ondelete="RESTRICT"), nullable=False
    )
    transcript: Mapped[str] = mapped_column(Text, nullable=False)
    word_confidences: Mapped[list[float]] = mapped_column(JsonType, nullable=False)
    accuracy: Mapped[float] = mapped_column(Float, nullable=False)
    wcpm: Mapped[float] = mapped_column(Float, nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    provider: Mapped[VoiceProvider] = mapped_column(
        SqlEnum(VoiceProvider, name="voice_provider", values_callable=enum_values),
        nullable=False,
    )
    status: Mapped[VoiceAttemptStatus] = mapped_column(
        SqlEnum(
            VoiceAttemptStatus, name="voice_attempt_status", values_callable=enum_values
        ),
        nullable=False,
    )
    audio_retention: Mapped[str] = mapped_column(
        String(16), default="none", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    mastery_attempt_id: Mapped[str | None] = mapped_column(
        ForeignKey("attempts.id", ondelete="SET NULL"), unique=True
    )
    word_results: Mapped[list["WordResult"]] = relationship(
        back_populates="voice_attempt",
        cascade="all, delete-orphan",
        order_by="WordResult.result_index",
    )


class WordResult(Base):
    __tablename__ = "word_results"
    __table_args__ = (
        UniqueConstraint(
            "voice_attempt_id",
            "result_index",
            name="uq_word_results_attempt_index",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: uuid4().hex
    )
    voice_attempt_id: Mapped[str] = mapped_column(
        ForeignKey("voice_attempts.id", ondelete="CASCADE"), nullable=False
    )
    result_index: Mapped[int] = mapped_column(Integer, nullable=False)
    expected_index: Mapped[int | None] = mapped_column(Integer)
    expected_word: Mapped[str | None] = mapped_column(String(120))
    actual_word: Mapped[str | None] = mapped_column(String(120))
    result_type: Mapped[WordResultType] = mapped_column(
        SqlEnum(WordResultType, name="word_result_type", values_callable=enum_values),
        nullable=False,
    )
    confidence: Mapped[float | None] = mapped_column(Float)
    voice_attempt: Mapped[VoiceAttempt] = relationship(back_populates="word_results")
