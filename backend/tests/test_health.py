from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.db.session import get_db_session
from app.main import app


def test_health_endpoint() -> None:
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "readquest-api"}


class AvailableSession:
    def execute(self, statement: object) -> None:
        return None


class UnavailableSession:
    def execute(self, statement: object) -> None:
        raise OperationalError("SELECT 1", {}, Exception("offline"))


def test_ready_endpoint_when_database_is_available() -> None:
    app.dependency_overrides[get_db_session] = lambda: AvailableSession()
    try:
        response = TestClient(app).get("/ready")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200


def test_ready_endpoint_when_database_is_unavailable() -> None:
    app.dependency_overrides[get_db_session] = lambda: UnavailableSession()
    try:
        response = TestClient(app).get("/ready")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 503
    assert response.json() == {"detail": "database unavailable"}
