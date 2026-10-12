from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.schemas import ActivityInput, AttemptInput
from app.core.config import Settings, get_settings
from app.core.security import hash_password, token_digest, verify_password
from app.main import create_app
from app.services.adaptive.mastery import AttemptResult, calculate_mastery
from app.services.adaptive.recommendation import ActivityCandidate, rank_activities


def test_password_hash_and_invalid_hash_are_safe():
    password = "temporary-test-password"
    encoded = hash_password(password)
    assert encoded.startswith("$argon2id$") and password not in encoded
    assert verify_password(password, encoded)
    assert not verify_password("incorrect", encoded)
    assert not verify_password(password, "DEMO_AUTH_NOT_CONFIGURED")
    assert not verify_password("unusable-login-timing-padding", "DEMO_AUTH_NOT_CONFIGURED")
    assert not verify_password(password, "$argon2id$malformed")
    assert len(token_digest("opaque")) == 64


@pytest.mark.parametrize("origins", [["*"], ["http://reading.example.org"]])
def test_production_requires_https_explicit_origins(origins):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, environment="production", allowed_origins=origins,
                 database_url="postgresql+psycopg://app:password@db/reading")


def test_production_hides_demo_and_introspection(monkeypatch):
    monkeypatch.setenv("READQUEST_ENV", "production")
    monkeypatch.setenv("READQUEST_DATABASE_URL", "postgresql+psycopg://app:password@db/reading")
    monkeypatch.setenv("READQUEST_ALLOWED_ORIGINS", '["https://reading.example.org"]')
    get_settings.cache_clear()
    try:
        app = create_app()
        client = TestClient(app)
        for path in ["/demo/activities", "/docs", "/redoc", "/openapi.json"]:
            assert client.get(path).status_code == 404
    finally:
        get_settings.cache_clear()


def test_production_rejects_compose_demo_database():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, environment="production", allowed_origins=[],
                 database_url="postgresql+psycopg://readquest:readquest@db/readquest")


@pytest.mark.parametrize("extra", [{"child_id": str(uuid4())}, {"is_correct": True}])
def test_attempt_rejects_client_identity_and_correctness(extra):
    with pytest.raises(ValidationError):
        AttemptInput(activity_id=uuid4(), selected_index=0, **extra)


def test_content_and_weight_validation():
    data = dict(lesson_id=uuid4(), title="Read", activity_type="multiple_choice", prompt="Pick cat",
                content={"choices": ["cat", "dog"], "correct_index": 0}, difficulty=1, sequence=1,
                skills=[{"skill_id": str(uuid4()), "weight": "1"}])
    assert ActivityInput(**data).content.correct_index == 0
    data["content"]["correct_index"] = 9
    with pytest.raises(ValidationError):
        ActivityInput(**data)
    data["content"]["correct_index"] = 0
    data["skills"][0]["weight"] = "0.5"
    with pytest.raises(ValidationError):
        ActivityInput(**data)


def test_mastery_rejects_naive_evidence():
    with pytest.raises(ValueError, match="timezone"):
        calculate_mastery([AttemptResult(True, datetime(2026, 1, 1))])


def test_multi_skill_recommendations_are_unique_and_deterministic():
    activity = uuid4()
    candidates = [ActivityCandidate(activity_id=activity, skill_id=uuid4(), difficulty=2,
                    learner_level=2, mastery_score=0, last_practiced_at=None) for _ in range(2)]
    now = datetime.now(UTC)
    assert rank_activities(candidates, now=now) == rank_activities(candidates[::-1], now=now)
    assert len(rank_activities(candidates, now=now)) == 1


def test_readquest_env_alias(monkeypatch):
    monkeypatch.setenv("READQUEST_ENV", "production")
    settings = Settings(_env_file=None, allowed_origins=[], database_url="postgresql+psycopg://app:password@db/reading")
    assert settings.environment == "production"


def test_production_seed_is_prohibited(monkeypatch):
    from types import SimpleNamespace

    from app.seeds.demo import run_seed
    monkeypatch.setattr("app.seeds.demo.get_settings", lambda: SimpleNamespace(environment="production"))
    with pytest.raises(ValueError, match="prohibited"):
        run_seed()
