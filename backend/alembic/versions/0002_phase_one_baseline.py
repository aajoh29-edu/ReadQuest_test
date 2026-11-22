"""Minimal Phase 1 foundation required by the standalone backend.

Revision ID: 0002
Revises:
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "CREATE TYPE activity_type AS ENUM "
        "('multiple_choice_sound', 'phonics_blending', 'sight_word_cloze', "
        "'reading_comprehension')"
    )
    content_status = sa.Enum(
        "draft", "published", "archived", name="content_status"
    )
    activity_type = postgresql.ENUM(
        "multiple_choice_sound",
        "phonics_blending",
        "sight_word_cloze",
        "reading_comprehension",
        name="activity_type",
        create_type=False,
    )

    op.create_table(
        "child_profiles",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("stars_earned", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "skills",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("code", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(160), nullable=False),
    )
    op.create_table(
        "activities",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "primary_skill_id",
            sa.String(64),
            sa.ForeignKey("skills.id"),
            nullable=False,
        ),
        sa.Column("type", activity_type, nullable=False),
        sa.Column("difficulty", sa.Integer(), nullable=False),
        sa.Column(
            "content",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "content_status",
            content_status,
            nullable=False,
            server_default="published",
        ),
    )
    op.create_table(
        "attempts",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "child_id",
            sa.String(64),
            sa.ForeignKey("child_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "activity_id",
            sa.String(64),
            sa.ForeignKey("activities.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "skill_id",
            sa.String(64),
            sa.ForeignKey("skills.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("answer", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("active_duration_seconds", sa.Float(), nullable=False),
        sa.Column(
            "attempted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_table(
        "skill_mastery",
        sa.Column(
            "child_id",
            sa.String(64),
            sa.ForeignKey("child_profiles.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "skill_id",
            sa.String(64),
            sa.ForeignKey("skills.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("accuracy", sa.Float(), nullable=False),
        sa.Column("window_attempt_count", sa.Integer(), nullable=False),
        sa.Column("total_attempt_count", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )


def downgrade() -> None:
    op.drop_table("skill_mastery")
    op.drop_table("attempts")
    op.drop_table("activities")
    op.drop_table("skills")
    op.drop_table("child_profiles")
    op.execute("DROP TYPE IF EXISTS content_status")
    op.execute("DROP TYPE IF EXISTS activity_type")
