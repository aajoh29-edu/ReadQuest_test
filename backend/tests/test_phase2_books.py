from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import get_db
from app.main import app
from app.models import Base
from app.models.account import User
from app.models.curriculum import Activity, Book, ChildBook, Learner, ReadingText
from app.seeds.demo import seed_demo
from app.utils.tokenizer import tokenize_text
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


def test_seed_is_idempotent_and_complete() -> None:
    factory, _client = database()
    with factory() as session:
        first = seed_demo(session)
        second = seed_demo(session)
        assert first == second
        assert second["books"] == 16
        assert session.scalar(select(func.count()).select_from(Book)) == 16
        assert (
            session.scalar(
                select(func.count())
                .select_from(Book)
                .where(Book.content_status == "published")
            )
            == 16
        )
        texts = session.scalars(select(ReadingText)).all()
        assert len(texts) == 136
        assert all(text.expected_words == tokenize_text(text.text) for text in texts)
        assert all(text.word_count == len(text.expected_words) for text in texts)
        activity_ids = {text.activity_id for text in texts}
        all_activity_ids = set(session.scalars(select(Activity.id)))
        assert activity_ids.issubset(all_activity_ids)
        assert len(all_activity_ids) == 196


def test_licensed_book_levels_pages_and_attribution() -> None:
    factory, _client = database()
    with factory() as session:
        seed_demo(session)
        expected = {
            "licensed-too-big-too-small": (1, 13),
            "licensed-sam-big-fish": (2, 10),
            "licensed-cloud-trash": (2, 16),
            "licensed-joseph-dreamer": (3, 27),
            "licensed-story-ruth": (4, 44),
            "licensed-missing-water": (5, 21),
        }
        for book_id, (level, pages) in expected.items():
            book = session.get(Book, book_id)
            assert book is not None
            assert book.level == level
            assert len(book.content["pages"]) == pages
            assert [
                page["page_number"] for page in book.content["pages"]
            ] == sorted(page["page_number"] for page in book.content["pages"])
            assert book.cover_url is None
            assert book.attribution["creator_credits"]
            assert book.attribution["copyright_notice"]
            assert book.attribution["edition_url"]
            assert book.attribution["license_url"]
            assert "text-only" in book.attribution["reformatting_note"].lower()


def test_library_filters_and_no_quiz_finish_flow_awards_once() -> None:
    factory, client = database()
    with factory() as session:
        seed_demo(session)
        user = User(
            email="parent@example.org",
            full_name="Parent",
            password_hash=hash_password("StrongPassword!1"),
            role="parent",
            email_verified=True,
        )
        session.add(user)
        session.flush()
        session.add(
            Learner(id="child-demo", parent_user_id=user.id, stars_earned=0)
        )
        session.commit()
        raw_session, csrf, _ = create_session(session, user)
    client.cookies.set("rq_session", raw_session)
    client.cookies.set("rq_csrf_token", csrf)

    response = client.get("/api/v1/books?level=2&limit=20")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 4
    assert all(item["level"] == 2 for item in payload["items"])

    detail = client.get("/api/v1/books/licensed-joseph-dreamer")
    assert detail.status_code == 200
    assert len(detail.json()["content"]["pages"]) == 27
    assert detail.json()["attribution"]["license_url"].endswith("by-sa/4.0/")

    finish = client.post(
        "/api/v1/children/child-demo/books/licensed-joseph-dreamer/progress",
        headers={"X-CSRF-Token": csrf},
        json={"status": "finished", "last_page": 1, "minutes_read": 8},
    )
    assert finish.status_code == 200
    assert finish.json()["last_page"] == 27
    assert finish.json()["stars_awarded"] == 1
    repeated = client.post(
        "/api/v1/children/child-demo/books/licensed-joseph-dreamer/progress",
        headers={"X-CSRF-Token": csrf},
        json={"status": "finished", "last_page": 27, "minutes_read": 8},
    )
    assert repeated.json()["stars_awarded"] == 0
    with factory() as session:
        learner = session.get(Learner, "child-demo")
        progress = session.get(ChildBook, ("child-demo", "licensed-joseph-dreamer"))
        assert learner is not None and learner.stars_earned == 1
        assert progress is not None and progress.status == "finished"
