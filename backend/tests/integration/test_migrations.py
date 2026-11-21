import os
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect, select
from sqlalchemy.exc import IntegrityError

from alembic import command
from app.db.session import SessionFactory
from app.models.enums import LearningPlanItemType, LearningPlanStatus
from app.models.learning import LearningPlan, LearningPlanItem
from app.seeds.demo import run_seed, uid

DATABASE_URL = os.getenv("READQUEST_TEST_DATABASE_URL")
pytestmark = pytest.mark.integration


def require_test_database() -> str:
    if not DATABASE_URL:
        pytest.skip("READQUEST_TEST_DATABASE_URL is not set")
    database_name = DATABASE_URL.rsplit("/", 1)[-1].split("?", 1)[0]
    if not database_name.endswith("_test"):
        raise RuntimeError("Migration tests require a database name ending in '_test'")
    return DATABASE_URL


def alembic_config(database_url: str) -> Config:
    backend_dir = Path(__file__).resolve().parents[2]
    config = Config(backend_dir / "alembic.ini")
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    os.environ["READQUEST_DATABASE_URL"] = database_url
    return config


def test_upgrade_and_downgrade_complete_schema() -> None:
    database_url = require_test_database()
    config = alembic_config(database_url)

    command.upgrade(config, "head")
    engine = create_engine(database_url)
    table_names = set(inspect(engine).get_table_names())
    assert {
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
        "alembic_version",
    } <= table_names

    command.downgrade(config, "0002")
    downgraded = set(inspect(engine).get_table_names())
    assert not {
        "learning_plans",
        "learning_plan_items",
        "learning_plan_events",
    } & downgraded
    command.upgrade(config, "head")
    assert {
        "learning_plans",
        "learning_plan_items",
        "learning_plan_events",
    } <= set(inspect(engine).get_table_names())

    command.downgrade(config, "base")
    remaining = set(inspect(engine).get_table_names())
    assert remaining <= {"alembic_version"}
    engine.dispose()


def test_plan_constraints_enforce_targets_and_single_active_plan() -> None:
    database_url = require_test_database()
    alembic_config(database_url)
    command.upgrade(alembic_config(database_url), "head")
    run_seed()

    with SessionFactory.begin() as session:
        existing = session.scalar(select(LearningPlan).where(LearningPlan.status == LearningPlanStatus.ACTIVE))
        assert existing is not None
        with pytest.raises(IntegrityError):
            with session.begin_nested():
                session.add(
                    LearningPlanItem(
                        plan_id=existing.id,
                        item_type=LearningPlanItemType.ACTIVITY,
                        skill_id=uid(101),
                        activity_id=uid(311),
                        sequence=99,
                    )
                )
                session.flush()

        with pytest.raises(IntegrityError):
            with session.begin_nested():
                session.add(
                    LearningPlan(
                        child_id=uid(10),
                        status=LearningPlanStatus.ACTIVE,
                        generated_by="test",
                        algorithm_version="test",
                        focus_summary=[],
                        starts_on=existing.starts_on,
                        target_ends_on=existing.target_ends_on,
                    )
                )
                session.flush()
