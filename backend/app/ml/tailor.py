"""Assemble an explainable, learner-specific lesson from the trained models."""

from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml.corpus import Document, build_documents
from app.ml.model import ReadQuestModel, current_model
from app.ml.success import feature_vector
from app.models.curriculum import Activity, Book, Learner, Skill
from app.models.enums import WordResultType
from app.models.progress import Attempt
from app.models.voice import VoiceAttempt, WordResult
from app.services.learning import calculate_mastery, mastery_band, utc

TARGET_SUCCESS = 0.75  # challenging but achievable practice
UNASSESSED_NEED = 0.7
WEIGHTS = {"need": 0.45, "fit": 0.30, "words": 0.15, "review": 0.10}
LEVEL_TARGET = {"level-1": 0.2, "level-2": 0.5, "level-3": 0.8}
REVIEW_DAYS = {"needs_focus": 1, "developing": 7, "proficient": 14, "mastered": 14}


def missed_words(db: Session, learner_id: str, limit: int = 8) -> list[str]:
    rows = db.scalars(
        select(WordResult)
        .join(VoiceAttempt, VoiceAttempt.id == WordResult.voice_attempt_id)
        .where(
            VoiceAttempt.child_id == learner_id,
            WordResult.result_type.in_(
                [WordResultType.SUBSTITUTION, WordResultType.OMISSION]
            ),
            WordResult.expected_word.is_not(None),
        )
    )
    return [word for word, _ in Counter(row.expected_word for row in rows).most_common(limit)]


def _skill_state(attempts: list[Attempt], now: datetime) -> dict:
    mastery = calculate_mastery(attempts, now)
    score = mastery["score"]
    band = "unknown" if score is None else mastery_band(score)
    last = max((utc(a.attempted_at) for a in attempts), default=None)
    due = (
        last is not None
        and last + timedelta(days=REVIEW_DAYS.get(band, 1)) <= now
    )
    recent = sorted(attempts, key=lambda a: utc(a.attempted_at))[-10:]
    return {
        "score": score,
        "band": band,
        "accuracy": mastery["accuracy"] if recent else 0.5,
        "count": len(attempts),
        "reviewDue": due,
    }


def _reason(skill: str, state: dict, predicted: float, words: list[str]) -> str:
    if state["score"] is None:
        base = f"You have not practised {skill} yet, so this is a good place to start."
    elif state["band"] == "needs_focus":
        base = f"{skill} needs the most practice right now."
    elif state["band"] == "developing":
        base = f"{skill} is improving; a little more practice will help."
    else:
        base = f"A quick review keeps {skill} strong."
    if words:
        base += f" Includes words to practise: {', '.join(words)}."
    return f"{base} We expect about {round(predicted * 100)}% success."


def tailored_lesson(
    db: Session,
    learner: Learner,
    *,
    size: int = 5,
    now: datetime | None = None,
    model: ReadQuestModel | None = None,
) -> dict:
    now = now or datetime.now(UTC)
    documents = build_documents(db)
    model = model or current_model(db, documents)

    skills = {skill.id: skill.name for skill in db.scalars(select(Skill))}
    attempts = list(db.scalars(select(Attempt).where(Attempt.child_id == learner.id)))
    by_skill: dict[str, list[Attempt]] = defaultdict(list)
    last_seen: dict[str, Attempt] = {}
    for attempt in sorted(attempts, key=lambda a: utc(a.attempted_at)):
        by_skill[attempt.skill_id].append(attempt)
        last_seen[attempt.activity_id] = attempt
    states = {
        skill_id: _skill_state(by_skill.get(skill_id, []), now) for skill_id in skills
    }
    struggle_words = missed_words(db, learner.id)

    candidates: list[dict] = []
    for document in documents:
        if document.kind != "activity" or document.skill_id not in states:
            continue
        activity_id = document.id.removeprefix("activity:")
        state = states[document.skill_id]
        text_difficulty = model.difficulty_of(document)
        predicted = model.success.predict(
            feature_vector(state["accuracy"], state["count"], document.level, text_difficulty)
        )
        need = (
            UNASSESSED_NEED if state["score"] is None else 1 - state["score"] / 100
        )
        fit = max(0.0, 1 - abs(predicted - TARGET_SUCCESS) / TARGET_SUCCESS)
        tokens = set(document.tokens)
        targeted = [word for word in struggle_words if word in tokens]
        words = min(1.0, len(targeted) / 2)
        score = (
            WEIGHTS["need"] * need
            + WEIGHTS["fit"] * fit
            + WEIGHTS["words"] * words
            + WEIGHTS["review"] * float(state["reviewDue"])
        )
        previous = last_seen.get(activity_id)
        if previous is not None:
            recently = utc(previous.attempted_at) > now - timedelta(days=3)
            score -= 0.30 if previous.is_correct and recently else 0.10
        candidates.append(
            {
                "activityId": activity_id,
                "skillId": document.skill_id,
                "skillName": skills[document.skill_id],
                "band": state["band"],
                "masteryScore": None if state["score"] is None else round(state["score"], 1),
                "predictedSuccess": round(predicted, 3),
                "textDifficulty": round(text_difficulty, 3),
                "targetWords": targeted,
                "rankScore": round(score, 4),
                "reason": _reason(skills[document.skill_id], state, predicted, targeted),
            }
        )

    candidates.sort(key=lambda item: (-item["rankScore"], item["activityId"]))
    chosen: list[dict] = []
    per_skill: Counter[str] = Counter()
    for item in candidates:
        if per_skill[item["skillId"]] >= max(1, (size + 1) // 2):
            continue
        chosen.append(item)
        per_skill[item["skillId"]] += 1
        if len(chosen) == size:
            break
    # Easier first: a confident warm-up, then the stretch items.
    chosen.sort(key=lambda item: (-item["predictedSuccess"], item["activityId"]))
    for position, item in enumerate(chosen, start=1):
        item["order"] = position

    return {
        "learnerId": learner.id,
        "generatedAt": now.isoformat(),
        "modelVersion": model.metadata["version"],
        "targetSuccess": TARGET_SUCCESS,
        "items": chosen,
        "practiceWords": struggle_words,
        "books": _book_picks(db, learner, documents, model, states, struggle_words),
        "disclaimer": (
            "Statistical practice suggestions based on this learner's recorded "
            "attempts. They are not a validated reading assessment."
        ),
    }


def _book_picks(
    db: Session,
    learner: Learner,
    documents: list[Document],
    model: ReadQuestModel,
    states: dict[str, dict],
    practice_words: list[str],
) -> list[dict]:
    assessed = [s["score"] for s in states.values() if s["score"] is not None]
    mean = sum(assessed) / len(assessed) if assessed else 50.0
    target = LEVEL_TARGET.get(learner.reading_level_id, 0.5) + (mean - 60) / 400
    titles = {book.id: book.title for book in db.scalars(select(Book))}
    picks = []
    for document in documents:
        if document.kind != "book":
            continue
        difficulty = model.difficulty_of(document)
        matches = [w for w in practice_words if w in set(document.tokens)]
        closeness = 1 - abs(difficulty - target)
        picks.append(
            {
                "bookId": document.id.removeprefix("book:"),
                "title": titles.get(document.id.removeprefix("book:"), ""),
                "textDifficulty": round(difficulty, 3),
                "targetWords": matches,
                "rankScore": round(closeness + 0.1 * min(len(matches), 3), 4),
            }
        )
    picks.sort(key=lambda item: (-item["rankScore"], item["bookId"]))
    return picks[:3]
