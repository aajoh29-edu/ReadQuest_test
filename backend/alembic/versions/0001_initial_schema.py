"""Create the ReadQuest MVP schema.

Revision ID: 0001
Revises: None
Create Date: 2026-09-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

user_role = postgresql.ENUM(
    "child", "parent", "teacher", "admin", name="user_role", create_type=False
)
user_status = postgresql.ENUM(
    "active", "disabled", "pending", name="user_status", create_type=False
)
class_status = postgresql.ENUM("active", "archived", name="class_status", create_type=False)
enrollment_status = postgresql.ENUM(
    "active", "removed", name="enrollment_status", create_type=False
)
content_status = postgresql.ENUM(
    "draft", "published", "archived", name="content_status", create_type=False
)
activity_type = postgresql.ENUM(
    "multiple_choice", "word_match", "read_and_answer", name="activity_type", create_type=False
)
mastery_band = postgresql.ENUM(
    "high_priority",
    "additional_practice",
    "normal_review",
    "mastered",
    name="mastery_band",
    create_type=False,
)
mastery_confidence = postgresql.ENUM(
    "low", "medium", "high", name="mastery_confidence", create_type=False
)
recommendation_status = postgresql.ENUM(
    "served", "accepted", "dismissed", "expired", name="recommendation_status", create_type=False
)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")
    bind = op.get_bind()
    for enum_type in (
        user_role,
        user_status,
        class_status,
        enrollment_status,
        content_status,
        activity_type,
        mastery_band,
        mastery_confidence,
        recommendation_status,
    ):
        enum_type.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("status", user_status, server_default="active", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_role_status", "users", ["role", "status"])

    op.create_table(
        "child_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("display_name", sa.String(80), nullable=False),
        sa.Column("grade_level", sa.SmallInteger(), nullable=True),
        sa.Column("current_level", sa.SmallInteger(), server_default="1", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("grade_level BETWEEN 0 AND 12", name="grade_level_range"),
        sa.CheckConstraint("current_level BETWEEN 1 AND 10", name="current_level_range"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_child_profiles_user_id_users", ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_child_profiles"),
        sa.UniqueConstraint("user_id", name="uq_child_profiles_user_id"),
    )
    op.create_table(
        "guardian_children",
        sa.Column("guardian_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("relationship_label", sa.String(40), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["guardian_id"],
            ["users.id"],
            name="fk_guardian_children_guardian_id_users",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["child_id"],
            ["child_profiles.id"],
            name="fk_guardian_children_child_id_child_profiles",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("guardian_id", "child_id", name="pk_guardian_children"),
    )
    op.create_index("ix_guardian_children_child_id", "guardian_children", ["child_id"])

    op.create_table(
        "classes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("join_code", sa.String(20), nullable=False),
        sa.Column("status", class_status, server_default="active", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["teacher_id"], ["users.id"], name="fk_classes_teacher_id_users", ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_classes"),
        sa.UniqueConstraint("join_code", name="uq_classes_join_code"),
    )
    op.create_index("ix_classes_teacher_status", "classes", ["teacher_id", "status"])
    op.create_table(
        "enrollments",
        sa.Column("class_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "enrolled_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("status", enrollment_status, server_default="active", nullable=False),
        sa.ForeignKeyConstraint(
            ["class_id"], ["classes.id"], name="fk_enrollments_class_id_classes", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["child_id"],
            ["child_profiles.id"],
            name="fk_enrollments_child_id_child_profiles",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("class_id", "child_id", name="pk_enrollments"),
    )
    op.create_index("ix_enrollments_child_status", "enrollments", ["child_id", "status"])

    op.create_table(
        "skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("category", sa.String(60), nullable=False),
        sa.Column("level", sa.SmallInteger(), nullable=False),
        sa.Column("status", content_status, server_default="draft", nullable=False),
        sa.CheckConstraint("level BETWEEN 1 AND 10", name="level_range"),
        sa.PrimaryKeyConstraint("id", name="pk_skills"),
        sa.UniqueConstraint("code", name="uq_skills_code"),
    )
    op.create_index("ix_skills_category_level_status", "skills", ["category", "level", "status"])
    op.create_table(
        "lessons",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("status", content_status, server_default="draft", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("sequence >= 0", name="sequence_nonnegative"),
        sa.PrimaryKeyConstraint("id", name="pk_lessons"),
    )
    op.create_index("ix_lessons_status_sequence", "lessons", ["status", "sequence"])
    op.create_table(
        "activities",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("activity_type", activity_type, nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column(
            "content", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False
        ),
        sa.Column("difficulty", sa.SmallInteger(), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("status", content_status, server_default="draft", nullable=False),
        sa.CheckConstraint("difficulty BETWEEN 1 AND 10", name="difficulty_range"),
        sa.CheckConstraint("sequence >= 0", name="sequence_nonnegative"),
        sa.ForeignKeyConstraint(
            ["lesson_id"],
            ["lessons.id"],
            name="fk_activities_lesson_id_lessons",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_activities"),
        sa.UniqueConstraint("lesson_id", "sequence", name="uq_activities_lesson_sequence"),
    )
    op.create_index("ix_activities_status_difficulty", "activities", ["status", "difficulty"])
    op.create_table(
        "activity_skills",
        sa.Column("activity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("weight", sa.Numeric(4, 3), nullable=False),
        sa.CheckConstraint("weight > 0 AND weight <= 1", name="weight_range"),
        sa.ForeignKeyConstraint(
            ["activity_id"],
            ["activities.id"],
            name="fk_activity_skills_activity_id_activities",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["skill_id"],
            ["skills.id"],
            name="fk_activity_skills_skill_id_skills",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("activity_id", "skill_id", name="pk_activity_skills"),
    )
    op.create_index("ix_activity_skills_skill_id", "activity_skills", ["skill_id"])

    op.create_table(
        "attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("activity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("response_ms", sa.Integer(), nullable=True),
        sa.Column("answer", postgresql.JSONB(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "response_ms IS NULL OR response_ms BETWEEN 0 AND 3600000",
            name="response_ms_range",
        ),
        sa.ForeignKeyConstraint(
            ["activity_id"],
            ["activities.id"],
            name="fk_attempts_activity_id_activities",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["child_id"],
            ["child_profiles.id"],
            name="fk_attempts_child_id_child_profiles",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_attempts"),
    )
    op.create_index("ix_attempts_activity_id", "attempts", ["activity_id"])
    op.create_index("ix_attempts_child_activity", "attempts", ["child_id", "activity_id"])
    op.create_index("ix_attempts_child_occurred", "attempts", ["child_id", "occurred_at"])
    op.create_table(
        "skill_mastery",
        sa.Column("child_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Numeric(5, 4), nullable=False),
        sa.Column("band", mastery_band, nullable=False),
        sa.Column("confidence", mastery_confidence, nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("last_practiced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("algorithm_version", sa.String(30), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("score BETWEEN 0 AND 1", name="score_range"),
        sa.CheckConstraint("attempt_count >= 0", name="attempt_count_nonnegative"),
        sa.CheckConstraint("version >= 1", name="version_positive"),
        sa.ForeignKeyConstraint(
            ["child_id"],
            ["child_profiles.id"],
            name="fk_skill_mastery_child_id_child_profiles",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["skill_id"],
            ["skills.id"],
            name="fk_skill_mastery_skill_id_skills",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("child_id", "skill_id", name="pk_skill_mastery"),
    )
    op.create_index("ix_skill_mastery_child_band", "skill_mastery", ["child_id", "band"])
    op.create_index("ix_skill_mastery_skill_score", "skill_mastery", ["skill_id", "score"])
    op.create_table(
        "recommendations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("activity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("triggering_attempt_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("priority_score", sa.Numeric(5, 4), nullable=False),
        sa.Column("reason_code", sa.String(50), nullable=False),
        sa.Column(
            "reason_details",
            postgresql.JSONB(),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("algorithm_version", sa.String(30), nullable=False),
        sa.Column("status", recommendation_status, server_default="served", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("priority_score BETWEEN 0 AND 1", name="priority_score_range"),
        sa.ForeignKeyConstraint(
            ["activity_id"],
            ["activities.id"],
            name="fk_recommendations_activity_id_activities",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["child_id"],
            ["child_profiles.id"],
            name="fk_recommendations_child_id_child_profiles",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["triggering_attempt_id"],
            ["attempts.id"],
            name="fk_recommendations_triggering_attempt_id_attempts",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_recommendations"),
    )
    op.create_index(
        "ix_recommendations_child_created", "recommendations", ["child_id", "created_at"]
    )
    op.create_index("ix_recommendations_child_status", "recommendations", ["child_id", "status"])
    op.create_index(
        "ix_recommendations_triggering_attempt", "recommendations", ["triggering_attempt_id"]
    )


def downgrade() -> None:
    for table_name in (
        "recommendations",
        "skill_mastery",
        "attempts",
        "activity_skills",
        "activities",
        "lessons",
        "skills",
        "enrollments",
        "classes",
        "guardian_children",
        "child_profiles",
        "users",
    ):
        op.drop_table(table_name)

    bind = op.get_bind()
    for enum_type in (
        recommendation_status,
        mastery_confidence,
        mastery_band,
        activity_type,
        content_status,
        enrollment_status,
        class_status,
        user_status,
        user_role,
    ):
        enum_type.drop(bind, checkfirst=True)
