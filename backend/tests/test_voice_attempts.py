from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.main import app
from app.models import Base
from app.models.account import User
from app.models.curriculum import Learner
from app.models.enums import WordResultType
from app.models.progress import Attempt, SkillMastery
from app.models.voice import VoiceAttempt, WordResult
from app.seeds.demo import seed_demo
from app.services.voice import align_words
from app.services.security import create_session, hash_password


def database() -> tuple[sessionmaker[Session], TestClient]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)

    def override_db() -> Generator[Session, None, None]:
        with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    return factory, TestClient(app)


def setup_seed() -> tuple[sessionmaker[Session], TestClient, str, str]:
    factory, client = database()
    with factory() as session:
        seed_demo(session)
        user = User(
            email="voice@example.org",
            full_name="Voice Parent",
            password_hash=hash_password("StrongPassword!1"),
            role="parent",
            email_verified=True,
        )
        session.add(user)
        session.flush()
        session.add(
            Learner(id="child-voice", parent_user_id=user.id, stars_earned=0)
        )
        session.commit()
        raw_session, csrf, _ = create_session(session, user)
    client.cookies.set("rq_session", raw_session)
    client.cookies.set("rq_csrf_token", csrf)
    return factory, client, "act-letter_sounds-sentence-01", csrf


def grant(client: TestClient, csrf: str) -> None:
    response = client.post(
        "/api/v1/children/child-voice/voice-consent",
        headers={"X-CSRF-Token": csrf},
        json={
            "provider": "web_speech",
            "scope": "read_aloud_assessment",
            "granted": True,
            "granted_by": "guardian-test",
        },
    )
    assert response.status_code == 200


def test_alignment_covers_correct_substitution_omission_and_insertion() -> None:
    aligned = align_words(["the", "cat", "sat"], "the cut sat there")
    assert aligned[0].result_type == WordResultType.CORRECT
    assert aligned[1].result_type == WordResultType.SUBSTITUTION
    assert aligned[2].result_type == WordResultType.CORRECT
    assert aligned[3].result_type == WordResultType.INSERTION
    omitted = align_words(["the", "cat", "sat"], "the sat")
    assert [item.result_type for item in omitted] == [
        WordResultType.CORRECT,
        WordResultType.OMISSION,
        WordResultType.CORRECT,
    ]
    corrected = align_words(["cat"], "cut cat")
    assert len(corrected) == 1
    assert corrected[0].result_type == WordResultType.SELF_CORRECTION
    assert corrected[0].actual_word == "cut cat"


def test_no_consent_forbids_without_voice_attempt() -> None:
    factory, client, activity_id, csrf = setup_seed()
    response = client.post(
        "/api/v1/children/child-voice/read-aloud",
        headers={"X-CSRF-Token": csrf},
        json={
            "activity_id": activity_id,
            "transcript": "I can map by the sun.",
            "word_confidences": [0.9] * 6,
            "duration_seconds": 5,
            "provider": "web_speech",
        },
    )
    assert response.status_code == 403
    with factory() as session:
        assert session.scalar(select(func.count()).select_from(VoiceAttempt)) == 0
        assert session.scalar(select(func.count()).select_from(Attempt)) == 0


def test_known_transcript_scores_and_updates_mastery_without_audio() -> None:
    factory, client, activity_id, csrf = setup_seed()
    grant(client, csrf)
    response = client.post(
        "/api/v1/children/child-voice/read-aloud",
        headers={"X-CSRF-Token": csrf},
        json={
            "activity_id": activity_id,
            "transcript": "I can map by sun.",
            "word_confidences": [0.98, 0.97, 0.96, 0.95, 0.94],
            "duration_seconds": 6,
            "provider": "web_speech",
            "audio_content_type": "audio/webm",
            "audio_size_bytes": 1024,
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["accuracy"] == 5 / 6
    assert body["wcpm"] == 50
    assert body["audio_retention"] == "none"
    assert len(body["word_results"]) == 6
    assert body["retry_words"] == ["the"]
    assert body["is_correct"]

    with factory() as session:
        voice_attempt = session.get(VoiceAttempt, body["id"])
        assert voice_attempt is not None
        assert len(voice_attempt.word_results) == 6
        assert sum(
            result.result_type == WordResultType.OMISSION
            for result in voice_attempt.word_results
        ) == 1
        mastery_attempt = session.get(Attempt, voice_attempt.mastery_attempt_id)
        assert mastery_attempt is not None
        assert mastery_attempt.is_correct is True
        assert mastery_attempt.answer["voice_attempt_id"] == body["id"]
        mastery = session.get(SkillMastery, ("child-voice", mastery_attempt.skill_id))
        assert mastery is not None
        assert mastery.total_attempt_count == 1
        assert mastery.score == pytest.approx(100)
    assert list(Path.cwd().rglob("*.webm")) == []
    assert list(Path.cwd().rglob("*.wav")) == []
    assert list(Path.cwd().rglob("*.mp3")) == []


def test_audio_limit_and_recommendation_and_guardian_delete() -> None:
    factory, client, activity_id, csrf = setup_seed()
    grant(client, csrf)
    rejected = client.post(
        "/api/v1/children/child-voice/read-aloud",
        headers={"X-CSRF-Token": csrf},
        json={
            "activity_id": activity_id,
            "transcript": "I can map by the sun.",
            "duration_seconds": 61,
            "audio_content_type": "audio/ogg",
            "audio_size_bytes": 11 * 1024 * 1024,
        },
    )
    assert rejected.status_code == 422

    created = client.post(
        "/api/v1/children/child-voice/read-aloud",
        headers={"X-CSRF-Token": csrf},
        json={
            "activity_id": activity_id,
            "transcript": "I can map by the sun.",
            "duration_seconds": 12,
        },
    )
    attempt_id = created.json()["id"]
    detail = client.get(
        f"/api/v1/children/child-voice/read-aloud/{attempt_id}"
    )
    assert detail.status_code == 200
    assert "wcpm" in detail.json()
    progress = client.get("/api/v1/children/child-voice/voice-progress")
    assert progress.json()["attempt_count"] == 1
    recommendation = client.get(
        "/api/v1/children/child-voice/read-aloud-recommendation"
    )
    assert recommendation.status_code == 200
    assert recommendation.json()["activity_id"].startswith("act-")

    deleted = client.delete(
        f"/api/v1/children/child-voice/read-aloud/{attempt_id}",
        headers={"X-CSRF-Token": csrf},
    )
    assert deleted.status_code == 204
    with factory() as session:
        assert session.get(VoiceAttempt, attempt_id) is None
        assert session.scalar(select(func.count()).select_from(WordResult)) == 0
        assert session.scalar(select(func.count()).select_from(Attempt)) == 0
        assert session.scalar(select(func.count()).select_from(SkillMastery)) == 0
