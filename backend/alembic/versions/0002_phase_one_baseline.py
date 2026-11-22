"""Minimal Phase 1 foundation required by the standalone backend.

Revision ID: 0002
Revises:
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

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


def downgrade() -> None:
    op.drop_table("activities")
    op.drop_table("skills")
    op.drop_table("child_profiles")
    op.execute("DROP TYPE IF EXISTS content_status")
    op.execute("DROP TYPE IF EXISTS activity_type")
