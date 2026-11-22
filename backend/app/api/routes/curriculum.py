from fastapi import APIRouter, HTTPException, Query

from app.services.curriculum import curriculum, find_lesson, public_lesson, public_lessons

router = APIRouter(tags=["curriculum"])


@router.get("/curriculum/levels")
def reading_levels() -> list[dict]:
    return curriculum()["readingLevels"]


@router.get("/curriculum/skills")
def skills() -> list[dict]:
    return curriculum()["skills"]


@router.get("/curriculum/categories")
def categories() -> list[dict]:
    lessons = public_lessons()
    return [
        {**category, "lessons": [item for item in lessons if item["categoryId"] == category["id"]]}
        for category in curriculum()["categories"]
    ]


@router.get("/curriculum/lessons")
def lessons(
    categoryId: str | None = Query(default=None),
    readingLevelId: str | None = Query(default=None),
    q: str | None = Query(default=None),
) -> list[dict]:
    return public_lessons(categoryId, readingLevelId, q)


@router.get("/curriculum/lessons/{lesson_id}")
def lesson(lesson_id: str) -> dict:
    item = find_lesson(lesson_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    return public_lesson(item)
