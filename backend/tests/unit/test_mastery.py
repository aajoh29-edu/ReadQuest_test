from datetime import UTC, datetime, timedelta
from unittest import TestCase

from app.models.enums import MasteryBand, MasteryConfidence
from app.services.adaptive.mastery import AttemptResult, calculate_mastery

NOW = datetime(2026, 9, 13, 12, 0, tzinfo=UTC)


def history(values: list[bool]) -> list[AttemptResult]:
    return [
        AttemptResult(is_correct=value, occurred_at=NOW + timedelta(minutes=index))
        for index, value in enumerate(values)
    ]


class MasteryCalculationTests(TestCase):
    def test_no_attempts_is_low_confidence(self) -> None:
        result = calculate_mastery([])
        self.assertEqual(result.score, 0.0)
        self.assertEqual(result.attempt_count, 0)
        self.assertEqual(result.confidence, MasteryConfidence.LOW)

    def test_all_correct_is_mastered(self) -> None:
        result = calculate_mastery(history([True] * 10))
        self.assertEqual(result.score, 1.0)
        self.assertEqual(result.band, MasteryBand.MASTERED)
        self.assertEqual(result.confidence, MasteryConfidence.HIGH)

    def test_all_incorrect_is_not_rewarded_for_consistency(self) -> None:
        result = calculate_mastery(history([False] * 10))
        self.assertEqual(result.score, 0.0)
        self.assertEqual(result.consistency, 0.0)

    def test_recent_improvement_raises_recent_component(self) -> None:
        result = calculate_mastery(history([False] * 7 + [True] * 3))
        self.assertEqual(result.recent_performance, 1.0)
        self.assertGreater(result.recent_performance, result.accuracy)

    def test_uses_only_most_recent_window(self) -> None:
        result = calculate_mastery(history([False] * 5 + [True] * 10))
        self.assertEqual(result.attempt_count, 10)
        self.assertEqual(result.score, 1.0)

    def test_invalid_window_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            calculate_mastery(history([True]), window_size=0)


def test_all_binary_windows_are_bounded_and_deterministic():
    from itertools import product
    for values in product([False, True], repeat=10):
        attempts = history(list(values))
        result = calculate_mastery(attempts)
        assert 0 <= result.score <= 1
        assert result == calculate_mastery(attempts[::-1])


def test_exact_band_boundaries():
    from app.services.adaptive.mastery import _band_for
    for score, band in [(0.5999, MasteryBand.HIGH_PRIORITY), (0.60, MasteryBand.ADDITIONAL_PRACTICE),
                        (0.7499, MasteryBand.ADDITIONAL_PRACTICE), (0.75, MasteryBand.NORMAL_REVIEW),
                        (0.8999, MasteryBand.NORMAL_REVIEW), (0.90, MasteryBand.MASTERED)]:
        assert _band_for(score) == band


def test_confidence_boundaries():
    for count, expected in [(0, "low"), (2, "low"), (3, "medium"), (6, "medium"), (7, "high"), (10, "high")]:
        assert calculate_mastery(history([True]*count)).confidence == expected
