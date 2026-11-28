from collections import defaultdict
from datetime import UTC, datetime, timedelta
from itertools import pairwise
from random import Random

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adapters.question_repository import VARIED_ACTIVITY_PREFIX
from app.models.curriculum import Activity, Learner
from app.models.learning import LearningSession
from app.models.progress import Attempt
from app.services.curriculum import curriculum, find_lesson


def utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def iso(value: datetime | None) -> str | None:
    return utc(value).isoformat() if value is not None else None


def attempt_payload(attempt: Attempt) -> dict:
    payload = {
        "idempotencyKey": attempt.idempotency_key or attempt.id,
        "activityId": attempt.activity_id,
        "selectedOptionId": attempt.selected_option_id or "",
        "isCorrect": attempt.is_correct,
        "correctOptionId": attempt.correct_option_id or "",
        "explanation": attempt.explanation or "",
        "timestamp": iso(attempt.attempted_at),
        "activeDurationSeconds": attempt.active_duration_seconds,
        "attemptNumber": attempt.attempt_number,
    }
    payload["questionId"] = attempt.activity_id
    return payload


def build_practice_activities(db: Session, lesson: dict) -> list[dict]:
    authored = lesson["activities"]
    candidates = db.scalars(
        select(Activity).where(
            Activity.primary_skill_id.in_({activity["primarySkillId"] for activity in authored}),
            Activity.id.startswith(VARIED_ACTIVITY_PREFIX),
        ).order_by(Activity.id)
    )
    variants = defaultdict(list)
    for candidate in candidates:
        content = candidate.content
        if content.get("lessonId") == lesson["id"]:
            variants[(candidate.primary_skill_id, content["order"])].append(content)

    rng = Random()
    activities = []
    for original in authored:
        pool = variants[(original["primarySkillId"], original["order"])]
        activity = rng.choice(pool) if pool else original
        options = list(activity["options"])
        rng.shuffle(options)
        activities.append({**activity, "options": options})
    rng.shuffle(activities)
    return activities


def session_activities(item: LearningSession, lesson: dict | None) -> list[dict]:
    if item.practice_activities is not None:
        return item.practice_activities
    return lesson["activities"] if lesson else []


def session_payload(db: Session, item: LearningSession) -> dict:
    lesson = find_lesson(item.lesson_id)
    attempts = list(
        db.scalars(
            select(Attempt)
            .where(Attempt.session_id == item.id)
            .order_by(Attempt.attempted_at, Attempt.id)
        )
    )
    serialized_attempts = [attempt_payload(attempt) for attempt in attempts]
    total = item.total_activities or (lesson["totalActivities"] if lesson else 0)
    return {
        "id": item.id,
        "learnerId": item.learner_id,
        "lessonId": item.lesson_id,
        "lessonTitle": lesson["title"] if lesson else item.lesson_id,
        "categoryId": lesson["categoryId"] if lesson else "comprehension",
        "readingLevelId": lesson["readingLevelId"] if lesson else "level-1",
        "startedAt": iso(item.started_at),
        "updatedAt": iso(item.updated_at),
        "completedAt": iso(item.completed_at),
        "currentActivityIndex": item.current_activity_index,
        "attempts": serialized_attempts,
        "activities": [
            {
                **activity,
                "options": [
                    {key: value for key, value in option.items() if key != "isCorrect"}
                    for option in activity["options"]
                ],
            }
            for activity in session_activities(item, lesson)
        ],
        "isCompleted": item.is_completed,
        "score": item.score,
        "totalActivities": total,
        "accuracy": item.accuracy,
        "totalActiveDurationSeconds": item.total_active_duration_seconds,
        "earnedRewardId": item.earned_badge,
        "earnedBadge": item.earned_badge,
        "currentQuestionIndex": item.current_activity_index,
        "answers": serialized_attempts,
        "totalQuestions": total,
    }


def calculate_mastery(attempts: list[Attempt], now: datetime | None = None) -> dict:
    recent = list(
        reversed(
            sorted(attempts, key=lambda item: utc(item.attempted_at))[-10:]
        )
    )
    if not recent:
        return {
            "score": None,
            "accuracy": 0.0,
            "recency": 0.0,
            "consistency": 0.0,
            "windowCount": 0,
            "sessionCount": 0,
        }
    chronological = list(reversed(recent))
    accuracy = sum(item.is_correct for item in chronological) / len(chronological)
    clock = now or datetime.now(UTC)
    recency = sum(
        item.is_correct
        * (2 ** (-max(0.0, (clock - utc(item.attempted_at)).total_seconds() / 86400) / 14))
        for item in chronological
    ) / len(chronological)
    consistency = (
        float(chronological[0].is_correct)
        if len(chronological) == 1
        else sum(left.is_correct and right.is_correct for left, right in pairwise(chronological))
        / (len(chronological) - 1)
    )
    return {
        "score": max(0.0, min(100.0, 100 * (0.6 * accuracy + 0.2 * recency + 0.2 * consistency))),
        "accuracy": accuracy,
        "recency": recency,
        "consistency": consistency,
        "windowCount": len(chronological),
        "sessionCount": len({item.session_id for item in chronological if item.session_id}),
    }


