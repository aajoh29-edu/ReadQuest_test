"""Add complete authentication and learning application tables.

Revision ID: 0006
Revises: 0005
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("email", sa.String(320), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="parent"),
        sa.Column(
            "email_verified", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column(
            "practice_goal_minutes_per_day",
            sa.Integer(),
            nullable=False,
            server_default="20",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.add_column(
        "child_profiles",
        sa.Column("parent_user_id", sa.String(64), sa.ForeignKey("users.id", ondelete="CASCADE")),
    )
    op.add_column(
        "child_profiles",
        sa.Column("display_name", sa.String(120), nullable=False, server_default="Reader"),
    )
    op.add_column(
        "child_profiles",
        sa.Column("avatar", sa.String(80), nullable=False, server_default="fox"),
    )
    op.add_column(
        "child_profiles",
        sa.Column("avatar_name", sa.String(120), nullable=False, server_default="Fox Scout"),
    )
    op.add_column(
        "child_profiles",
        sa.Column("reading_level_id", sa.String(32), nullable=False, server_default="level-1"),
    )
    op.add_column(
        "child_profiles",
        sa.Column("grade_level", sa.String(80), nullable=False, server_default=""),
    )
    op.add_column(
        "child_profiles",
        sa.Column("current_streak_days", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "child_profiles",
        sa.Column(
            "badges",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "child_profiles",
        sa.Column(
            "total_active_practice_seconds",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "child_profiles", sa.Column("last_active_lesson_id", sa.String(64))
    )
    op.add_column(
        "child_profiles",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.add_column(
        "child_profiles",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index(
        "ix_child_profiles_parent_user_id", "child_profiles", ["parent_user_id"]
    )

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), unique=True, nullable=False),
        sa.Column("csrf_token_hash", sa.String(64), nullable=False),
        sa.Column(
            "active_learner_id",
            sa.String(64),
            sa.ForeignKey("child_profiles.id", ondelete="SET NULL"),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_table(
        "auth_tokens",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("purpose", sa.String(32), nullable=False),
        sa.Column("token_hash", sa.String(64), unique=True, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index("ix_auth_tokens_user_id", "auth_tokens", ["user_id"])

    op.create_table(
        "learning_sessions",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "learner_id",
            sa.String(64),
            sa.ForeignKey("child_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("lesson_id", sa.String(64), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column(
            "is_completed", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column(
            "current_activity_index", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_activities", sa.Integer(), nullable=False),
        sa.Column("accuracy", sa.Float(), nullable=False, server_default="0"),
        sa.Column(
            "total_active_duration_seconds",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("earned_badge", sa.String(240)),
    )
    op.create_index(
        "ix_learning_sessions_learner_id", "learning_sessions", ["learner_id"]
    )
    op.create_index("ix_learning_sessions_lesson_id", "learning_sessions", ["lesson_id"])

    op.add_column(
        "attempts",
        sa.Column(
            "session_id",
            sa.String(64),
            sa.ForeignKey("learning_sessions.id", ondelete="CASCADE"),
        ),
    )
    op.add_column("attempts", sa.Column("lesson_id", sa.String(64)))
    op.add_column("attempts", sa.Column("selected_option_id", sa.String(128)))
    op.add_column("attempts", sa.Column("correct_option_id", sa.String(128)))
    op.add_column("attempts", sa.Column("explanation", sa.String(4000)))
    op.add_column("attempts", sa.Column("idempotency_key", sa.String(128)))
    op.add_column(
        "attempts",
        sa.Column("attempt_number", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index("ix_attempts_session_id", "attempts", ["session_id"])
    op.create_unique_constraint(
        "uq_attempts_session_idempotency",
        "attempts",
        ["session_id", "idempotency_key"],
    )

    op.create_table(
        "classrooms",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "teacher_user_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column("grade", sa.String(80), nullable=False),
        sa.Column("school_name", sa.String(240), nullable=False, server_default=""),
    )
    op.create_index(
        "ix_classrooms_teacher_user_id", "classrooms", ["teacher_user_id"]
    )
    op.create_table(
        "classroom_enrollments",
        sa.Column(
            "class_id",
            sa.String(64),
            sa.ForeignKey("classrooms.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "learner_id",
            sa.String(64),
            sa.ForeignKey("child_profiles.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )
    op.create_table(
        "assignments",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "class_id",
            sa.String(64),
            sa.ForeignKey("classrooms.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "teacher_user_id",
            sa.String(64),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column("lesson_id", sa.String(64), nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("skill_id", sa.String(64)),
        sa.Column("due_date", sa.DateTime(timezone=True)),
        sa.Column("instructions", sa.Text()),
        sa.Column(
            "assigned_learner_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_table(
        "assignment_targets",
        sa.Column(
            "assignment_id",
            sa.String(64),
            sa.ForeignKey("assignments.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "learner_id",
            sa.String(64),
            sa.ForeignKey("child_profiles.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table("assignment_targets")
    op.drop_table("assignments")
    op.drop_table("classroom_enrollments")
    op.drop_table("classrooms")
    op.drop_constraint(
        "uq_attempts_session_idempotency", "attempts", type_="unique"
    )
    op.drop_index("ix_attempts_session_id", table_name="attempts")
    for name in (
        "attempt_number",
        "idempotency_key",
        "explanation",
        "correct_option_id",
        "selected_option_id",
        "lesson_id",
        "session_id",
    ):
        op.drop_column("attempts", name)
    op.drop_table("learning_sessions")
    op.drop_table("auth_tokens")
    op.drop_table("auth_sessions")
    op.drop_index("ix_child_profiles_parent_user_id", table_name="child_profiles")
    for name in (
        "updated_at",
        "created_at",
        "last_active_lesson_id",
        "total_active_practice_seconds",
        "badges",
        "current_streak_days",
        "grade_level",
        "reading_level_id",
        "avatar_name",
        "avatar",
        "display_name",
        "parent_user_id",
    ):
        op.drop_column("child_profiles", name)
    op.drop_table("users")
