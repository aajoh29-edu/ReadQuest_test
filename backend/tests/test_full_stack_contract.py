from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.main import app
from app.models import Base
from app.models.account import User
from app.models.portal import Classroom, ClassroomEnrollment
from app.services.security import create_session, hash_password
from app.seeds.demo import seed_demo


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
    with factory() as session:
        seed_demo(session)
    return factory, TestClient(app)


def csrf_headers(client: TestClient) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("rq_csrf_token")}


def register(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "Jordan Parent",
            "email": "parent@example.org",
            "password": "StrongPassword!1",
            "acceptedPolicies": True,
        },
    )
    assert response.status_code == 201, response.text
    assert response.json()["requiresEmailVerification"] is False
    assert client.cookies.get("rq_session")
    assert client.cookies.get("rq_csrf_token")


def test_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def create_learner(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/learners",
        headers=csrf_headers(client),
        json={
            "name": "Avery",
            "avatar": "fox",
            "avatarName": "Fox Scout",
            "readingLevelId": "level-1",
            "gradeLevel": "Grade 1",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_auth_session_cookie_csrf_and_learner_crud() -> None:
    _factory, client = database()
    register(client)
    assert client.get("/api/v1/auth/me").json()["user"]["email"] == "parent@example.org"

    rejected = client.post(
        "/api/v1/learners",
        json={
            "name": "Avery",
            "avatar": "fox",
            "avatarName": "Fox Scout",
            "readingLevelId": "level-1",
            "gradeLevel": "Grade 1",
        },
    )
    assert rejected.status_code == 403
    assert rejected.json()["code"] == "FORBIDDEN"

    learner = create_learner(client)
    assert learner["name"] == "Avery"
    assert learner["starsEarned"] == 0
    assert client.get(f"/api/v1/learners/{learner['id']}").status_code == 200
    updated = client.patch(
        f"/api/v1/learners/{learner['id']}",
        headers=csrf_headers(client),
        json={"name": "Avery Reader", "gradeLevel": "Grade 2"},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Avery Reader"
    assert updated.json()["gradeLevel"] == "Grade 2"

    selected = client.post(
        "/api/v1/learners/active",
        headers=csrf_headers(client),
        json={"learnerId": learner["id"]},
    )
    assert selected.status_code == 200
    assert selected.json()["id"] == learner["id"]

    profile = client.get("/api/v1/parent/profile")
    assert profile.status_code == 200
    assert profile.json()["childrenIds"] == [learner["id"]]

    logout = client.post("/api/v1/auth/logout", headers=csrf_headers(client))
    assert logout.status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401


def test_public_curriculum_is_sanitized_and_sessions_are_server_graded() -> None:
    _factory, client = database()
    register(client)
    learner = create_learner(client)

    levels = client.get("/api/v1/curriculum/levels")
    assert levels.status_code == 200
    assert [item["id"] for item in levels.json()] == [
        "level-1",
        "level-2",
        "level-3",
    ]
    lessons = client.get("/api/v1/curriculum/lessons?readingLevelId=level-1")
    assert lessons.status_code == 200
    lesson = lessons.json()[0]
    assert len(lesson["activities"]) == 5
    assert all(
        "isCorrect" not in option
        for activity in lesson["activities"]
        for option in activity["options"]
    )

    started = client.post(
        "/api/v1/sessions",
        headers=csrf_headers(client),
        json={"lessonId": lesson["id"], "learnerId": learner["id"]},
    )
    assert started.status_code == 200, started.text
    session = started.json()
    assert session["currentActivityIndex"] == 0
    assert session["attempts"] == []

    activity = lesson["activities"][0]
    submitted = client.post(
        f"/api/v1/sessions/{session['id']}/attempts",
        headers=csrf_headers(client),
        json={
            "activityId": activity["id"],
            "selectedOptionId": activity["options"][0]["id"],
            "idempotencyKey": "first-attempt",
            "activeDurationSeconds": 12,
        },
    )
    assert submitted.status_code == 200, submitted.text
    first = submitted.json()
    assert first["gradedAnswer"]["isCorrect"] is True
    assert first["gradedAnswer"]["attemptNumber"] == 1

    repeated = client.post(
        f"/api/v1/sessions/{session['id']}/attempts",
        headers=csrf_headers(client),
        json={
            "activityId": activity["id"],
            "selectedOptionId": activity["options"][1]["id"],
            "idempotencyKey": "first-attempt",
            "activeDurationSeconds": 99,
        },
    )
    assert repeated.status_code == 200
    assert repeated.json()["gradedAnswer"]["isCorrect"] is True
    assert repeated.json()["session"]["totalActiveDurationSeconds"] == 12

    advanced = client.post(
        f"/api/v1/sessions/{session['id']}/advance",
        headers=csrf_headers(client),
        json={},
    )
    assert advanced.status_code == 200
    assert advanced.json()["currentActivityIndex"] == 1

    completed = client.post(
        f"/api/v1/sessions/{session['id']}/complete",
        headers=csrf_headers(client),
        json={},
    )
    assert completed.status_code == 200
    assert completed.json()["isCompleted"] is True
    assert completed.json()["earnedBadge"] == lesson["badgeReward"]

    mastery = client.get(f"/api/v1/learners/{learner['id']}/mastery")
    assert mastery.status_code == 200
    practiced = next(
        item for item in mastery.json() if item["skillId"] == activity["primarySkillId"]
    )
    assert practiced["totalAttemptCount"] == 1
    assert practiced["evidenceStatus"] == "provisional"
    progress = client.get(f"/api/v1/learners/{learner['id']}/progress")
    assert progress.json()["totalQuestionsAnswered"] == 1
    assert progress.json()["totalLessonsCompleted"] == 1
    recommendation = client.get(
        f"/api/v1/learners/{learner['id']}/adaptive-recommendation"
    )
    assert recommendation.status_code == 200
    assert recommendation.json()["lessonId"]


def test_duplicate_account_and_validation_errors_use_json_contract() -> None:
    _factory, client = database()
    register(client)
    duplicate = client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "Jordan Parent",
            "email": "parent@example.org",
            "password": "StrongPassword!1",
            "acceptedPolicies": True,
        },
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "CONFLICT"

    invalid = client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "J",
            "email": "invalid",
            "password": "weak",
            "acceptedPolicies": False,
        },
    )
    assert invalid.status_code == 422
    assert invalid.json()["code"] == "VALIDATION_ERROR"
    assert "fieldErrors" in invalid.json()

    client.post("/api/v1/auth/logout", headers=csrf_headers(client))
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "parent@example.org", "password": "StrongPassword!1"},
    )
    assert login.status_code == 200
    changed = client.post(
        "/api/v1/auth/change-password",
        headers=csrf_headers(client),
        json={
            "currentPassword": "StrongPassword!1",
            "newPassword": "EvenStrongerPassword!2",
        },
    )
    assert changed.status_code == 200
    reauthenticated = client.post(
        "/api/v1/auth/reauthenticate",
        headers=csrf_headers(client),
        json={"password": "EvenStrongerPassword!2"},
    )
    assert reauthenticated.status_code == 200
    assert reauthenticated.json()["verified"] is True


