"""Transactional vertical slice: attempt → mastery → recommendation."""

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.learning import Attempt, Recommendation, SkillMastery
from app.repositories.adaptive import AdaptiveRepository
from app.services.adaptive.mastery import calculate_mastery
from app.services.adaptive.recommendation import rank_activities


@dataclass(frozen=True, slots=True)
class SubmitAttemptCommand:
    child_id: UUID
    activity_id: UUID
    is_correct: bool
    response_ms: int | None
    answer: dict[str, object] | None
    occurred_at: datetime
    learner_level: int


@dataclass(frozen=True, slots=True)
class AdaptiveOutcome:
    attempt: Attempt
    mastery_records: tuple[SkillMastery, ...]
    recommendation: Recommendation | None


def submit_attempt(session: Session, command: SubmitAttemptCommand) -> AdaptiveOutcome:
    """Execute one all-or-nothing adaptive learning transaction.

    Member 1 should call this service from the authenticated attempt endpoint.
    The route must derive child_id from authorization context rather than trust
    an arbitrary child ID supplied by the browser.
    """
    if command.occurred_at.tzinfo is None:
        raise ValueError("occurred_at must be timezone-aware")
    if command.response_ms is not None and not 0 <= command.response_ms <= 3_600_000:
        raise ValueError("response_ms must be between 0 and 3600000")

    repository = AdaptiveRepository(session)
    attempt = Attempt(
        id=uuid4(),
        child_id=command.child_id,
        activity_id=command.activity_id,
        is_correct=command.is_correct,
        response_ms=command.response_ms,
        answer=command.answer,
        occurred_at=command.occurred_at,
    )
    repository.add_attempt(attempt)

    skill_ids = repository.activity_skill_ids(command.activity_id)
    if not skill_ids:
        raise ValueError("activity must map to at least one skill")

    mastery_records: list[SkillMastery] = []
    for skill_id in skill_ids:
        repository.lock_adaptive_key(command.child_id, skill_id)
        evidence = repository.recent_attempts_for_skill(command.child_id, skill_id)
        mastery_records.append(
            repository.save_mastery(command.child_id, skill_id, calculate_mastery(evidence))
        )

    now = datetime.now(UTC)
    candidates = repository.recommendation_candidates(
        command.child_id, learner_level=command.learner_level, now=now
    )
    ranked = rank_activities(candidates, now=now)
    recommendation = (
        repository.save_recommendation(command.child_id, attempt.id, ranked[0]) if ranked else None
    )

    # The caller owns commit/rollback. FastAPI should use `with session.begin()`
    # so any exception rolls back the attempt, mastery, and recommendation.
    return AdaptiveOutcome(
        attempt=attempt,
        mastery_records=tuple(mastery_records),
        recommendation=recommendation,
    )
