import os
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from alembic import command

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
        "alembic_version",
    } <= table_names

    command.downgrade(config, "base")
    remaining = set(inspect(engine).get_table_names())
    assert remaining <= {"alembic_version"}
    engine.dispose()
