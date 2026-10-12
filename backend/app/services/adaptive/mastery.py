"""Pure, explainable mastery calculation.

This module deliberately contains no SQLAlchemy or FastAPI imports. That makes
the algorithm quick to test and prevents HTTP/database concerns from changing
the mathematical behavior.
"""

from dataclasses import dataclass
from datetime import datetime
from statistics import fmean, pstdev

from app.models.enums import MasteryBand, MasteryConfidence

MASTERY_ALGORITHM_VERSION = "mastery-v1"
DEFAULT_WINDOW_SIZE = 10
RECENT_WINDOW_SIZE = 3


@dataclass(frozen=True, slots=True)
class AttemptResult:
    is_correct: bool
    occurred_at: datetime


@dataclass(frozen=True, slots=True)
class MasteryResult:
    score: float
    accuracy: float
    recent_performance: float
    consistency: float
    band: MasteryBand
    confidence: MasteryConfidence
    attempt_count: int
    last_practiced_at: datetime | None
    algorithm_version: str = MASTERY_ALGORITHM_VERSION


def _clip(value: float) -> float:
    return max(0.0, min(1.0, value))


def _band_for(score: float) -> MasteryBand:
    if score < 0.60:
        return MasteryBand.HIGH_PRIORITY
    if score < 0.75:
        return MasteryBand.ADDITIONAL_PRACTICE
    if score < 0.90:
        return MasteryBand.NORMAL_REVIEW
    return MasteryBand.MASTERED


def _confidence_for(attempt_count: int) -> MasteryConfidence:
    if attempt_count < 3:
        return MasteryConfidence.LOW
    if attempt_count < 7:
        return MasteryConfidence.MEDIUM
    return MasteryConfidence.HIGH


def calculate_mastery(
    attempts: list[AttemptResult],
    *,
    window_size: int = DEFAULT_WINDOW_SIZE,
) -> MasteryResult:
    """Calculate mastery from the learner's most recent attempts.

    Formula:
        0.60 * accuracy + 0.20 * recent performance + 0.20 * consistency

    A learner with no evidence is unassessed. We represent that with score 0.0
    plus low confidence; the API should also expose attempt_count so the UI does
    not describe this as demonstrated failure.
    """
    if window_size < 1:
        raise ValueError("window_size must be at least 1")

    if any(item.occurred_at.tzinfo is None for item in attempts):
        raise ValueError("occurred_at must be timezone-aware")
    ordered = sorted(attempts, key=lambda item: item.occurred_at)
    window = ordered[-window_size:]
    attempt_count = len(window)

    if not window:
        return MasteryResult(
            score=0.0,
            accuracy=0.0,
            recent_performance=0.0,
            consistency=0.0,
            band=MasteryBand.HIGH_PRIORITY,
            confidence=MasteryConfidence.LOW,
            attempt_count=0,
            last_practiced_at=None,
        )

    values = [1.0 if item.is_correct else 0.0 for item in window]
    accuracy = fmean(values)
    recent_performance = fmean(values[-RECENT_WINDOW_SIZE:])

    # Multiplying by accuracy prevents "consistently wrong" from earning a
    # high consistency contribution merely because variance is zero.
    consistency = accuracy * _clip(1.0 - (2.0 * pstdev(values)))
    score = _clip((0.60 * accuracy) + (0.20 * recent_performance) + (0.20 * consistency))

    return MasteryResult(
        score=round(score, 4),
        accuracy=round(accuracy, 4),
        recent_performance=round(recent_performance, 4),
        consistency=round(consistency, 4),
        band=_band_for(score),
        confidence=_confidence_for(attempt_count),
        attempt_count=attempt_count,
        last_practiced_at=window[-1].occurred_at,
    )
