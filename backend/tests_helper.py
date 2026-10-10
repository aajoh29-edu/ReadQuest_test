"""Test-only database safety gate shared by PostgreSQL tests."""
import os
from pathlib import Path

import pytest
from alembic.config import Config

from alembic import command


def prepare_test_database():
    url = os.getenv("READQUEST_TEST_DATABASE_URL")
    if not url:
        pytest.skip("READQUEST_TEST_DATABASE_URL is not set")
    if not url.rsplit("/", 1)[-1].split("?", 1)[0].endswith("_test"):
        raise RuntimeError("requires a disposable _test database")
    if os.getenv("READQUEST_DATABASE_URL") != url:
        raise RuntimeError("application and test database URLs must match")
    root = Path(__file__).resolve().parent
    config = Config(root / "alembic.ini")
    config.set_main_option("script_location", str(root / "alembic"))
    command.upgrade(config, "head")
