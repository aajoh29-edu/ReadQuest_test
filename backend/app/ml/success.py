"""Learner-success predictor: regularised logistic regression trained on attempts.

The prior weights encode sensible reading-practice behaviour. Training pulls the
weights toward the data (MAP estimate), so a database with few attempts stays
near the prior while a busy one is dominated by observed learner behaviour.
"""

import math
import random
from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from itertools import groupby

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.progress import Attempt

FEATURES = ("bias", "priorAccuracy", "priorExperience", "activityLevel", "textDifficulty")
PRIOR_WEIGHTS = [0.6, 2.4, 0.15, -1.2, -1.0]
MIN_TRAINING_ATTEMPTS = 30


@dataclass(frozen=True)
class Sample:
    features: list[float]
    label: int
    child_id: str | None = None


def feature_vector(
    prior_accuracy: float, prior_count: int, activity_level: float, text_difficulty: float
) -> list[float]:
    return [1.0, prior_accuracy, math.log1p(prior_count), activity_level, text_difficulty]


def _sigmoid(value: float) -> float:
    return 1 / (1 + math.exp(-max(-30.0, min(30.0, value))))


class SuccessModel:
    def __init__(self, weights: Sequence[float] | None = None, trained_on: int = 0) -> None:
        self.weights = list(weights or PRIOR_WEIGHTS)
        self.trained_on = trained_on

    def predict(self, features: Sequence[float]) -> float:
        return _sigmoid(sum(w * x for w, x in zip(self.weights, features, strict=True)))

    def fit(
        self,
        samples: Sequence[Sample],
        *,
        epochs: int = 300,
        learning_rate: float = 0.1,
        regularisation: float = 1.0,
    ) -> "SuccessModel":
        if len(samples) < MIN_TRAINING_ATTEMPTS:
            return self
        weights = list(PRIOR_WEIGHTS)
        count = len(samples)
        for _ in range(epochs):
            gradient = [0.0] * len(weights)
            for sample in samples:
                error = _sigmoid(sum(w * x for w, x in zip(weights, sample.features, strict=True))) - sample.label
                for index, value in enumerate(sample.features):
                    gradient[index] += error * value
            for index, prior in enumerate(PRIOR_WEIGHTS):
                gradient[index] = gradient[index] / count + regularisation * (weights[index] - prior) / count
                weights[index] -= learning_rate * gradient[index]
        self.weights = weights
        self.trained_on = count
        return self

    def log_loss(self, samples: Sequence[Sample]) -> float:
        if not samples:
            return 0.0
        total = 0.0
        for sample in samples:
            p = min(max(self.predict(sample.features), 1e-9), 1 - 1e-9)
            total -= math.log(p) if sample.label else math.log(1 - p)
        return total / len(samples)


def build_samples(
    db: Session, difficulty_by_activity: dict[str, float], level_by_activity: dict[str, float]
) -> list[Sample]:
    """Create one sample per attempt using only information available before it."""
    history: dict[tuple[str, str], list[bool]] = defaultdict(list)
    samples: list[Sample] = []
    attempts = db.scalars(select(Attempt).order_by(Attempt.attempted_at, Attempt.id))
    for attempt in attempts:
        key = (attempt.child_id, attempt.skill_id)
        recent = history[key][-10:]
        prior_accuracy = sum(recent) / len(recent) if recent else 0.5
        samples.append(
            Sample(
                feature_vector(
                    prior_accuracy,
                    len(history[key]),
                    level_by_activity.get(attempt.activity_id, 0.5),
                    difficulty_by_activity.get(attempt.activity_id, 0.5),
                ),
                int(attempt.is_correct),
                str(attempt.child_id),
            )
        )
        history[key].append(attempt.is_correct)
    return samples


def split_by_learner(
    samples: Sequence[Sample], fraction: float = 0.2, seed: int = 42
) -> tuple[list[Sample], list[Sample]]:
    learners = sorted({sample.child_id for sample in samples if sample.child_id is not None})
    if len(learners) < 2:
        return list(samples), []
    random.Random(seed).shuffle(learners)
    count = min(len(learners) - 1, max(1, int(len(learners) * fraction)))
    held_out = set(learners[:count])
    return (
        [sample for sample in samples if sample.child_id not in held_out],
        [sample for sample in samples if sample.child_id in held_out],
    )


def auc(model: SuccessModel, samples: Sequence[Sample]) -> float | None:
    positives = sum(sample.label for sample in samples)
    negatives = len(samples) - positives
    if not positives or not negatives:
        return None

    scores = sorted((model.predict(sample.features), sample.label) for sample in samples)
    lower_negatives = 0
    wins = 0.0
    for _, tied in groupby(scores, key=lambda pair: pair[0]):
        labels = [label for _, label in tied]
        tied_positives = sum(labels)
        tied_negatives = len(labels) - tied_positives
        wins += tied_positives * (lower_negatives + 0.5 * tied_negatives)
        lower_negatives += tied_negatives
    return wins / (positives * negatives)
