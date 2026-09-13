import os
from datetime import UTC, datetime
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import func, select

from alembic import command
from app.db.session import SessionFactory
from app.models.curriculum import Activity, Skill
from app.models.identity import ChildProfile, User
from app.models.learning import Attempt, Recommendation, SkillMastery
from app.seeds.demo import run_seed, uid
from app.services.adaptive.workflow import SubmitAttemptCommand, submit_attempt

DATABASE_URL = os.getenv("READQUEST_TEST_DATABASE_URL")
pytestmark = pytest.mark.integration


def prepare_database() -> None:
    if not DATABASE_URL:
        pytest.skip("READQUEST_TEST_DATABASE_URL is not set")
    if not DATABASE_URL.rsplit("/", 1)[-1].split("?", 1)[0].endswith("_test"):
        raise RuntimeError("Integration tests require a database ending in '_test'")
    backend_dir = Path(__file__).resolve().parents[2]
    config = Config(backend_dir / "alembic.ini")
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    command.upgrade(config, "head")


def count(model: type[object]) -> int:
    with SessionFactory() as session:
        return session.scalar(select(func.count()).select_from(model)) or 0


def test_seed_is_idempotent() -> None:
    prepare_database()
    run_seed()
    first_counts = (count(User), count(Skill), count(Activity))
    run_seed()
    second_counts = (count(User), count(Skill), count(Activity))

    assert first_counts == second_counts
    assert first_counts == (4, 8, 16)


def test_adaptive_workflow_persists_complete_outcome() -> None:
    prepare_database()
    run_seed()

    command = SubmitAttemptCommand(
        child_id=uid(10),
        activity_id=uid(311),
        is_correct=True,
        response_ms=2_400,
        answer={"selected_index": 0},
        occurred_at=datetime.now(UTC),
        learner_level=2,
    )
    with SessionFactory.begin() as session:
        outcome = submit_attempt(session, command)
        attempt_id = outcome.attempt.id
        recommendation_id = outcome.recommendation.id if outcome.recommendation else None

    with SessionFactory() as session:
        assert session.get(Attempt, attempt_id) is not None
        assert session.get(SkillMastery, (uid(10), uid(101))) is not None
        assert recommendation_id is not None
        assert session.get(Recommendation, recommendation_id) is not None
        assert session.get(ChildProfile, uid(10)) is not None
