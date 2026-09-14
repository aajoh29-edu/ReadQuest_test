from datetime import UTC, datetime
from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.routes import demo
from app.main import app


class DemoActivity:
    id = uuid4()
    title = "Short A Words Practice"
    prompt = "Choose the short a word."
    activity_type = type("ActivityTypeValue", (), {"value": "multiple_choice"})()
    difficulty = 2
    sequence = 1
    content = {"choices": ["cat", "dog"], "correct_index": 0}
    skill_links = []


class DemoSession:
    def scalars(self, statement: object) -> list[DemoActivity]:
        return [DemoActivity()]


class MissingActivitySession:
    def begin(self) -> "MissingActivitySession":
        return self

    def __enter__(self) -> "MissingActivitySession":
        return self

    def __exit__(self, exc_type: object, exc: object, traceback: object) -> None:
        return None

    def get(self, model: object, identity: object) -> None:
        return None


def test_demo_activities_endpoint_uses_response_contract() -> None:
    app.dependency_overrides[demo.get_db_session] = lambda: DemoSession()
    try:
        response = TestClient(app).get("/demo/activities")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["title"] == "Short A Words Practice"
    assert payload[0]["content"]["correct_index"] == 0


def test_demo_attempt_returns_404_for_unknown_activity() -> None:
    app.dependency_overrides[demo.get_db_session] = lambda: MissingActivitySession()
    try:
        response = TestClient(app).post(
            "/demo/attempts",
            json={
                "activity_id": str(uuid4()),
                "is_correct": True,
                "selected_index": 0,
                "response_ms": 1200,
                "occurred_at": datetime.now(UTC).isoformat(),
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404
