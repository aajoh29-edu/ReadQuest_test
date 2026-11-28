from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select, update
from sqlalchemy.orm import Session

from app.api.dependencies import require_current_user, require_session
from app.db import get_db
from app.models.account import AuthSession, User
from app.models.curriculum import Learner
from app.models.learning import LearningSession
from app.models.portal import Assignment, AssignmentTarget
from app.models.progress import Attempt, SkillMastery
from app.schemas.learning import AttemptRequest, SessionRequest
from app.services.curriculum import curriculum, find_lesson, find_skill
from app.services.learning import (
    attempt_payload,
    build_practice_activities,
    calculate_mastery,
    mastery_payloads,
    progress_summary,
    require_learner_access,
    session_activities,
    session_payload,
)

router = APIRouter(tags=["learning"])


def _session_for_user(db: Session, user: User, session_id: str) -> LearningSession:
    item = db.get(LearningSession, session_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    require_learner_access(db, user, item.learner_id)
    return item


@router.get("/sessions")
def sessions(
    learnerId: str | None = Query(default=None),
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> list[dict]:
    user, session = session_data
    if learnerId:
        learner_ids = [require_learner_access(db, user, learnerId).id]
    else:
        learner_ids = [
            learner.id
            for learner in db.scalars(
                select(Learner).where(Learner.parent_user_id == user.id)
            )
        ]
        if not learner_ids and session.active_learner_id:
            learner_ids = [session.active_learner_id]
    items = list(
        db.scalars(
            select(LearningSession)
            .where(LearningSession.learner_id.in_(learner_ids or []))
            .order_by(desc(LearningSession.started_at))
        )
    )
    return [session_payload(db, item) for item in items]


@router.get("/sessions/active")
def active_session(
    lessonId: str | None = Query(default=None),
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> dict | None:
    user, auth_session = session_data
    if auth_session.active_learner_id:
        require_learner_access(db, user, auth_session.active_learner_id)
    statement = select(LearningSession).where(
        LearningSession.learner_id == auth_session.active_learner_id,
        LearningSession.is_completed.is_(False),
    )
    if lessonId:
        statement = statement.where(LearningSession.lesson_id == lessonId)
    item = db.scalar(statement.order_by(desc(LearningSession.started_at)))
    return session_payload(db, item) if item else None


@router.post("/sessions")
def start_session(
    payload: SessionRequest,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user, auth_session = session_data
    learner = require_learner_access(db, user, payload.learner_id)
    lesson = find_lesson(payload.lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    existing = db.scalar(
        select(LearningSession).where(
            LearningSession.learner_id == learner.id,
            LearningSession.lesson_id == lesson["id"],
            LearningSession.is_completed.is_(False),
        )
    )
    if existing is None:
        activities = build_practice_activities(db, lesson)
        existing = LearningSession(
            learner_id=learner.id,
            lesson_id=lesson["id"],
            total_activities=len(activities),
            practice_activities=activities,
        )
        db.add(existing)
    auth_session.active_learner_id = learner.id
    learner.last_active_lesson_id = lesson["id"]
    db.commit()
    db.refresh(existing)
    return session_payload(db, existing)


@router.get("/sessions/{session_id}")
def get_session(
    session_id: str,
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    return session_payload(db, _session_for_user(db, user, session_id))


@router.post("/sessions/{session_id}/attempts")
def submit_attempt(
    session_id: str,
    payload: AttemptRequest,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    learning_session = _session_for_user(db, user, session_id)
    if learning_session.is_completed:
        raise HTTPException(status_code=409, detail="Session is already complete.")
    lesson = find_lesson(learning_session.lesson_id)
    activity = next(
        (item for item in session_activities(learning_session, lesson) if item["id"] == payload.activity_id),
        None,
    )
    if activity is None:
        raise HTTPException(status_code=422, detail="Activity does not belong to this session.")
    idempotency_key = payload.idempotency_key or uuid4().hex
    prior = db.scalar(
        select(Attempt).where(
            Attempt.session_id == session_id,
            Attempt.idempotency_key == idempotency_key,
        )
    )
    if prior is not None:
        return {
            "session": session_payload(db, learning_session),
            "gradedAnswer": attempt_payload(prior),
        }
    expected = next(
        (option for option in activity["options"] if option.get("isCorrect")),
        None,
    )
    selected = next(
        (option for option in activity["options"] if option["id"] == payload.selected_option_id),
        None,
    )
    if expected is None or selected is None:
        raise HTTPException(status_code=422, detail="Selected option is not valid.")
    is_correct = expected["id"] == selected["id"]
    attempt_number = (
        db.scalar(
            select(Attempt)
            .where(
                Attempt.session_id == session_id,
                Attempt.activity_id == payload.activity_id,
            )
            .order_by(desc(Attempt.attempt_number))
        )
    )
    attempt = Attempt(
        child_id=learning_session.learner_id,
        activity_id=payload.activity_id,
        session_id=learning_session.id,
        lesson_id=learning_session.lesson_id,
        skill_id=activity["primarySkillId"],
        is_correct=is_correct,
        answer={"selectedOptionId": payload.selected_option_id},
        active_duration_seconds=payload.active_duration_seconds,
        selected_option_id=payload.selected_option_id,
        correct_option_id=expected["id"],
        explanation=activity["explanation"],
        idempotency_key=idempotency_key,
        attempt_number=(attempt_number.attempt_number + 1) if attempt_number else 1,
    )
    db.add(attempt)
    db.flush()
    session_attempts = list(
        db.scalars(select(Attempt).where(Attempt.session_id == session_id))
    )
    correct_count = sum(item.is_correct for item in session_attempts)
    learning_session.score = round(
        100 * correct_count / learning_session.total_activities, 2
    )
    learning_session.accuracy = correct_count / len(session_attempts)
    learning_session.total_active_duration_seconds = sum(
        item.active_duration_seconds for item in session_attempts
    )
    learner = db.get(Learner, learning_session.learner_id)
    if learner is not None:
        learner.total_active_practice_seconds = (
            learner.total_active_practice_seconds
            or 0
        ) + payload.active_duration_seconds
    skill_attempts = list(
        db.scalars(
            select(Attempt)
            .where(
                Attempt.child_id == learning_session.learner_id,
                Attempt.skill_id == activity["primarySkillId"],
            )
            .order_by(desc(Attempt.attempted_at))
            .limit(10)
        )
    )
    calculated = calculate_mastery(skill_attempts)
    mastery = db.get(SkillMastery, (learning_session.learner_id, activity["primarySkillId"]))
    if mastery is None:
        mastery = SkillMastery(
            child_id=learning_session.learner_id,
            skill_id=activity["primarySkillId"],
            score=calculated["score"] or 0.0,
            accuracy=calculated["accuracy"],
            window_attempt_count=calculated["windowCount"],
            total_attempt_count=1,
        )
        db.add(mastery)
    else:
        mastery.score = calculated["score"] or 0.0
        mastery.accuracy = calculated["accuracy"]
        mastery.window_attempt_count = calculated["windowCount"]
        mastery.total_attempt_count += 1
    db.commit()
    db.refresh(attempt)
    db.refresh(learning_session)
    return {
        "session": session_payload(db, learning_session),
        "gradedAnswer": attempt_payload(attempt),
    }


@router.post("/sessions/{session_id}/advance")
def advance_session(
    session_id: str,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    item = _session_for_user(db, user, session_id)
    if item.current_activity_index + 1 < item.total_activities:
        item.current_activity_index += 1
    db.commit()
    db.refresh(item)
    return session_payload(db, item)


@router.post("/sessions/{session_id}/complete")
def complete_session(
    session_id: str,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    item = _session_for_user(db, user, session_id)
    if not item.is_completed:
        lesson = find_lesson(item.lesson_id)
        item.is_completed = True
        item.completed_at = datetime.now(UTC)
        item.earned_badge = lesson["badgeReward"] if lesson else None
        if lesson:
            activity_ids = {activity["id"] for activity in session_activities(item, lesson)}
            attempted_ids = set(
                db.scalars(
                    select(Attempt.activity_id).where(Attempt.session_id == item.id)
                )
            )
            if activity_ids and activity_ids.issubset(attempted_ids):
                db.execute(
                    update(AssignmentTarget)
                    .where(
                        AssignmentTarget.learner_id == item.learner_id,
                        AssignmentTarget.completed_at.is_(None),
                        AssignmentTarget.assignment_id.in_(
                            select(Assignment.id).where(
                                Assignment.lesson_id == item.lesson_id,
                                Assignment.created_at <= item.completed_at,
                            )
                        ),
                    )
                    .values(completed_at=item.completed_at)
                )
        learner = db.get(Learner, item.learner_id)
        if learner is not None:
            learner.stars_earned += 1
            badges = set(learner.badges or [])
            if item.earned_badge:
                badges.add(item.earned_badge)
            learner.badges = sorted(badges)
    db.commit()
    db.refresh(item)
    return session_payload(db, item)


@router.get("/learners/{learner_id}/mastery")
def mastery(
    learner_id: str,
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> list[dict]:
    user, _ = session_data
    learner = require_learner_access(db, user, learner_id)
    return mastery_payloads(db, learner)


@router.get("/learners/{learner_id}/progress")
def progress(
    learner_id: str,
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    require_learner_access(db, user, learner_id)
    return progress_summary(db, learner_id)


@router.get("/learners/{learner_id}/attempts")
def recent_attempts(
    learner_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    dateFilter: str = Query(default="all"),
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> list[dict]:
    user, _ = session_data
    require_learner_access(db, user, learner_id)
    statement = select(Attempt).where(Attempt.child_id == learner_id)
    days = {"7d": 7, "30d": 30}.get(dateFilter)
    if days:
        statement = statement.where(Attempt.attempted_at >= datetime.now(UTC) - timedelta(days=days))
    attempts = list(
        db.scalars(statement.order_by(desc(Attempt.attempted_at)).limit(limit))
    )
    result = []
    for attempt in attempts:
        learning_session = (
            db.get(LearningSession, attempt.session_id) if attempt.session_id else None
        )
        lesson = find_lesson(attempt.lesson_id) if attempt.lesson_id else None
        skill = find_skill(attempt.skill_id)
        if skill is None:
            continue
        if learning_session is None:
            continue
        result.append(
            {
                "attempt": attempt_payload(attempt),
                "session": session_payload(db, learning_session),
                "skillName": skill["name"],
                "categoryName": next(
                    (
                        category["name"]
                        for category in curriculum()["categories"]
                        if category["id"] == skill["categoryId"]
                    ),
                    skill["categoryId"],
                ),
                "lessonTitle": lesson["title"] if lesson else attempt.lesson_id,
            }
        )
    return result


@router.get("/learners/{learner_id}/weekly")
def weekly(
    learner_id: str,
    days: int = Query(default=7, ge=1, le=90),
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> list[dict]:
    user, _ = session_data
    require_learner_access(db, user, learner_id)
    attempts = list(
        db.scalars(
            select(Attempt).where(
                Attempt.child_id == learner_id,
                Attempt.attempted_at >= datetime.now(UTC) - timedelta(days=days),
            )
        )
    )
    by_day: dict[str, list[Attempt]] = {}
    for attempt in attempts:
        key = attempt.attempted_at.date().isoformat()
        by_day.setdefault(key, []).append(attempt)
    return [
        {
            "date": day,
            "dayLabel": datetime.fromisoformat(day).strftime("%a"),
            "activeMinutes": sum(item.active_duration_seconds for item in rows) / 60,
            "questionsAnswered": len(rows),
            "accuracy": sum(item.is_correct for item in rows) / len(rows),
        }
        for day, rows in sorted(by_day.items())
    ]


@router.get("/learners/{learner_id}/adaptive-recommendation")
def adaptive_recommendation(
    learner_id: str,
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> dict | None:
    user, _ = session_data
    learner = require_learner_access(db, user, learner_id)
    mastery = mastery_payloads(db, learner)
    target = min(
        mastery,
        key=lambda item: (
            item["score"] is None,
            item["score"] if item["score"] is not None else 101,
        ),
    )
    lesson = next(
        (
            item
            for item in curriculum()["lessons"]
            if any(activity["primarySkillId"] == target["skillId"] for activity in item["activities"])
            and item["readingLevelId"] == learner.reading_level_id
        ),
        None,
    )
    if lesson is None:
        lesson = next(
            (
                item
                for item in curriculum()["lessons"]
                if item["readingLevelId"] == learner.reading_level_id
            ),
            curriculum()["lessons"][0],
        )
    category = next(
        item for item in curriculum()["categories"] if item["id"] == lesson["categoryId"]
    )
    return {
        "id": f"adaptive-{learner.id}-{target['skillId']}",
        "lessonId": lesson["id"],
        "lessonTitle": lesson["title"],
        "skillId": target["skillId"],
        "skillName": target["skillName"],
        "categoryId": lesson["categoryId"],
        "categoryName": category["name"],
        "readingLevelId": lesson["readingLevelId"],
        "masteryScore": target["score"],
        "band": target["band"],
        "evidenceStatus": target["evidenceStatus"],
        "childFriendlyReason": "Practice this skill to make your reading stronger.",
        "adultFacingExplanation": (
            f"{target['skillName']} currently has a score of "
            f"{round(target['score'], 1) if target['score'] is not None else 'no evidence'}."
        ),
        "priorityTier": 2 if target["evidenceStatus"] == "confirmed" else 1,
        "priorityLabel": "high" if target["evidenceStatus"] != "confirmed" else "recommended",
        "isAssignment": False,
        "isResume": False,
        "configVersion": "1.0.0",
        "calculatedAt": datetime.now(UTC).isoformat(),
    }


@router.get("/learners/{learner_id}/recommendations")
def recommendations(
    learner_id: str,
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> list[dict]:
    item = adaptive_recommendation(learner_id, session_data, db)
    if item is None:
        return []
    return [
        {
            **item,
            "reason": item["childFriendlyReason"],
            "priority": "high" if item["priorityTier"] <= 2 else "medium",
        }
    ]
