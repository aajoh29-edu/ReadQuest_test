"""Text difficulty estimation backed by the trained language model."""

import math
import statistics
from collections.abc import Sequence

from app.ml.corpus import Document
from app.ml.lm import NgramLanguageModel

FEATURES = ("surprisal", "wordLength", "sentenceLength", "unseenWordRate")
WEIGHTS = (0.40, 0.25, 0.20, 0.15)


def raw_features(
    lm: NgramLanguageModel, sentences: Sequence[list[str]]
) -> tuple[float, float, float, float]:
    tokens = [word for sentence in sentences for word in sentence]
    if not tokens:
        return 0.0, 0.0, 0.0, 0.0
    surprisal = [value for sentence in sentences for value in lm.surprisals(sentence)]
    vocabulary = lm.vocabulary
    return (
        sum(surprisal) / len(surprisal),
        sum(len(word) for word in tokens) / len(tokens),
        len(tokens) / len(sentences),
        sum(vocabulary.get(word, 0) == 0 for word in tokens) / len(tokens),
    )


class DifficultyEstimator:
    """Maps a text to a 0..1 reading-difficulty index (higher is harder)."""

    def __init__(self, lm: NgramLanguageModel, scaler: dict[str, list[float]]) -> None:
        self.lm = lm
        self.scaler = scaler

    @classmethod
    def fit(
        cls, lm: NgramLanguageModel, documents: Sequence[Document]
    ) -> tuple["DifficultyEstimator", dict[str, tuple[float, ...]]]:
        """Fit scaling statistics using leave-one-document-out features."""
        rows: dict[str, tuple[float, ...]] = {}
        for document in documents:
            lm.remove(document.sentences)
            rows[document.id] = raw_features(lm, document.sentences)
            lm.add(document.sentences)
        means, deviations = [], []
        for column in range(len(FEATURES)):
            values = [row[column] for row in rows.values()] or [0.0]
            means.append(statistics.fmean(values))
            deviations.append(statistics.pstdev(values) or 1.0)
        return cls(lm, {"mean": means, "std": deviations}), rows

    def index(self, features: Sequence[float]) -> float:
        z = sum(
            weight * (value - mean) / std
            for weight, value, mean, std in zip(
                WEIGHTS, features, self.scaler["mean"], self.scaler["std"], strict=True
            )
        )
        return 1 / (1 + math.exp(-1.5 * z))

    def difficulty(self, sentences: Sequence[list[str]]) -> float:
        return self.index(raw_features(self.lm, sentences))
