from dataclasses import dataclass

from app.models.enums import WordResultType
from app.utils.tokenizer import tokenize_text


@dataclass(frozen=True)
class AlignmentResult:
    expected_index: int | None
    expected_word: str | None
    actual_word: str | None
    result_type: WordResultType
    confidence: float | None


def _normalise_confidences(values: list[float], count: int) -> list[float | None]:
    normalised: list[float | None] = []
    for index in range(count):
        normalised.append(values[index] if index < len(values) else None)
    return normalised


def align_words(
    expected_words: list[str], transcript: str, word_confidences: list[float] | None = None
) -> list[AlignmentResult]:
    actual_words = tokenize_text(transcript)
    confidences = _normalise_confidences(word_confidences or [], len(actual_words))
    expected_count = len(expected_words)
    actual_count = len(actual_words)
    costs = [[0] * (actual_count + 1) for _ in range(expected_count + 1)]
    moves: list[list[str | None]] = [
        [None] * (actual_count + 1) for _ in range(expected_count + 1)
    ]
    for expected_index in range(1, expected_count + 1):
        costs[expected_index][0] = expected_index
        moves[expected_index][0] = "omission"
    for actual_index in range(1, actual_count + 1):
        costs[0][actual_index] = actual_index
        moves[0][actual_index] = "insertion"

    for expected_index in range(1, expected_count + 1):
        for actual_index in range(1, actual_count + 1):
            is_match = (
                expected_words[expected_index - 1] == actual_words[actual_index - 1]
            )
            candidates = [
                (
                    costs[expected_index - 1][actual_index - 1]
                    + (0 if is_match else 1),
                    "correct" if is_match else "substitution",
                ),
                (costs[expected_index - 1][actual_index] + 1, "omission"),
                (costs[expected_index][actual_index - 1] + 1, "insertion"),
            ]
            costs[expected_index][actual_index], moves[expected_index][actual_index] = min(
                candidates, key=lambda item: (item[0], item[1])
            )

    aligned: list[AlignmentResult] = []
    expected_index = expected_count
    actual_index = actual_count
    while expected_index or actual_index:
        move = moves[expected_index][actual_index]
        if move in {"correct", "substitution"}:
            expected_index -= 1
            actual_index -= 1
            aligned.append(
                AlignmentResult(
                    expected_index,
                    expected_words[expected_index],
                    actual_words[actual_index],
                    WordResultType(move),
                    confidences[actual_index],
                )
            )
        elif move == "omission":
            expected_index -= 1
            aligned.append(
                AlignmentResult(
                    expected_index,
                    expected_words[expected_index],
                    None,
                    WordResultType.OMISSION,
                    None,
                )
            )
        else:
            actual_index -= 1
            aligned.append(
                AlignmentResult(
                    None,
                    None,
                    actual_words[actual_index],
                    WordResultType.INSERTION,
                    confidences[actual_index],
                )
            )
    aligned.reverse()

    self_corrected: list[AlignmentResult] = []
    index = 0
    while index < len(aligned):
        result = aligned[index]
        next_result = aligned[index + 1] if index + 1 < len(aligned) else None
        if (
            result.result_type == WordResultType.INSERTION
            and next_result is not None
            and next_result.result_type == WordResultType.CORRECT
            and next_result.expected_word == next_result.actual_word
        ):
            self_corrected.append(
                AlignmentResult(
                    next_result.expected_index,
                    next_result.expected_word,
                    f"{result.actual_word} {next_result.actual_word}",
                    WordResultType.SELF_CORRECTION,
                    next_result.confidence,
                )
            )
            index += 2
            continue
        self_corrected.append(result)
        index += 1
    return self_corrected


def score_alignment(
    expected_words: list[str], alignment: list[AlignmentResult], duration_seconds: float
) -> tuple[float, float, int, int]:
    correct = sum(result.result_type in {
        WordResultType.CORRECT,
        WordResultType.SELF_CORRECTION,
    } for result in alignment)
    attempted = len(expected_words) + sum(
        result.result_type == WordResultType.INSERTION for result in alignment
    )
    accuracy = correct / attempted if attempted else 0.0
    wcpm = correct * 60 / duration_seconds if duration_seconds > 0 else 0.0
    return accuracy, wcpm, correct, attempted
