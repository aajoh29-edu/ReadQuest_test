from collections.abc import Generator
import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.main import app
from app.models import Base
from app.models.account import User
from app.models.portal import Assignment, AssignmentTarget, Classroom, ClassroomEnrollment
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


def test_demo_activity_and_attempt_flow() -> None:
    _factory, client = database()
    activities = client.get("/demo/activities")
    assert activities.status_code == 200
    activity = activities.json()[0]
    assert all("isCorrect" not in option for option in activity["content"]["options"])
    attempt = client.post(
        "/demo/attempts",
        json={
            "activity_id": activity["id"],
            "selected_option_id": activity["content"]["options"][0]["id"],
        },
    )
    assert attempt.status_code == 200
    assert attempt.json()["activityId"] == activity["id"]
    assert isinstance(attempt.json()["isCorrect"], bool)


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


def test_finished_quest_completes_matching_assignments_for_only_that_learner() -> None:
    factory, client = database()
    register(client)
    learner = create_learner(client)
    other_learner = create_learner(client)
    parent_cookies = dict(client.cookies)
    lessons = client.get("/api/v1/curriculum/lessons?readingLevelId=level-1").json()
    lesson, other_lesson = lessons[:2]

    with factory() as db:
        teacher = User(
            email="teacher@example.org",
            full_name="Teacher",
            password_hash=hash_password("TeacherPassword!1"),
            role="teacher",
            email_verified=True,
        )
        db.add(teacher)
        db.flush()
        classroom = Classroom(
            teacher_user_id=teacher.id, name="Room 1", grade="Grade 1"
        )
        db.add(classroom)
        db.flush()
        db.add_all([
            ClassroomEnrollment(class_id=classroom.id, learner_id=learner["id"]),
            ClassroomEnrollment(class_id=classroom.id, learner_id=other_learner["id"]),
        ])
        db.flush()
        teacher_session, teacher_csrf, _ = create_session(db, teacher)
        class_id = classroom.id
        db.commit()

    def sign_in(cookies: dict[str, str]) -> None:
        client.cookies.clear()
        for name, value in cookies.items():
            client.cookies.set(name, value)

    sign_in({"rq_session": teacher_session, "rq_csrf_token": teacher_csrf})

    def assign(lesson_id: str) -> dict:
        response = client.post(
            "/api/v1/assignments",
            headers=csrf_headers(client),
            json={
                "title": "Practice",
                "classId": class_id,
                "lessonId": lesson_id,
                "lessonTitle": "Practice",
                "assignedLearnerIds": [learner["id"], other_learner["id"]],
            },
        )
        assert response.status_code == 201, response.text
        return response.json()

    first = assign(lesson["id"])
    second = assign(lesson["id"])
    different = assign(other_lesson["id"])

    sign_in(parent_cookies)
    session = client.post(
        "/api/v1/sessions",
        headers=csrf_headers(client),
        json={"lessonId": lesson["id"], "learnerId": learner["id"]},
    ).json()
    for activity in lesson["activities"]:
        response = client.post(
            f"/api/v1/sessions/{session['id']}/attempts",
            headers=csrf_headers(client),
            json={
                "activityId": activity["id"],
                "selectedOptionId": activity["options"][0]["id"],
                "activeDurationSeconds": 1,
            },
        )
        assert response.status_code == 200, response.text
    response = client.post(
        f"/api/v1/sessions/{session['id']}/complete", headers=csrf_headers(client)
    )
    assert response.status_code == 200

    sign_in({"rq_session": teacher_session, "rq_csrf_token": teacher_csrf})
    assignments = client.get(f"/api/v1/assignments?classId={class_id}").json()
    by_id = {item["id"]: item for item in assignments}
    assert by_id[first["id"]]["completedLearnerIds"] == [learner["id"]]
    assert by_id[second["id"]]["completedLearnerIds"] == [learner["id"]]
    assert by_id[different["id"]]["completedLearnerIds"] == []
    with factory() as db:
        completed_at = db.get(AssignmentTarget, (first["id"], learner["id"])).completed_at
        assert completed_at is not None
        assert db.get(AssignmentTarget, (first["id"], other_learner["id"])).completed_at is None

    later = assign(lesson["id"])
    sign_in(parent_cookies)
    assert client.post(
        f"/api/v1/sessions/{session['id']}/complete", headers=csrf_headers(client)
    ).status_code == 200
    with factory() as db:
        assert db.get(AssignmentTarget, (first["id"], learner["id"])).completed_at == completed_at
        assert db.get(AssignmentTarget, (later["id"], learner["id"])).completed_at is None