def mastery_payloads(
    db: Session, learner: Learner, now: datetime | None = None
) -> list[dict]:
    all_attempts = list(
        db.scalars(
            select(Attempt)
            .where(Attempt.child_id == learner.id)
            .order_by(Attempt.attempted_at)
        )
    )
    by_skill: dict[str, list[Attempt]] = defaultdict(list)
    for attempt in all_attempts:
        by_skill[attempt.skill_id].append(attempt)
    result: list[dict] = []
    for skill in curriculum()["skills"]:
        attempts = by_skill.get(skill["id"], [])
        calculated = calculate_mastery(attempts, now)
        count = len(attempts)
        score = calculated["score"]
        if count == 0:
            evidence = "unknown"
            band = "unknown"
        elif count < 5:
            evidence = "provisional"
            band = mastery_band(score or 0.0)
        elif calculated["sessionCount"] < 2:
            evidence = "insufficient_sessions"
            band = mastery_band(score or 0.0)
        else:
            evidence = "confirmed"
            band = mastery_band(score or 0.0)
        confirmed = evidence == "confirmed" and band == "mastered"
        review_days = 1 if band in {"needs_focus", "unknown"} else 7 if band == "developing" else 14
        last_attempt = max(attempts, key=lambda item: utc(item.attempted_at), default=None)
        next_review = (
            utc(last_attempt.attempted_at) + timedelta(days=review_days)
            if last_attempt
            else None
        )
        correct = sum(item.is_correct for item in attempts)
        result.append(
            {
                "skillId": skill["id"],
                "code": skill["code"],
                "skillName": skill["name"],
                "categoryId": skill["categoryId"],
                "readingLevelId": skill["targetReadingLevel"],
                "score": score,
                "band": band,
                "evidenceStatus": evidence,
                "isConfirmedMastered": confirmed,
                "components": {
                    "accuracy": calculated["accuracy"],
                    "recency": calculated["recency"],
                    "consistency": calculated["consistency"],
                },
                "windowAttemptCount": calculated["windowCount"],
                "totalAttemptCount": count,
                "sessionCount": len({item.session_id for item in attempts if item.session_id}),
                "lastAttemptAt": iso(last_attempt.attempted_at) if last_attempt else None,
                "nextReviewDueDate": iso(next_review),
                "reviewIntervalDays": review_days,
                "isReviewDue": next_review is not None and next_review <= (now or datetime.now(UTC)),
                "configVersion": "1.0.0",
                "calculatedAt": iso(now or datetime.now(UTC)),
                "status": "not-started"
                if count == 0
                else "mastered"
                if confirmed
                else "in-progress",
                "accuracy": calculated["accuracy"],
                "activitiesAttempted": count,
                "activitiesCorrect": correct,
                "lastPracticedAt": iso(last_attempt.attempted_at) if last_attempt else "",
            }
        )
    return result


def mastery_band(score: float) -> str:
    if score < 60:
        return "needs_focus"
    if score < 75:
        return "developing"
    if score < 90:
        return "proficient"
    return "mastered"


def progress_summary(
    db: Session, learner_id: str
) -> dict:
    sessions = list(
        db.scalars(
            select(LearningSession).where(LearningSession.learner_id == learner_id)
        )
    )
    attempts = list(
        db.scalars(select(Attempt).where(Attempt.child_id == learner_id))
    )
    completed = [item for item in sessions if item.is_completed]
    correct = sum(item.is_correct for item in attempts)
    category_progress = {}
    level_progress = {}
    for category in curriculum()["categories"]:
        category_lessons = [
            lesson
            for lesson in curriculum()["lessons"]
            if lesson["categoryId"] == category["id"]
        ]
        category_sessions = [
            session
            for session in completed
            if session.lesson_id in {lesson["id"] for lesson in category_lessons}
        ]
        category_attempts = [
            attempt for attempt in attempts if attempt.lesson_id in {lesson["id"] for lesson in category_lessons}
        ]
        category_progress[category["id"]] = {
            "completed": len(category_sessions) == len(category_lessons),
            "bestScore": max((item.score for item in category_sessions), default=0),
            "attempts": len(category_attempts),
        }
    for level in curriculum()["readingLevels"]:
        level_lessons = [
            lesson
            for lesson in curriculum()["lessons"]
            if lesson["readingLevelId"] == level["id"]
        ]
        level_progress[level["id"]] = {
            "completedCount": len(
                [
                    item
                    for item in completed
                    if item.lesson_id in {lesson["id"] for lesson in level_lessons}
                ]
            ),
            "totalCount": len(level_lessons),
        }
    return {
        "totalLessonsCompleted": len(completed),
        "totalQuestionsAnswered": len(attempts),
        "totalCorrectAnswers": correct,
        "averageAccuracy": (correct / len(attempts)) if attempts else 0.0,
        "totalActivePracticeSeconds": sum(
            item.active_duration_seconds for item in attempts
        ),
        "categoriesProgress": category_progress,
        "levelsProgress": level_progress,
    }


def owned_or_enrolled(
    db: Session, user, learner_id: str
) -> Learner | None:
    learner = db.get(Learner, learner_id)
    if learner is None:
        return None
    if learner.parent_user_id == user.id or user.role == "admin":
        return learner
    from app.models.portal import Classroom, ClassroomEnrollment

    enrolled = db.scalar(
        select(ClassroomEnrollment)
        .join(Classroom, Classroom.id == ClassroomEnrollment.class_id)
        .where(
            ClassroomEnrollment.learner_id == learner_id,
            Classroom.teacher_user_id == user.id,
        )
    )
    return learner if enrolled else None


def require_learner_access(
    db: Session, user, learner_id: str
) -> Learner:
    from fastapi import HTTPException

    learner = owned_or_enrolled(db, user, learner_id)
    if learner is None:
        exists = db.get(Learner, learner_id)
        raise HTTPException(
            status_code=404 if exists is None else 403,
            detail="Learner not found." if exists is None else "Learner access denied.",
        )
    return learner
