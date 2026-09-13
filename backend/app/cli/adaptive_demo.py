"""Run the adaptive algorithms without a database or web server."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.services.adaptive.mastery import AttemptResult, calculate_mastery
from app.services.adaptive.recommendation import ActivityCandidate, rank_activities


def main() -> None:
    now = datetime.now(UTC)
    attempts = [
        AttemptResult(is_correct=value, occurred_at=now - timedelta(days=7 - index))
        for index, value in enumerate([False, False, True, False, True, True, True])
    ]
    mastery = calculate_mastery(attempts)

    candidates = [
        ActivityCandidate(
            activity_id=UUID("00000000-0000-0000-0000-000000000311"),
            skill_id=UUID("00000000-0000-0000-0000-000000000102"),
            difficulty=2,
            learner_level=2,
            mastery_score=mastery.score,
            last_practiced_at=mastery.last_practiced_at,
        ),
        ActivityCandidate(
            activity_id=UUID("00000000-0000-0000-0000-000000000321"),
            skill_id=UUID("00000000-0000-0000-0000-000000000103"),
            difficulty=3,
            learner_level=2,
            mastery_score=0.85,
            last_practiced_at=now - timedelta(days=14),
        ),
    ]
    ranked = rank_activities(candidates, now=now)

    print("Mastery result")
    print(
        f"  score={mastery.score:.2f} band={mastery.band.value} confidence={mastery.confidence.value}"
    )
    print("Recommendations")
    for position, item in enumerate(ranked, start=1):
        print(
            f"  {position}. activity={item.activity_id} priority={item.priority_score:.4f} reason={item.reason_code}"
        )


if __name__ == "__main__":
    main()
