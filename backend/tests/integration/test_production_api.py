import secrets
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text

from app.api.dependencies import COOKIE_NAME, transaction_session
from app.core.security import hash_password, token_digest
from app.db.session import SessionFactory, get_db_session
from app.main import create_app
from app.models.auth import AuthSession
from app.models.curriculum import Activity, Skill
from app.models.enums import ContentStatus
from app.models.identity import User
from app.models.learning import Attempt, Recommendation, SkillMastery
from app.repositories.adaptive import AdaptiveRepository
from app.seeds.demo import run_seed, uid
from app.services.adaptive.workflow import SubmitAttemptCommand, submit_attempt
from tests_helper import prepare_test_database

pytestmark = pytest.mark.integration


@pytest.fixture()
def api():
    prepare_test_database()
    with SessionFactory.begin() as session:
        session.execute(text("TRUNCATE auth_sessions, login_throttles, recommendations, skill_mastery, attempts, enrollments, guardian_children, classes, child_profiles, users, activity_skills, activities, lessons, skills CASCADE"))
    run_seed()
    password = "test-only-" + secrets.token_urlsafe(16)
    with SessionFactory.begin() as session:
        for user in session.scalars(select(User)):
            user.password_hash = hash_password(password)
    app = create_app()
    def transaction():
        with SessionFactory.begin() as session:
            yield session
    def plain():
        with SessionFactory() as session:
            yield session
    app.dependency_overrides[transaction_session] = transaction
    app.dependency_overrides[get_db_session] = plain
    with TestClient(app) as client:
        yield client, password


def login(api, role="child"):
    client, password = api
    response = client.post("/auth/login", json={"email": f"{role}@readquest.example.org", "password": password})
    assert response.status_code == 200, response.text
    return client


def test_login_cookie_logout_and_stored_token(api):
    client = login(api)
    token = client.cookies[COOKIE_NAME]
    with SessionFactory() as session:
        assert session.get(AuthSession, token_digest(token)) is not None
        assert session.get(AuthSession, token) is None
    assert client.get("/auth/me").json()["role"] == "child"
    assert client.post("/auth/logout").status_code == 204
    assert client.get("/children").status_code == 401
    client.cookies.set(COOKIE_NAME, token)
    assert client.get("/auth/me").status_code == 401


def test_expired_session_and_untrusted_origin(api):
    client = login(api)
    assert client.post("/attempts", json={"activity_id": str(uid(311)), "selected_index": 0},
        headers={"Origin": "https://evil.example"}).status_code == 403
    with SessionFactory.begin() as session:
        session.get(AuthSession, token_digest(client.cookies[COOKIE_NAME])).expires_at = datetime.now(UTC)-timedelta(seconds=1)
    assert client.get("/auth/me").status_code == 401


def test_failed_login_throttling_and_no_enumeration(api):
    client, _ = api
    for _ in range(5):
        response = client.post("/auth/login", json={"email": "absent@example.org", "password": "wrong"})
        assert response.status_code == 401 and response.json()["detail"] == "invalid credentials"
    assert client.post("/auth/login", json={"email": "absent@example.org", "password": "wrong"}).status_code == 429


def test_password_change_revokes_all_sessions(api):
    client = login(api)
    first = client.cookies[COOKIE_NAME]
    login(api)
    assert client.post("/auth/password", json={"current_password": api[1], "new_password": "new-test-only-password"}).status_code == 204
    client.cookies.set(COOKIE_NAME, first)
    assert client.get("/auth/me").status_code == 401
    assert client.post("/auth/login", json={"email": "child@readquest.example.org", "password": "new-test-only-password"}).status_code == 200


def test_child_attempt_is_server_scored_and_private(api):
    client = login(api)
    rows = client.get("/activities").json()
    assert len(rows) == 16 and all("correct_index" not in r["content"] for r in rows)
    response = client.post("/attempts", json={"activity_id": str(uid(381)), "selected_index": 1, "response_ms": 2400})
    assert response.status_code == 201, response.text
    assert response.json()["is_correct"] is False
    assert response.json()["recommendation"]["explanation"]
    with SessionFactory() as session:
        row = session.get(Attempt, response.json()["attempt_id"])
        assert row.child_id == uid(10) and row.is_correct is False
    assert client.post("/attempts", json={"activity_id": str(uid(381)), "selected_index": 7}).status_code == 422
    assert client.post("/attempts", json={"activity_id": str(uid(381)), "selected_index": 0, "is_correct": True}).status_code == 422
    assert client.get("/admin/users").status_code == 403


