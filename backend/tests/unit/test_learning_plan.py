from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest

from app.models.enums import MasteryBand
from app.services.adaptive.learning_plan import SkillPlanInput, generate_learning_plan
from app.services.adaptive.recommendation import ActivityCandidate

NOW = datetime(2026, 9, 1, 12, tzinfo=UTC)


def skill(number: int, band: MasteryBand, *, practiced_days: int = 1) -> SkillPlanInput:
    skill_id = UUID(f"00000000-0000-0000-0000-{number:012d}")
    return SkillPlanInput(
        skill_id=skill_id,
        skill_code=f"SKILL_{number}",
        band=band,
        score={
            MasteryBand.HIGH_PRIORITY: 0.2,
            MasteryBand.ADDITIONAL_PRACTICE: 0.68,
            MasteryBand.NORMAL_REVIEW: 0.8,
            MasteryBand.MASTERED: 0.95,
        }[band],
        last_practiced_at=NOW - timedelta(days=practiced_days),
        activities=(
            ActivityCandidate(
                activity_id=UUID(f"10000000-0000-0000-0000-{number:012d}"),
                skill_id=skill_id,
                difficulty=2,
                learner_level=2,
                mastery_score=0.5,
                last_practiced_at=NOW - timedelta(days=practiced_days),
            ),
        ),
    )


def test_generator_orders_by_band_and_caps_at_five() -> None:
    candidates = [
        skill(1, MasteryBand.NORMAL_REVIEW),
        skill(2, MasteryBand.HIGH_PRIORITY),
        skill(3, MasteryBand.ADDITIONAL_PRACTICE),
        skill(4, MasteryBand.HIGH_PRIORITY),
        skill(5, MasteryBand.ADDITIONAL_PRACTICE),
        skill(6, MasteryBand.NORMAL_REVIEW),
    ]

    plan = generate_learning_plan(candidates, now=NOW)

    assert [item.band for item in plan.items] == [
        MasteryBand.HIGH_PRIORITY,
        MasteryBand.HIGH_PRIORITY,
        MasteryBand.ADDITIONAL_PRACTICE,
        MasteryBand.ADDITIONAL_PRACTICE,
        MasteryBand.NORMAL_REVIEW,
    ]
    assert len(plan.items) == 5
    assert plan.items[0].skill_id == candidates[1].skill_id
    assert [item.sequence for item in plan.items] == [1, 2, 3, 4, 5]


def test_mastered_skill_is_only_reviewed_after_seven_days() -> None:
    fresh = skill(1, MasteryBand.MASTERED, practiced_days=7)
    stale = skill(2, MasteryBand.MASTERED, practiced_days=8)

    plan = generate_learning_plan([fresh, stale], now=NOW)

    assert [item.skill_id for item in plan.items] == [stale.skill_id]


@pytest.mark.parametrize(
    ("band", "target"),
    [
        (MasteryBand.HIGH_PRIORITY, 0.60),
        (MasteryBand.ADDITIONAL_PRACTICE, 0.75),
        (MasteryBand.NORMAL_REVIEW, 0.90),
        (MasteryBand.MASTERED, 0.90),
    ],
)
def test_target_score_matches_next_band_boundary(
    band: MasteryBand, target: float
) -> None:
    candidate = skill(1, band, practiced_days=8)

    assert generate_learning_plan([candidate], now=NOW).items[0].target_score == target
