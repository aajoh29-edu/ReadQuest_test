"""Add read-aloud activity enum values.

Revision ID: 0003
Revises: 0002
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NEW_VALUES = (
    "read_aloud_word",
    "read_aloud_sentence",
    "read_aloud_passage",
)
OLD_VALUES = (
    "multiple_choice_sound",
    "phonics_blending",
    "sight_word_cloze",
    "reading_comprehension",
)


def upgrade() -> None:
    with op.get_context().autocommit_block():
        for value in NEW_VALUES:
            op.execute(f"ALTER TYPE activity_type ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    op.execute(
        "DELETE FROM activities WHERE type::text IN "
        "('read_aloud_word', 'read_aloud_sentence', 'read_aloud_passage')"
    )
    op.execute("ALTER TABLE activities ALTER COLUMN type TYPE text USING type::text")
    op.execute("DROP TYPE activity_type")
    op.execute(
        "CREATE TYPE activity_type AS ENUM "
        "('multiple_choice_sound', 'phonics_blending', 'sight_word_cloze', "
        "'reading_comprehension')"
    )
    op.execute(
        "ALTER TABLE activities ALTER COLUMN type TYPE activity_type USING type::activity_type"
    )
