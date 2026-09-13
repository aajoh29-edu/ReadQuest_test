"""Pure recommendation ranking for published, accessible activities."""

from dataclasses import dataclass
from datetime import UTC, datetime
from math import exp
from uuid import UUID

RECOMMENDATION_ALGORITHM_VERSION = "recommendation-v1"


@dataclass(frozen=True, slots=True)
class ActivityCandidate:
    activity_id: UUID
    skill_id: UUID
    difficulty: int
    learner_level: int
    mastery_score: float | None
    last_practiced_at: datetime | None
    published: bool = True
    accessible: bool = True
    recently_seen: bool = False


@dataclass(frozen=True, slots=True)
class RankedRecommendation:
    activity_id: UUID
    skill_id: UUID
    priority_score: float
    reason_code: str
    components: dict[str, float]
    algorithm_version: str = RECOMMENDATION_ALGORITHM_VERSION


def _clip(value: float) -> float:
    return max(0.0, min(1.0, value))


def _review_due(last_practiced_at: datetime | None, now: datetime) -> float:
    if last_practiced_at is None:
        return 1.0
    if last_practiced_at.tzinfo is None:
        raise ValueError("last_practiced_at must be timezone-aware")
    days = max(0.0, (now - last_practiced_at).total_seconds() / 86_400)
    return _clip(1.0 - exp(-days / 7.0))


def _difficulty_fit(difficulty: int, learner_level: int) -> float:
    distance = abs(difficulty - learner_level)
    return {0: 1.0, 1: 0.75, 2: 0.35}.get(distance, 0.0)


def _reason_code(components: dict[str, float]) -> str:
    strongest = max(components, key=components.get)
    return {
        "mastery_gap": "PRACTICE_WEAK_SKILL",
        "review_due": "SPACED_REVIEW_DUE",
        "difficulty_fit": "MATCHED_DIFFICULTY",
        "variety": "VARIETY_ROTATION",
    }[strongest]


def rank_activities(
    candidates: list[ActivityCandidate],
    *,
    now: datetime | None = None,
) -> list[RankedRecommendation]:
    """Filter and rank candidates; ties are resolved by activity UUID string."""
    calculation_time = now or datetime.now(UTC)
    if calculation_time.tzinfo is None:
        raise ValueError("now must be timezone-aware")

    ranked: list[RankedRecommendation] = []
    for candidate in candidates:
        if not candidate.published or not candidate.accessible or candidate.recently_seen:
            continue
        if not 1 <= candidate.difficulty <= 10 or not 1 <= candidate.learner_level <= 10:
            raise ValueError("difficulty and learner_level must be between 1 and 10")

        mastery = 0.0 if candidate.mastery_score is None else candidate.mastery_score
        if not 0.0 <= mastery <= 1.0:
            raise ValueError("mastery_score must be between 0 and 1")

        raw_components = {
            "mastery_gap": 1.0 - mastery,
            "review_due": _review_due(candidate.last_practiced_at, calculation_time),
            "difficulty_fit": _difficulty_fit(candidate.difficulty, candidate.learner_level),
            "variety": 1.0,
        }
        weighted_components = {
            "mastery_gap": 0.55 * raw_components["mastery_gap"],
            "review_due": 0.25 * raw_components["review_due"],
            "difficulty_fit": 0.15 * raw_components["difficulty_fit"],
            "variety": 0.05 * raw_components["variety"],
        }
        priority = _clip(sum(weighted_components.values()))
        ranked.append(
            RankedRecommendation(
                activity_id=candidate.activity_id,
                skill_id=candidate.skill_id,
                priority_score=round(priority, 4),
                reason_code=_reason_code(weighted_components),
                components={key: round(value, 4) for key, value in raw_components.items()},
            )
        )

    return sorted(ranked, key=lambda item: (-item.priority_score, str(item.activity_id)))