def test_incomplete_quest_does_not_complete_assignment() -> None:
    factory, client = database()
    register(client)
    learner = create_learner(client)
    lesson = client.get("/api/v1/curriculum/lessons?readingLevelId=level-1").json()[0]
    with factory() as db:
        assignment = Assignment(
            title="Practice",
            lesson_id=lesson["id"],
            assigned_learner_ids=[learner["id"]],
        )
        db.add(assignment)
        db.flush()
        db.add(AssignmentTarget(assignment_id=assignment.id, learner_id=learner["id"]))
        assignment_id = assignment.id
        db.commit()
    session = client.post(
        "/api/v1/sessions",
        headers=csrf_headers(client),
        json={"lessonId": lesson["id"], "learnerId": learner["id"]},
    ).json()
    activity = lesson["activities"][0]
    for _ in range(len(lesson["activities"])):
        assert client.post(
            f"/api/v1/sessions/{session['id']}/attempts",
            headers=csrf_headers(client),
            json={
                "activityId": activity["id"],
                "selectedOptionId": activity["options"][0]["id"],
                "activeDurationSeconds": 1,
            },
        ).status_code == 200
    assert client.post(
        f"/api/v1/sessions/{session['id']}/complete", headers=csrf_headers(client)
    ).status_code == 200
    with factory() as db:
        assert db.get(AssignmentTarget, (assignment_id, learner["id"])).completed_at is None


def test_administrator_teacher_setup(monkeypatch, capsys) -> None:
    from app import teacher_setup

    factory, client = database()
    register(client)
    learner = create_learner(client)
    with factory() as db:
        teacher = User(
            email="teacher@example.org",
            full_name="Teacher",
            password_hash=hash_password("TeacherPassword!1"),
            role="parent",
            email_verified=True,
        )
        db.add(teacher)
        db.commit()
        teacher_id = teacher.id
        teacher_session, teacher_csrf, _ = create_session(db, teacher)
        db.commit()
    monkeypatch.setattr(teacher_setup, "SessionLocal", factory)

    with pytest.raises(SystemExit) as failure:
        teacher_setup.main([
            "create-class", "--teacher-email", "teacher@example.org",
            "--name", "Room 1", "--grade", "Grade 1",
        ])
    assert failure.value.code == 2
    assert "verified teacher or admin" in capsys.readouterr().err
    with factory() as db:
        db.get(User, teacher_id).email_verified = False
        db.commit()
    with pytest.raises(SystemExit) as failure:
        teacher_setup.main(["promote-teacher", "--email", "teacher@example.org"])
    assert failure.value.code == 2
    assert "Verify the account email" in capsys.readouterr().err
    with factory() as db:
        assert db.get(User, teacher_id).role == "parent"
        db.get(User, teacher_id).email_verified = True
        db.commit()

    teacher_setup.main(["promote-teacher", "--email", "TEACHER@example.org"])
    assert json.loads(capsys.readouterr().out) == {"userId": teacher_id, "role": "teacher"}
    teacher_setup.main([
        "create-class", "--teacher-email", "teacher@example.org",
        "--name", "Room 1", "--grade", "Grade 1", "--school", "School",
    ])
    class_id = json.loads(capsys.readouterr().out)["classId"]
    teacher_setup.main(["list-learners", "--parent-email", "parent@example.org"])
    assert json.loads(capsys.readouterr().out) == [
        {"learnerId": learner["id"], "name": learner["name"]}
    ]
    for _ in range(2):
        teacher_setup.main(["enroll", "--class-id", class_id, "--learner-id", learner["id"]])
        assert json.loads(capsys.readouterr().out)["classId"] == class_id

    client.cookies.clear()
    client.cookies.set("rq_session", teacher_session)
    client.cookies.set("rq_csrf_token", teacher_csrf)
    assert client.get("/api/v1/teacher/classes").json()[0]["id"] == class_id
    assert client.get(f"/api/v1/teacher/classes/{class_id}/learners").json()[0]["id"] == learner["id"]
    with pytest.raises(SystemExit) as failure:
        teacher_setup.main(["enroll", "--class-id", class_id, "--learner-id", "missing"])
    assert failure.value.code == 2
    assert "Learner not found" in capsys.readouterr().err
