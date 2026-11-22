"""Add browser-first voice attempts and guardian consent.

Revision ID: 0005
Revises: 0004
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    voice_provider = sa.Enum("web_speech", name="voice_provider")
    voice_scope = sa.Enum("read_aloud_assessment", name="voice_scope")
    voice_status = sa.Enum("completed", "rejected", name="voice_attempt_status")
    word_result_type = sa.Enum(
        "correct",
        "substitution",
        "omission",
        "insertion",
        "self_correction",
        name="word_result_type",
    )

    op.create_table(
        "voice_consents",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "child_id",
            sa.String(64),
            sa.ForeignKey("child_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", voice_provider, nullable=False),
        sa.Column("scope", voice_scope, nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("granted_by", sa.String(128)),
        sa.Column(
            "granted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint(
            "child_id",
            "provider",
            "scope",
            name="uq_voice_consents_child_provider_scope",
        ),
    )
    op.create_table(
        "voice_attempts",
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
            "reading_text_id",
            sa.String(64),
            sa.ForeignKey("reading_texts.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("transcript", sa.Text(), nullable=False),
        sa.Column(
            "word_confidences", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("accuracy", sa.Float(), nullable=False),
        sa.Column("wcpm", sa.Float(), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=False),
        sa.Column("provider", voice_provider, nullable=False),
        sa.Column("status", voice_status, nullable=False),
        sa.Column(
            "audio_retention",
            sa.String(16),
            nullable=False,
            server_default="none",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "mastery_attempt_id",
            sa.String(64),
            sa.ForeignKey("attempts.id", ondelete="SET NULL"),
            unique=True,
        ),
    )
    op.create_table(
        "word_results",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "voice_attempt_id",
            sa.String(64),
            sa.ForeignKey("voice_attempts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("result_index", sa.Integer(), nullable=False),
        sa.Column("expected_index", sa.Integer()),
        sa.Column("expected_word", sa.String(120)),
        sa.Column("actual_word", sa.String(120)),
        sa.Column("result_type", word_result_type, nullable=False),
        sa.Column("confidence", sa.Float()),
        sa.UniqueConstraint(
            "voice_attempt_id", "result_index", name="uq_word_results_attempt_index"
        ),
    )
    op.create_index(
        "ix_voice_attempts_child_created",
        "voice_attempts",
        ["child_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_voice_attempts_child_created", table_name="voice_attempts")
    op.drop_table("word_results")
    op.drop_table("voice_attempts")
    op.drop_table("voice_consents")
    for enum_name in (
        "word_result_type",
        "voice_attempt_status",
        "voice_scope",
        "voice_provider",
    ):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
