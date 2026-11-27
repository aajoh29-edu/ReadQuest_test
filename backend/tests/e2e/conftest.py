"""End-to-end fixtures.

The same journeys run in two modes:

* default: in-process against a freshly seeded SQLite database (fast, used by `pytest`);
* live: set READQUEST_E2E_BASE_URL (for example http://backend:8000) to drive a running
  stack over HTTP, as the `e2e` service in compose.test.yaml does. The target database
  must be migrated and seeded (python -m app.seeds.demo) and auto-verify email enabled.
"""

import os
from collections.abc import Callable, Generator
from uuid import uuid4

import httpx2 as httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.main import app
from app.models import Base
from app.seeds.demo import seed_demo

LIVE_URL = os.getenv("READQUEST_E2E_BASE_URL")
PASSWORD = "StrongPassword!1"


class Api:
    """Thin wrapper that adds the CSRF header to state-changing calls."""

    def __init__(self, client: httpx.Client) -> None:
        self.client = client

    def get(self, path: str, **kwargs) -> httpx.Response:
        return self.client.get(path, **kwargs)

    def send(self, method: str, path: str, **kwargs) -> httpx.Response:
        headers = {"X-CSRF-Token": self.client.cookies.get("rq_csrf_token") or ""}
        headers.update(kwargs.pop("headers", {}))
        return self.client.request(method, path, headers=headers, **kwargs)

    def post(self, path: str, **kwargs) -> httpx.Response:
        return self.send("POST", path, **kwargs)

    def register(self, name: str = "Jordan Parent") -> dict:
        email = f"e2e-{uuid4().hex[:12]}@example.org"
        response = self.client.post(
            "/api/v1/auth/register",
            json={
                "fullName": name,
                "email": email,
                "password": PASSWORD,
                "acceptedPolicies": True,
            },
        )
        assert response.status_code == 201, response.text
        assert self.client.cookies.get("rq_session")
        return {"email": email, "password": PASSWORD}

    def create_learner(self, name: str = "Avery", level: str = "level-1") -> dict:
        response = self.post(
            "/api/v1/learners",
            json={
                "name": name,
                "avatar": "fox",
                "avatarName": "Fox Scout",
                "readingLevelId": level,
                "gradeLevel": "Grade 1",
            },
        )
        assert response.status_code == 201, response.text
        return response.json()


@pytest.fixture(scope="module")
def new_api() -> Generator[Callable[[], Api], None, None]:
    clients: list[httpx.Client] = []
    if LIVE_URL:

        def factory() -> Api:
            client = httpx.Client(base_url=LIVE_URL, timeout=15)
            clients.append(client)
            return Api(client)

        yield factory
    else:
        engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(engine)
        sessions = sessionmaker(engine, expire_on_commit=False)

        def override_db() -> Generator[Session, None, None]:
            with sessions() as session:
                yield session

        app.dependency_overrides[get_db] = override_db
        with sessions() as session:
            seed_demo(session)

        def factory() -> Api:
            client = TestClient(app)
            clients.append(client)
            return Api(client)

        yield factory
        app.dependency_overrides.pop(get_db, None)
    for client in clients:
        client.close()
