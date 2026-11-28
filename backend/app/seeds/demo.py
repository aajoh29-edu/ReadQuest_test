import json
import sys
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.curriculum import Activity, Book, BookSkill, ReadingText, Skill
from app.models.enums import ActivityType, BookSource, ContentStatus, ReadingTextType
from app.seeds.varied_questions import seed_varied_questions
from app.utils.tokenizer import tokenize_pages, tokenize_text

DATA_DIR = Path(__file__).with_name("data")


def _load_fixture(name: str) -> dict:
    with (DATA_DIR / name).open(encoding="utf-8") as source:
        return json.load(source)


def _validate_books(rows: list[dict]) -> None:
    ids: set[str] = set()
    for row in rows:
        if row["id"] in ids:
            raise ValueError(f"Duplicate book id: {row['id']}")
        ids.add(row["id"])
        if row["level"] < 1 or row["level"] > 10:
            raise ValueError(f"Invalid level for {row['id']}")
        expected_count = len(tokenize_pages(row["content"]["pages"]))
        if row["word_count"] != expected_count:
            raise ValueError(
                f"Word count mismatch for {row['id']}: "
                f"{row['word_count']} != {expected_count}"
            )
        if not row["content"]["pages"]:
            raise ValueError(f"Book has no pages: {row['id']}")


def _validate_reading_texts(rows: list[dict]) -> None:
    activity_ids: set[str] = set()
    for row in rows:
        if row["activity_id"] in activity_ids:
            raise ValueError(f"Reading text duplicates activity: {row['activity_id']}")
        activity_ids.add(row["activity_id"])
        if row["difficulty"] not in range(1, 11):
            raise ValueError(f"Invalid reading text level: {row['activity_id']}")
        expected = row.get("expected_words")
        if expected is not None and expected != tokenize_text(row["text"]):
            raise ValueError(f"Expected words do not match text: {row['activity_id']}")


def _upsert(session: Session, model: type, values: dict, primary_key: str = "id") -> None:
    instance = session.get(model, values[primary_key])
    if instance is None:
        session.add(model(**values))
        return
    for key, value in values.items():
        setattr(instance, key, value)


def seed_demo(session: Session) -> dict[str, int]:
    curriculum = _load_fixture("curriculum_seed.json")
    frontend_skills = curriculum["skills"]
    frontend_lessons = curriculum["lessons"]
    books = _load_fixture("books_seed.json")["books"]
    reading_texts = _load_fixture("reading_texts_seed.json")["reading_texts"]
    skills = _load_fixture("reading_texts_seed.json")["skills"]
    _validate_books(books)
    _validate_reading_texts(reading_texts)

    for item in skills:
        _upsert(session, Skill, item)
    for item in frontend_skills:
        _upsert(
            session,
            Skill,
            {"id": item["id"], "code": item["code"], "name": item["name"]},
        )
    session.flush()

    frontend_activities = 0
    for lesson in frontend_lessons:
        for activity in lesson["activities"]:
            frontend_activities += 1
            _upsert(
                session,
                Activity,
                {
                    "id": activity["id"],
                    "primary_skill_id": activity["primarySkillId"],
                    "type": ActivityType(activity["type"].replace("-", "_")),
                    "difficulty": {"beginner": 1, "intermediate": 2, "advanced": 3}[
                        activity["difficulty"]
                    ],
                    "content": activity,
                },
            )
    session.flush()

    print("Generating and seeding relational question bank activities...", file=sys.stderr)
    varied_activities = seed_varied_questions(session, per_skill=12, seed=20261130)["total"]

    for row in books:
        _upsert(
            session,
            Book,
            {
                **row,
                "content_status": ContentStatus(row["content_status"]),
                "source": BookSource(row["source"]),
            },
        )
    session.flush()

    book_rows = list(session.scalars(select(Book).where(Book.id.in_([b["id"] for b in books]))))
    skill_ids = [item["id"] for item in skills]
    for index, book_row in enumerate(sorted(book_rows, key=lambda item: item.id)):
        skill_id = skill_ids[index % len(skill_ids)]
        existing = session.get(BookSkill, (book_row.id, skill_id))
        if existing is None:
            session.add(BookSkill(book_id=book_row.id, skill_id=skill_id, weight=Decimal(1)))

    for row in reading_texts:
        activity_values = {
            "id": row["activity_id"],
            "primary_skill_id": row["skill_id"],
            "type": ActivityType(row["activity_type"]),
            "difficulty": row["difficulty"],
            "content": row.get("content", {"show_word_bank": True}),
        }
        _upsert(session, Activity, activity_values)
    session.flush()

    for row in reading_texts:
        reading_text = session.get(ReadingText, row["id"])
        if reading_text is None:
            reading_text = ReadingText(id=row["id"])
        reading_text.activity_id = row["activity_id"]
        reading_text.text = row["text"]
        reading_text.text_type = ReadingTextType(row["text_type"])
        reading_text.expected_words = tokenize_text(row["text"])
        reading_text.word_count = len(reading_text.expected_words)
        reading_text.level = row["difficulty"]
        session.add(reading_text)

    session.flush()
    totals: dict[str, Decimal] = defaultdict(Decimal)
    for link in session.scalars(select(BookSkill).where(BookSkill.book_id.in_([b["id"] for b in books]))):
        totals[link.book_id] += Decimal(link.weight)
    invalid = [book_id for book_id, total in totals.items() if total != Decimal(1)]
    if invalid:
        raise ValueError(f"Book skill weights must sum to 1: {invalid}")
    session.commit()
    return {
        "books": len(books),
        "skills": len(skills) + len(frontend_skills),
        "activities": len(reading_texts) + frontend_activities + varied_activities,
        "varied_activities": varied_activities,
        "reading_texts": len(reading_texts),
    }


if __name__ == "__main__":
    from app.db import SessionLocal, engine
    from app.models import Base

    Base.metadata.create_all(engine)
    with SessionLocal() as db_session:
        print(json.dumps(seed_demo(db_session), indent=2))