def test_parent_child_creation_and_teacher_scope(api):
    client = login(api, "parent")
    child = client.post("/children", json={"email": "reader@example.org", "password": "child-test-only-password", "display_name": "Reader"})
    assert child.status_code == 201, child.text
    child_id = child.json()["id"]
    assert len(client.get("/children").json()) == 2
    assert client.post("/children", json={"email": "reader@example.org", "password": "child-test-only-password", "display_name": "Reader"}).status_code == 409
    assert client.post("/attempts", json={"activity_id": str(uid(311)), "selected_index": 0}).status_code == 403
    login(api, "teacher")
    assert client.get(f"/children/{child_id}/progress").status_code == 404
    classroom = client.post("/classes", json={"name": "New readers"}).json()
    login(api, "parent")
    assert client.post(f"/children/{child_id}/enrollments", json={"join_code": classroom["join_code"]}).status_code == 201
    login(api, "teacher")
    assert client.get(f"/children/{child_id}/progress").status_code == 200
    assert client.get(f"/classes/{classroom['id']}/children").json()[0]["id"] == child_id
    assert client.delete(f"/classes/{classroom['id']}/children/{child_id}").status_code == 204
    assert client.get(f"/children/{child_id}/progress").status_code == 404
    assert client.patch(f"/classes/{classroom['id']}", json={"status": "archived"}).status_code == 200
    assert client.get(f"/classes/{classroom['id']}/children").json() == []
    assert client.patch(f"/classes/{uid(20)}", json={"status":"archived"}).status_code == 200
    assert client.get(f"/classes/{uid(20)}/children").json() == []
    assert client.get(f"/children/{uid(10)}/progress").status_code == 404


def test_admin_account_deactivation_revokes_token(api):
    client = login(api)
    token = client.cookies[COOKIE_NAME]
    login(api, "admin")
    assert client.patch(f"/admin/users/{uid(3)}", json={"status": "disabled"}).status_code == 200
    assert client.get(f"/classes/{uid(20)}/children").json() == []
    client.cookies.set(COOKIE_NAME, token)
    assert client.get("/auth/me").status_code == 401
    client.cookies.clear()
    assert client.post("/auth/login", json={"email": "child@readquest.example.org", "password": api[1]}).status_code == 401


def test_admin_curriculum_validation_and_immutability(api):
    client = login(api, "admin")
    skill = client.post("/admin/skills", json={"code": "NEW_SKILL", "name": "New skill", "category": "phonics", "level": 2, "status": "published"})
    assert skill.status_code == 201
    duplicate = client.post("/admin/skills", json={"code": "NEW_SKILL", "name": "New skill", "category": "phonics", "level": 2})
    assert duplicate.status_code == 409 and "SQL" not in duplicate.text
    lesson = client.post("/admin/lessons", json={"title": "New lesson", "sequence": 2, "status": "published"}).json()
    payload = {"lesson_id": lesson["id"], "title": "Read cat", "activity_type": "multiple_choice", "prompt": "Choose cat", "content": {"choices": ["cat", "dog"], "correct_index": 0}, "difficulty": 2, "sequence": 1, "status": "published", "skills": [{"skill_id": skill.json()["id"], "weight": "1"}]}
    activity = client.post("/admin/activities", json=payload)
    assert activity.status_code == 201, activity.text
    activity_id = activity.json()["id"]
    login(api)
    assert client.post("/attempts", json={"activity_id": activity_id, "selected_index": 0}).status_code == 201
    login(api, "admin")
    payload["content"]["correct_index"] = 1
    assert client.put(f"/admin/activities/{activity_id}", json=payload).status_code == 409
    payload["content"]["correct_index"] = 0
    payload["status"] = "archived"
    assert client.put(f"/admin/activities/{activity_id}", json=payload).status_code == 200
    login(api)
    assert client.get(f"/activities/{activity_id}").status_code == 404


def test_unpublished_skill_excludes_entire_activity(api):
    client = login(api)
    with SessionFactory.begin() as session:
        session.get(Skill, uid(108)).status = ContentStatus.DRAFT
    assert client.get(f"/activities/{uid(381)}").status_code == 404
    assert client.post("/attempts", json={"activity_id": str(uid(381)), "selected_index": 0}).status_code == 404


def test_recommendation_and_progress_contract(api):
    client = login(api)
    progress = client.get(f"/children/{uid(10)}/progress").json()
    assert len(progress) == 8
    assert any(m["band"] == "unassessed" for m in progress)
    result = client.post(f"/children/{uid(10)}/recommendations").json()
    assert result["activity"]["id"] and result["reason_details"] and result["explanation"]
    with SessionFactory.begin() as session:
        for a in session.scalars(select(Activity)):
            a.status = ContentStatus.ARCHIVED
    assert client.post(f"/children/{uid(10)}/recommendations").json() is None


