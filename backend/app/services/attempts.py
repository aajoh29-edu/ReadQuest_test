from datetime import UTC, datetime
from itertools import pairwise

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.curriculum import Activity
from app.models.progress import Attempt, SkillMastery


def mastery_score(attempts: list[Attempt], now: datetime | None = None) -> tuple[float, float]:
    if not attempts:
        return 0.0, 0.0
    chronological = list(reversed(attempts))
    accuracy = sum(attempt.is_correct for attempt in chronological) / len(chronological)
    clock = now or datetime.now(UTC)
    recency_total = 0.0
    for attempt in chronological:
        attempted_at = attempt.attempted_at
        if attempted_at.tzinfo is None:
            attempted_at = attempted_at.replace(tzinfo=UTC)
        days_since = max(0.0, (clock - attempted_at).total_seconds() / 86400)
        recency_total += attempt.is_correct * (2 ** (-days_since / 14))
    recency = recency_total / len(chronological)
    if len(chronological) == 1:
        consistency = 1.0 if chronological[0].is_correct else 0.0
    else:
        consistency = sum(
            left.is_correct and right.is_correct
            for left, right in pairwise(chronological)
        ) / (len(chronological) - 1)
    score = 100 * (0.60 * accuracy + 0.20 * recency + 0.20 * consistency)
    return max(0.0, min(100.0, score)), accuracy


def submit_attempt(
    db: Session,
    *,
    child_id: str,
    activity_id: str,
    is_correct: bool,
    answer: dict,
    active_duration_seconds: float,
) -> Attempt:
    activity = db.get(Activity, activity_id)
    if activity is None:
        raise ValueError("Activity not found.")

    attempt = Attempt(
        child_id=child_id,
        activity_id=activity.id,
        skill_id=activity.primary_skill_id,
        is_correct=is_correct,
        answer=answer,
        active_duration_seconds=active_duration_seconds,
    )
    db.add(attempt)
    db.flush()

    recent = db.scalars(
        select(Attempt)
        .where(
            Attempt.child_id == child_id,
            Attempt.skill_id == activity.primary_skill_id,
        )
        .order_by(desc(Attempt.attempted_at))
        .limit(10)
    ).all()
    score, accuracy = mastery_score(recent)
    mastery = db.get(SkillMastery, (child_id, activity.primary_skill_id))
    if mastery is None:
        mastery = SkillMastery(
            child_id=child_id,
            skill_id=activity.primary_skill_id,
            score=score,
            accuracy=accuracy,
            window_attempt_count=len(recent),
            total_attempt_count=1,
        )
        db.add(mastery)
    else:
        mastery.score = score
        mastery.accuracy = accuracy
        mastery.window_attempt_count = len(recent)
        mastery.total_attempt_count += 1
    return attempt
