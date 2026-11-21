"""Add auditable adaptive learning plans."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

learning_plan_status = postgresql.ENUM(
    "draft",
    "active",
    "paused",
    "completed",
    "archived",
    name="learning_plan_status",
    create_type=False,
)
learning_plan_item_type = postgresql.ENUM(
    "skill",
    "activity",
    "book",
    "read_aloud",
    name="learning_plan_item_type",
    create_type=False,
)
learning_plan_item_status = postgresql.ENUM(
    "pending",
    "in_progress",
    "completed",
    "skipped",
    name="learning_plan_item_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    for enum_type in (
        learning_plan_status,
        learning_plan_item_type,
        learning_plan_item_status,
    ):
        enum_type.create(bind, checkfirst=True)

    op.create_table(
        "learning_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", learning_plan_status, server_default="draft", nullable=False),
        sa.Column("generated_by", sa.String(80), nullable=False),
        sa.Column("algorithm_version", sa.String(30), nullable=False),
        sa.Column(
            "focus_summary",
            postgresql.JSONB(),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("target_ends_on", sa.Date(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["child_id"],
            ["child_profiles.id"],
            name="fk_learning_plans_child_id_child_profiles",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_learning_plans"),
    )
    op.create_index(
        "ix_learning_plans_child_status",
        "learning_plans",
        ["child_id", "status"],
    )
    op.create_index(
        "uq_learning_plans_active_child",
        "learning_plans",
        ["child_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )

    op.create_table(
        "learning_plan_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_type", learning_plan_item_type, nullable=False),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("activity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("book_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("target_score", sa.Numeric(5, 4), nullable=True),
        sa.Column(
            "status",
            learning_plan_item_status,
            server_default="pending",
            nullable=False,
        ),
        sa.CheckConstraint(
            "num_nonnulls(skill_id, activity_id, book_id) = 1",
            name="learning_plan_items_exactly_one_target",
        ),
        sa.CheckConstraint("sequence >= 1", name="learning_plan_items_sequence_positive"),
        sa.ForeignKeyConstraint(
            ["plan_id"],
            ["learning_plans.id"],
            name="fk_learning_plan_items_plan_id_learning_plans",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["skill_id"],
            ["skills.id"],
            name="fk_learning_plan_items_skill_id_skills",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["activity_id"],
            ["activities.id"],
            name="fk_learning_plan_items_activity_id_activities",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_learning_plan_items"),
        sa.UniqueConstraint(
            "plan_id", "sequence", name="uq_learning_plan_items_plan_sequence"
        ),
    )
    op.create_index(
        "ix_learning_plan_items_plan_status",
        "learning_plan_items",
        ["plan_id", "status"],
    )
    op.create_index(
        "ix_learning_plan_items_activity_id",
        "learning_plan_items",
        ["activity_id"],
    )

    op.create_table(
        "learning_plan_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column(
            "details", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["plan_id"],
            ["learning_plans.id"],
            name="fk_learning_plan_events_plan_id_learning_plans",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_learning_plan_events"),
    )
    op.create_index(
        "ix_learning_plan_events_plan_created",
        "learning_plan_events",
        ["plan_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_learning_plan_events_plan_created", table_name="learning_plan_events")
    op.drop_table("learning_plan_events")
    op.drop_index("ix_learning_plan_items_activity_id", table_name="learning_plan_items")
    op.drop_index("ix_learning_plan_items_plan_status", table_name="learning_plan_items")
    op.drop_table("learning_plan_items")
    op.drop_index("uq_learning_plans_active_child", table_name="learning_plans")
    op.drop_index("ix_learning_plans_child_status", table_name="learning_plans")
    op.drop_table("learning_plans")
    learning_plan_item_status.drop(op.get_bind(), checkfirst=True)
    learning_plan_item_type.drop(op.get_bind(), checkfirst=True)
    learning_plan_status.drop(op.get_bind(), checkfirst=True)