def test_adaptive_rollback_on_recommendation_failure(api, monkeypatch):
    with SessionFactory() as session:
        before = session.scalar(select(func.count()).select_from(Attempt))
    def fail(*args, **kwargs):
        raise RuntimeError("simulated write failure")
    monkeypatch.setattr(AdaptiveRepository, "save_recommendation", fail)
    with pytest.raises(RuntimeError):
        with SessionFactory.begin() as session:
            submit_attempt(session, command())
    with SessionFactory() as session:
        assert session.scalar(select(func.count()).select_from(Attempt)) == before
        assert session.get(SkillMastery, (uid(10), uid(108))) is None


def command():
    return SubmitAttemptCommand(child_id=uid(10), activity_id=uid(381), is_correct=True,
        response_ms=2400, answer={"selected_index": 0}, occurred_at=datetime.now(UTC), learner_level=2)


def test_concurrent_attempts_preserve_all_evidence(api):
    def submit(_):
        with SessionFactory.begin() as session:
            return submit_attempt(session, command()).attempt.id
    with ThreadPoolExecutor(max_workers=2) as pool:
        ids = list(pool.map(submit, range(2)))
    assert len(set(ids)) == 2
    with SessionFactory() as session:
        mastery = session.get(SkillMastery, (uid(10), uid(108)))
        assert mastery.attempt_count == 2 and mastery.score == 1
        assert session.scalar(select(func.count()).select_from(Recommendation).where(Recommendation.triggering_attempt_id.in_(ids))) == 2


def test_cooldown_boundary_and_database_constraints(api):
    from sqlalchemy.exc import IntegrityError
    now = datetime.now(UTC)
    with SessionFactory.begin() as session:
        row = Attempt(child_id=uid(10), activity_id=uid(381), is_correct=True,
                      occurred_at=now-timedelta(hours=4))
        session.add(row)
        session.flush()
        repo = AdaptiveRepository(session)
        assert uid(381) not in {c.activity_id for c in repo.recommendation_candidates(uid(10), learner_level=2, now=now)}
        row.occurred_at -= timedelta(microseconds=1)
        session.flush()
        assert uid(381) in {c.activity_id for c in repo.recommendation_candidates(uid(10), learner_level=2, now=now)}
    with pytest.raises(IntegrityError):
        with SessionFactory.begin() as session:
            session.add(Attempt(child_id=uid(10), activity_id=uid(381), is_correct=True,
                                occurred_at=now, response_ms=-1))
            session.flush()


def test_admin_provisioning_and_cross_guardian_denial(api):
    client = login(api, "admin")
    result = client.post("/admin/users", json={"email":"other@example.org", "password":"test-only-other-password", "role":"child", "display_name":"Other reader"})
    assert result.status_code == 201 and "password_hash" not in result.json()
    other_child = next(c for c in client.get("/children").json() if c["display_name"]=="Other reader")
    assert client.get("/admin/skills").status_code == 200
    skill = client.get("/admin/skills").json()[0]
    skill_id = skill.pop("id")
    skill["name"] = "Reviewed skill"
    assert client.put(f"/admin/skills/{skill_id}", json=skill).status_code == 200
    lesson = client.get("/admin/lessons").json()[0]
    lesson_id = lesson.pop("id")
    lesson["description"] = "Reviewed lesson"
    assert client.put(f"/admin/lessons/{lesson_id}", json=lesson).status_code == 200
    assert client.patch(f"/admin/users/{uid(4)}", json={"status":"disabled"}).status_code == 409
    login(api,"parent")
    assert client.get(f"/children/{other_child['id']}/progress").status_code == 404
    assert client.post(f"/children/{other_child['id']}/enrollments", json={"join_code":"readquest-demo"}).status_code == 404
    assert client.post("/admin/users", json={"email":"bad@example.org","password":"test-only-password","role":"admin"}).status_code == 403


def test_seeded_accounts_remain_unusable_without_opt_in(api):
    with SessionFactory.begin() as session:
        session.get(User, uid(3)).password_hash = "DEMO_AUTH_NOT_CONFIGURED"
    client, _ = api
    assert client.post("/auth/login",json={"email":"child@readquest.example.org","password":"unusable-login-timing-padding"}).status_code == 401


def test_opt_in_seed_password_rotation_revokes_sessions(api, monkeypatch):
    client = login(api)
    monkeypatch.setenv("READQUEST_DEMO_PASSWORD", api[1])
    run_seed()
    assert client.get("/auth/me").status_code == 200
    monkeypatch.setenv("READQUEST_DEMO_PASSWORD", "rotated-test-only-password")
    run_seed()
    assert client.get("/auth/me").status_code == 401
    assert client.post("/auth/login", json={"email":"child@readquest.example.org", "password":"rotated-test-only-password"}).status_code == 200
