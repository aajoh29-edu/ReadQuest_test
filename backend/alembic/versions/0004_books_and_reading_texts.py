"""Create books and read-aloud tables.

Revision ID: 0004
Revises: 0003
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    book_source = sa.Enum(
        "original", "public_domain", "licensed_edition", name="book_source"
    )
    child_book_status = sa.Enum(
        "started", "finished", "favorite", name="child_book_status"
    )
    reading_text_type = sa.Enum(
        "word", "sentence", "passage", name="reading_text_type"
    )

    op.create_table(
        "books",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("author", sa.String(240), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(120), nullable=False),
        sa.Column("word_count", sa.Integer(), nullable=False),
        sa.Column("content", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("cover_url", sa.String(2048)),
        sa.Column(
            "content_status",
            postgresql.ENUM(
                "draft", "published", "archived",
                name="content_status",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("source", book_source, nullable=False),
        sa.Column("attribution", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.CheckConstraint("level BETWEEN 1 AND 10", name="ck_books_level_range"),
    )
    op.create_index(
        "ix_books_published_catalog",
        "books",
        ["content_status", "level", "category"],
    )
    op.create_table(
        "book_skills",
        sa.Column(
            "book_id",
            sa.String(64),
            sa.ForeignKey("books.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "skill_id",
            sa.String(64),
            sa.ForeignKey("skills.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column("weight", sa.Numeric(4, 3), nullable=False),
        sa.CheckConstraint(
            "weight >= 0 AND weight <= 1", name="ck_book_skills_weight_range"
        ),
    )
    op.create_table(
        "child_books",
        sa.Column(
            "child_id",
            sa.String(64),
            sa.ForeignKey("child_profiles.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "book_id",
            sa.String(64),
            sa.ForeignKey("books.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("status", child_book_status, nullable=False),
        sa.Column("last_page", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("minutes_read", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "reading_texts",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "activity_id",
            sa.String(64),
            sa.ForeignKey("activities.id", ondelete="RESTRICT"),
            nullable=False,
            unique=True,
        ),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("text_type", reading_text_type, nullable=False),
        sa.Column(
            "expected_words", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("word_count", sa.Integer(), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.CheckConstraint("level BETWEEN 1 AND 10", name="ck_reading_texts_level_range"),
        sa.CheckConstraint("word_count >= 0", name="ck_reading_texts_word_count"),
    )


def downgrade() -> None:
    op.drop_table("reading_texts")
    op.drop_table("child_books")
    op.drop_table("book_skills")
    op.drop_index("ix_books_published_catalog", table_name="books")
    op.drop_table("books")
    for enum_name in ("reading_text_type", "child_book_status", "book_source"):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
