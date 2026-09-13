from datetime import UTC, datetime, timedelta
from unittest import TestCase
from uuid import UUID

from app.services.adaptive.recommendation import ActivityCandidate, rank_activities

NOW = datetime(2026, 9, 13, 12, 0, tzinfo=UTC)
SKILL = UUID("10000000-0000-0000-0000-000000000001")


def candidate(number: int, **changes: object) -> ActivityCandidate:
    values: dict[str, object] = {
        "activity_id": UUID(f"20000000-0000-0000-0000-{number:012d}"),
        "skill_id": SKILL,
        "difficulty": 3,
        "learner_level": 3,
        "mastery_score": 0.5,
        "last_practiced_at": NOW - timedelta(days=2),
    }
    values.update(changes)
    return ActivityCandidate(**values)  # type: ignore[arg-type]


class RecommendationTests(TestCase):
    def test_weaker_skill_is_ranked_first(self) -> None:
        ranked = rank_activities(
            [candidate(1, mastery_score=0.8), candidate(2, mastery_score=0.2)], now=NOW
        )
        self.assertEqual(ranked[0].activity_id, candidate(2).activity_id)

    def test_unseen_activity_is_due(self) -> None:
        ranked = rank_activities([candidate(1, last_practiced_at=None)], now=NOW)
        self.assertEqual(ranked[0].components["review_due"], 1.0)

    def test_recently_seen_and_unpublished_are_filtered(self) -> None:
        ranked = rank_activities(
            [candidate(1, recently_seen=True), candidate(2, published=False)], now=NOW
        )
        self.assertEqual(ranked, [])

    def test_tie_break_is_deterministic(self) -> None:
        ranked = rank_activities([candidate(2), candidate(1)], now=NOW)
        self.assertEqual(
            [item.activity_id for item in ranked],
            [candidate(1).activity_id, candidate(2).activity_id],
        )

    def test_naive_datetime_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            rank_activities([candidate(1)], now=datetime(2026, 9, 13))