def test_teacher_class_matrix_and_assignments_are_role_scoped() -> None:
    factory, client = database()
    register(client)
    learner = create_learner(client)
    with factory() as session:
        teacher = User(
            email="teacher@example.org",
            full_name="Ms. Rivera",
            password_hash=hash_password("TeacherPassword!1"),
            role="teacher",
            email_verified=True,
        )
        session.add(teacher)
        session.flush()
        classroom = Classroom(
            teacher_user_id=teacher.id,
            name="Room 4B",
            grade="Grade 1",
            school_name="ReadQuest Academy",
        )
        session.add(classroom)
        session.flush()
        session.add(
            ClassroomEnrollment(
                class_id=classroom.id,
                learner_id=learner["id"],
            )
        )
        session.commit()
        raw_session, csrf, _ = create_session(session, teacher)
        class_id = classroom.id

    client.cookies.clear()
    client.cookies.set("rq_session", raw_session)
    client.cookies.set("rq_csrf_token", csrf)
    profile = client.get("/api/v1/teacher/profile")
    assert profile.status_code == 200
    assert profile.json()["schoolName"] == "ReadQuest Academy"
    assert client.get(f"/api/v1/teacher/classes/{class_id}/learners").json()[0]["id"] == learner["id"]

    lesson_id = client.get(
        "/api/v1/curriculum/lessons?readingLevelId=level-1"
    ).json()[0]["id"]
    created = client.post(
        "/api/v1/assignments",
        headers=csrf_headers(client),
        json={
            "title": "Practice this quest",
            "classId": class_id,
            "teacherId": teacher.id,
            "lessonId": lesson_id,
            "lessonTitle": "Quest",
            "assignedLearnerIds": [learner["id"]],
            "dueDate": "2027-01-01T12:00:00Z",
            "instructions": "Complete at home.",
        },
    )
    assert created.status_code == 201, created.text
    matrix = client.get(
        f"/api/v1/teacher/classes/{class_id}/mastery-matrix"
    )
    assert matrix.status_code == 200
    assert matrix.json()[0]["learner"]["id"] == learner["id"]
    assert matrix.json()[0]["totalQuestsCompleted"] == 0

    forbidden = client.post(
        "/api/v1/assignments",
        headers=csrf_headers(client),
        json={
            "title": "Invalid",
            "classId": "missing",
            "lessonId": lesson_id,
            "lessonTitle": "Quest",
            "assignedLearnerIds": [learner["id"]],
        },
    )
    assert forbidden.status_code == 404
