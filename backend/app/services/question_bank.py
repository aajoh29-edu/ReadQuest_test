from __future__ import annotations
import random
from dataclasses import dataclass
from typing import Sequence, Protocol

DEFAULT_PER_SKILL = 12
DEFAULT_SEED = 20261130

@dataclass(frozen=True, slots=True)
class Question:
    skill_code: str
    prompt: str
    choices: tuple[str, str, str]
    correct_index: int
    difficulty: int
    title: str
    source_id: str | None = None

    @property
    def correct_answer(self) -> str:
        return self.choices[self.correct_index]

class ContentProvider(Protocol):
    """Domain abstract protocol decouples engine core from infrastructure layers."""
    def get_items_for_skill(self, skill_code: str) -> list[dict]: ...
    def get_skill_difficulty(self, skill_code: str) -> int: ...


class Engine:
    def __init__(self, provider: ContentProvider):
        self.provider = provider

    def _shuffle_choices(self, rng: random.Random, correct: str, distractors: Sequence[str]) -> tuple[tuple[str, str, str], int]:
        chosen = list(dict.fromkeys(distractors))
        if correct in chosen:
            raise ValueError(f"distractor equals correct answer: {correct!r}")
        if len(chosen) < 2:
            raise ValueError(f"need at least 2 distinct distractors for {correct!r}, got {chosen!r}")
        
        # Safe down-sampling of provisioned distractors
        if len(chosen) > 2:
            chosen = rng.sample(chosen, 2)

        choices = [correct, *chosen]
        rng.shuffle(choices)
        return tuple(choices), choices.index(correct)

    def generate_for_skill(self, skill_code: str, count: int, seed: int) -> list[Question]:
        rng = random.Random(seed)
        raw_items = self.provider.get_items_for_skill(skill_code)
        if count > len(raw_items):
            raise ValueError(f"{skill_code} bank holds at most {len(raw_items)} items, requested {count}.")

        if count == 0:
            return []

        difficulty = self.provider.get_skill_difficulty(skill_code)
        rng.shuffle(raw_items)
        out: list[Question] = []
        
        for item in raw_items[:count]:
            # Renders dynamic contexts such as {sentence}, {word}, or {sounds}
            prompt = item["template"].format(**item["context"])
            choices, correct_index = self._shuffle_choices(rng, item["correct"], item["distractors"])
            
            out.append(Question(
                skill_code=skill_code,
                prompt=prompt,
                choices=choices,
                correct_index=correct_index,
                difficulty=difficulty,
                title=f"{skill_code.replace('_', ' ').title()} Varied Practice",
                source_id=item.get("source_id"),
            ))
        return out

    def generate_all(self, skill_codes: Sequence[str], per_skill: int = DEFAULT_PER_SKILL, seed: int = DEFAULT_SEED) -> list[Question]:
        out: list[Question] = []
        for skill_code in skill_codes:
            out.extend(self.generate_for_skill(skill_code, per_skill, seed))
        return out


def pick_next(questions: Sequence[Question], seen_prompts: Sequence[str], rng: random.Random | None = None) -> Question:
    rng = rng or random.Random()
    unseen = [q for q in questions if q.prompt not in set(seen_prompts)]
    pool = unseen if unseen else list(questions)
    return rng.choice(pool)

