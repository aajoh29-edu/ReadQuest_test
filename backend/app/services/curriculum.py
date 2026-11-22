import json
from copy import deepcopy
from functools import lru_cache
from pathlib import Path

DATA_FILE = (
    Path(__file__).resolve().parents[1] / "seeds" / "data" / "curriculum_seed.json"
)


@lru_cache(maxsize=1)
def curriculum() -> dict:
    with DATA_FILE.open(encoding="utf-8") as source:
        return json.load(source)


def public_lesson(lesson: dict) -> dict:
    result = deepcopy(lesson)
    for activity in result.get("activities", []):
        for option in activity.get("options", []):
            option.pop("isCorrect", None)
    result["questions"] = deepcopy(result.get("activities", []))
    result.setdefault("totalQuestions", result.get("totalActivities", 0))
    return result


def find_lesson(lesson_id: str) -> dict | None:
    return next(
        (lesson for lesson in curriculum()["lessons"] if lesson["id"] == lesson_id),
        None,
    )


def find_activity(activity_id: str) -> tuple[dict, dict] | None:
    for lesson in curriculum()["lessons"]:
        for activity in lesson["activities"]:
            if activity["id"] == activity_id:
                return lesson, activity
    return None


def find_skill(skill_id: str) -> dict | None:
    return next(
        (skill for skill in curriculum()["skills"] if skill["id"] == skill_id),
        None,
    )


def public_lessons(
    category_id: str | None = None,
    reading_level_id: str | None = None,
    query: str | None = None,
) -> list[dict]:
    lessons = curriculum()["lessons"]
    if category_id:
        lessons = [item for item in lessons if item["categoryId"] == category_id]
    if reading_level_id:
        lessons = [
            item for item in lessons if item["readingLevelId"] == reading_level_id
        ]
    if query and query.strip():
        term = query.strip().lower()
        lessons = [
            item
            for item in lessons
            if any(
                term in str(item.get(field, "")).lower()
                for field in ("title", "subtitle", "description", "categoryName")
            )
        ]
    return [public_lesson(item) for item in lessons]
