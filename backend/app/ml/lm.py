"""Interpolated trigram language model with absolute discounting.

Pure Python so the backend image stays small and training is deterministic.
Counts can be removed again, which enables cheap leave-one-document-out
scoring (a document is never scored by a model that has memorised it).
"""

import math
from collections.abc import Iterable

BOS = "<s>"
EOS = "</s>"


class NgramLanguageModel:
    def __init__(self, order: int = 3, discount: float = 0.75) -> None:
        if order < 1:
            raise ValueError("order must be at least 1")
        self.order = order
        self.discount = discount
        # counts[n][context joined by space] -> {word: count}
        self.counts: list[dict[str, dict[str, int]]] = [{} for _ in range(order)]
        self.totals: list[dict[str, int]] = [{} for _ in range(order)]
        self.token_total = 0

    @property
    def vocabulary(self) -> dict[str, int]:
        return self.counts[0].get("", {})

    def _padded(self, sentence: list[str]) -> list[str]:
        return [BOS] * (self.order - 1) + sentence + [EOS]

    def _update(self, sentences: Iterable[list[str]], sign: int) -> None:
        for sentence in sentences:
            if not sentence:
                continue
            padded = self._padded(sentence)
            for index in range(self.order - 1, len(padded)):
                word = padded[index]
                self.token_total += sign
                for n in range(self.order):
                    context = " ".join(padded[index - n : index])
                    bucket = self.counts[n].setdefault(context, {})
                    bucket[word] = bucket.get(word, 0) + sign
                    self.totals[n][context] = self.totals[n].get(context, 0) + sign
                    if bucket[word] <= 0:
                        del bucket[word]
                    if not bucket:
                        del self.counts[n][context]
                        del self.totals[n][context]

    def fit(self, sentences: Iterable[list[str]]) -> "NgramLanguageModel":
        self._update(sentences, 1)
        return self

    def add(self, sentences: Iterable[list[str]]) -> None:
        self._update(sentences, 1)

    def remove(self, sentences: Iterable[list[str]]) -> None:
        self._update(sentences, -1)

    def probability(self, word: str, history: list[str]) -> float:
        vocab = self.vocabulary
        # Add-one unigram floor reserving mass for one unseen word type.
        probability = (vocab.get(word, 0) + 1) / (self.token_total + len(vocab) + 1)
        for n in range(1, self.order):
            if len(history) < n:
                break
            context = " ".join(history[len(history) - n :])
            total = self.totals[n].get(context, 0)
            if total == 0:
                continue
            bucket = self.counts[n][context]
            discounted = max(bucket.get(word, 0) - self.discount, 0.0) / total
            reserved = self.discount * len(bucket) / total
            probability = discounted + reserved * probability
        return probability

    def surprisals(self, tokens: list[str]) -> list[float]:
        """Return -log2 P(word | history) for each word and the sentence end."""
        padded = self._padded(tokens)
        return [
            -math.log2(self.probability(padded[i], padded[max(0, i - self.order + 1) : i]))
            for i in range(self.order - 1, len(padded))
        ]

    def perplexity(self, sentences: Iterable[list[str]]) -> float:
        values: list[float] = []
        for sentence in sentences:
            if sentence:
                values.extend(self.surprisals(sentence))
        return 2 ** (sum(values) / len(values)) if values else float("inf")

    def to_dict(self) -> dict:
        return {
            "order": self.order,
            "discount": self.discount,
            "tokenTotal": self.token_total,
            "counts": self.counts,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "NgramLanguageModel":
        model = cls(order=data["order"], discount=data["discount"])
        model.token_total = data["tokenTotal"]
        model.counts = data["counts"]
        model.totals = [
            {context: sum(bucket.values()) for context, bucket in level.items()}
            for level in model.counts
        ]
        return model
