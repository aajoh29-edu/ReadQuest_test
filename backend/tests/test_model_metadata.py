from sqlalchemy import CheckConstraint, ForeignKeyConstraint
from sqlalchemy.orm import configure_mappers

import app.models.auth  # noqa: F401
import app.models.curriculum  # noqa: F401
import app.models.identity  # noqa: F401
import app.models.learning  # noqa: F401
from app.db.base import Base

EXPECTED_TABLES = {
    "auth_sessions",
    "login_throttles",
    "users",
    "child_profiles",
    "guardian_children",
    "classes",
    "enrollments",
    "skills",
    "lessons",
    "activities",
    "activity_skills",
    "attempts",
    "skill_mastery",
    "recommendations",
    "learning_plans",
    "learning_plan_items",
    "learning_plan_events",
}

EXPECTED_COLUMNS = {
    "auth_sessions": {"token_hash", "user_id", "expires_at"},
    "login_throttles": {"email", "failures", "window_start"},
    "users": {"id", "email", "password_hash", "role", "status", "created_at", "updated_at"},
    "child_profiles": {
        "id",
        "user_id",
        "display_name",
        "grade_level",
        "current_level",
        "created_at",
    },
    "guardian_children": {"guardian_id", "child_id", "relationship_label", "created_at"},
    "classes": {"id", "teacher_id", "name", "join_code", "status", "created_at"},
    "enrollments": {"class_id", "child_id", "enrolled_at", "status"},
    "skills": {"id", "code", "name", "category", "level", "status"},
    "lessons": {"id", "title", "description", "sequence", "status", "created_at", "updated_at"},
    "activities": {
        "id",
        "lesson_id",
        "title",
        "activity_type",
        "prompt",
        "content",
        "difficulty",
        "sequence",
        "status",
    },
    "activity_skills": {"activity_id", "skill_id", "weight"},
    "attempts": {
        "id",
        "child_id",
        "activity_id",
        "is_correct",
        "response_ms",
        "answer",
        "occurred_at",
        "created_at",
    },
    "skill_mastery": {
        "child_id",
        "skill_id",
        "score",
        "band",
        "confidence",
        "attempt_count",
        "last_practiced_at",
        "algorithm_version",
        "version",
        "updated_at",
    },
    "recommendations": {
        "id",
        "child_id",
        "activity_id",
        "triggering_attempt_id",
        "priority_score",
        "reason_code",
        "reason_details",
        "algorithm_version",
        "status",
        "created_at",
    },
    "learning_plans": {
        "id",
        "child_id",
        "status",
        "generated_by",
        "algorithm_version",
        "focus_summary",
        "starts_on",
        "target_ends_on",
        "created_at",
    },
    "learning_plan_items": {
        "id",
        "plan_id",
        "item_type",
        "skill_id",
        "activity_id",
        "book_id",
        "sequence",
        "target_score",
        "status",
    },
    "learning_plan_events": {"id", "plan_id", "event_type", "details", "created_at"},
}


def test_metadata_contains_all_erd_tables() -> None:
    assert set(Base.metadata.tables) == EXPECTED_TABLES


def test_every_table_contains_expected_columns() -> None:
    for table_name, expected in EXPECTED_COLUMNS.items():
        assert set(Base.metadata.tables[table_name].columns.keys()) == expected


def test_all_relationship_mappers_configure() -> None:
    configure_mappers()
    assert len(Base.registry.mappers) == 17


def test_all_foreign_keys_have_explicit_delete_behavior() -> None:
    foreign_keys = [
        constraint
        for table in Base.metadata.tables.values()
        for constraint in table.constraints
        if isinstance(constraint, ForeignKeyConstraint)
    ]
    assert foreign_keys
    assert all(constraint.ondelete is not None for constraint in foreign_keys)


def test_numeric_domain_rules_have_check_constraints() -> None:
    for table_name in (
        "child_profiles",
        "skills",
        "activities",
        "activity_skills",
        "attempts",
        "skill_mastery",
        "recommendations",
    ):
        table = Base.metadata.tables[table_name]
        assert any(isinstance(item, CheckConstraint) for item in table.constraints), table_name
