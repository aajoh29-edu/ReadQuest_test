"""Pure learning-plan generation from mastery and activity candidates."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.models.enums import MasteryBand
from app.services.adaptive.recommendation import ActivityCandidate, rank_activities

LEARNING_PLAN_ALGORITHM_VERSION = "learning-plan-v1"
MAX_PLAN_ITEMS = 5
TARGET_SCORES = {
    MasteryBand.HIGH_PRIORITY: 0.60,
    MasteryBand.ADDITIONAL_PRACTICE: 0.75,
    MasteryBand.NORMAL_REVIEW: 0.90,
    MasteryBand.MASTERED: 0.90,
}
BAND_PRIORITY = {
    MasteryBand.HIGH_PRIORITY: 0,
    MasteryBand.ADDITIONAL_PRACTICE: 1,
    MasteryBand.NORMAL_REVIEW: 2,
    MasteryBand.MASTERED: 3,
}


@dataclass(frozen=True, slots=True)
class SkillPlanInput:
    skill_id: UUID
    skill_code: str
    band: MasteryBand
    score: float
    last_practiced_at: datetime | None
    activities: tuple[ActivityCandidate, ...]


@dataclass(frozen=True, slots=True)
class FocusSummary:
    skill_code: str
    band: MasteryBand
    score: float


@dataclass(frozen=True, slots=True)
class PlanItem:
    skill_id: UUID
    skill_code: str
    activity_id: UUID
    band: MasteryBand
    score: float
    target_score: float
    sequence: int


@dataclass(frozen=True, slots=True)
class GeneratedLearningPlan:
    items: tuple[PlanItem, ...]
    focus_summary: tuple[FocusSummary, ...]
    algorithm_version: str = LEARNING_PLAN_ALGORITHM_VERSION


def generate_learning_plan(
    skills: list[SkillPlanInput],
    *,
    now: datetime | None = None,
) -> GeneratedLearningPlan:
    """Choose no more than five prioritized skill/activity pairs."""
    calculation_time = now or datetime.now(UTC)
    if calculation_time.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    stale_before = calculation_time - timedelta(days=7)

    eligible: list[SkillPlanInput] = []
    for skill in skills:
        if skill.last_practiced_at is not None and skill.last_practiced_at.tzinfo is None:
            raise ValueError("last_practiced_at must be timezone-aware")
        if not 0.0 <= skill.score <= 1.0:
            raise ValueError("score must be between 0 and 1")
        if skill.band == MasteryBand.MASTERED and (
            skill.last_practiced_at is None or skill.last_practiced_at >= stale_before
        ):
            continue
        ranked = rank_activities(
            [candidate for candidate in skill.activities if candidate.skill_id == skill.skill_id],
            now=calculation_time,
        )
        if ranked:
            eligible.append(skill)

    ordered = sorted(
        eligible,
        key=lambda skill: (
            BAND_PRIORITY[skill.band],
            skill.score,
            skill.skill_code,
            str(skill.skill_id),
        ),
    )[:MAX_PLAN_ITEMS]

    items = []
    for sequence, skill in enumerate(ordered, start=1):
        ranked = rank_activities(list(skill.activities), now=calculation_time)
        ranked_for_skill = next(
            candidate for candidate in ranked if candidate.skill_id == skill.skill_id
        )
        items.append(
            PlanItem(
                skill_id=skill.skill_id,
                skill_code=skill.skill_code,
                activity_id=ranked_for_skill.activity_id,
                band=skill.band,
                score=skill.score,
                target_score=TARGET_SCORES[skill.band],
                sequence=sequence,
            )
        )

    return GeneratedLearningPlan(
        items=tuple(items),
        focus_summary=tuple(
            FocusSummary(
                skill_code=item.skill_code,
                band=item.band,
                score=item.score,
            )
            for item in items
        ),
    )
