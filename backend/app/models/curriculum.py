from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    event,
    select,
)
from sqlalchemy import (
    Enum as SqlEnum,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship

from app.models.base import Base
from app.models.enums import (
    ActivityType,
    BookSource,
    ChildBookStatus,
    ContentStatus,
    ReadingTextType,
)
from app.utils.tokenizer import tokenize_text

JsonType = JSONB().with_variant(JSON(), "sqlite")


class Learner(Base):
    __tablename__ = "child_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    stars_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    primary_skill_id: Mapped[str] = mapped_column(ForeignKey("skills.id"), nullable=False)
    type: Mapped[ActivityType] = mapped_column(
        SqlEnum(ActivityType, name="activity_type", values_callable=lambda values: [v.value for v in values]),
        nullable=False,
    )
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[dict] = mapped_column(JsonType, default=dict, nullable=False)
    reading_text: Mapped["ReadingText | None"] = relationship(
        back_populates="activity", uselist=False
    )


class Book(Base):
    __tablename__ = "books"
    __table_args__ = (CheckConstraint("level BETWEEN 1 AND 10", name="ck_books_level_range"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    author: Mapped[str] = mapped_column(String(240), nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[dict] = mapped_column(JsonType, nullable=False)
    cover_url: Mapped[str | None] = mapped_column(String(2048))
    content_status: Mapped[ContentStatus] = mapped_column(
        SqlEnum(
            ContentStatus,
            name="content_status",
            values_callable=lambda values: [v.value for v in values],
        ),
        nullable=False,
    )
    source: Mapped[BookSource] = mapped_column(
        SqlEnum(
            BookSource,
            name="book_source",
            values_callable=lambda values: [v.value for v in values],
        ),
        nullable=False,
    )
    attribution: Mapped[dict] = mapped_column(JsonType, default=dict, nullable=False)

    skills: Mapped[list["BookSkill"]] = relationship(
        back_populates="book", cascade="all, delete-orphan"
    )
    progress: Mapped[list["ChildBook"]] = relationship(
        back_populates="book", cascade="all, delete-orphan"
    )


class BookSkill(Base):
    __tablename__ = "book_skills"
    __table_args__ = (
        CheckConstraint("weight >= 0 AND weight <= 1", name="ck_book_skills_weight_range"),
    )

    book_id: Mapped[str] = mapped_column(
        ForeignKey("books.id", ondelete="CASCADE"), primary_key=True
    )
    skill_id: Mapped[str] = mapped_column(
        ForeignKey("skills.id", ondelete="RESTRICT"), primary_key=True
    )
    weight: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    book: Mapped[Book] = relationship(back_populates="skills")


class ChildBook(Base):
    __tablename__ = "child_books"

    child_id: Mapped[str] = mapped_column(
        ForeignKey("child_profiles.id", ondelete="CASCADE"), primary_key=True
    )
    book_id: Mapped[str] = mapped_column(
        ForeignKey("books.id", ondelete="CASCADE"), primary_key=True
    )
    status: Mapped[ChildBookStatus] = mapped_column(
        SqlEnum(
            ChildBookStatus,
            name="child_book_status",
            values_callable=lambda values: [v.value for v in values],
        ),
        nullable=False,
    )
    last_page: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    minutes_read: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    book: Mapped[Book] = relationship(back_populates="progress")


class ReadingText(Base):
    __tablename__ = "reading_texts"
    __table_args__ = (
        UniqueConstraint("activity_id", name="uq_reading_texts_activity_id"),
        CheckConstraint("level BETWEEN 1 AND 10", name="ck_reading_texts_level_range"),
        CheckConstraint("word_count >= 0", name="ck_reading_texts_word_count"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    activity_id: Mapped[str] = mapped_column(
        ForeignKey("activities.id", ondelete="RESTRICT"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    text_type: Mapped[ReadingTextType] = mapped_column(
        SqlEnum(
            ReadingTextType,
            name="reading_text_type",
            values_callable=lambda values: [v.value for v in values],
        ),
        nullable=False,
    )
    expected_words: Mapped[list[str]] = mapped_column(JsonType, nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    activity: Mapped[Activity] = relationship(back_populates="reading_text")

    @classmethod
    def from_text(
        cls, row_id: str, activity: Activity, text_type: ReadingTextType, text: str
    ) -> "ReadingText":
        expected_words = tokenize_text(text)
        return cls(
            id=row_id,
            activity_id=activity.id,
            text=text,
            text_type=text_type,
            expected_words=expected_words,
            word_count=len(expected_words),
            level=activity.difficulty,
        )


@event.listens_for(ReadingText, "before_insert")
@event.listens_for(ReadingText, "before_update")
def populate_reading_text_tokens(_mapper, _connection, target: ReadingText) -> None:
    target.expected_words = tokenize_text(target.text)
    target.word_count = len(target.expected_words)


@event.listens_for(Session, "before_flush")
def validate_curriculum_links(session: Session, _flush_context, _instances) -> None:
    reading_texts = [
        item
        for item in (*session.new, *session.dirty)
        if isinstance(item, ReadingText)
    ]
    for reading_text in reading_texts:
        activity = reading_text.activity or next(
            (
                item
                for item in (*session.new, *session.dirty)
                if isinstance(item, Activity) and item.id == reading_text.activity_id
            ),
            None,
        )
        if activity is None:
            activity = session.get(Activity, reading_text.activity_id)
        if activity is None:
            raise ValueError(
                f"Reading text {reading_text.id} references a missing activity"
            )
        if reading_text.level != activity.difficulty:
            raise ValueError(
                f"Reading text {reading_text.id} level must match its activity difficulty"
            )

    pending_links = [
        item for item in (*session.new, *session.dirty) if isinstance(item, BookSkill)
    ]
    for book_id in {link.book_id for link in pending_links}:
        with session.no_autoflush:
            weights = list(
                session.scalars(select(BookSkill).where(BookSkill.book_id == book_id))
            )
        pending = [
            link
            for link in pending_links
            if link.book_id == book_id and link not in weights
        ]
        if sum((Decimal(link.weight) for link in [*weights, *pending]), Decimal(0)) != Decimal(
            1
        ):
            raise ValueError(f"Book skill weights must sum to 1 for {book_id}")
