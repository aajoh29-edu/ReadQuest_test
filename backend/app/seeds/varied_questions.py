from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adapters.question_repository import DatabaseContentProvider, VARIED_ACTIVITY_PREFIX
from app.models.curriculum import Activity, Skill
from app.services.question_bank import DEFAULT_PER_SKILL, DEFAULT_SEED, Engine


def seed_varied_questions(
    session: Session, *, per_skill: int = DEFAULT_PER_SKILL, seed: int = DEFAULT_SEED
) -> dict[str, int]:
    provider = DatabaseContentProvider(session)
    engine = Engine(provider)
    inserted = 0
    skipped = 0

    for skill_code in session.scalars(select(Skill.code).order_by(Skill.code)):
        available = len(provider.get_items_for_skill(skill_code))
        questions = engine.generate_for_skill(skill_code, min(per_skill, available), seed)
        for number, question in enumerate(questions, start=1):
            source = provider.sources[question.source_id]
            activity_id = f"{VARIED_ACTIVITY_PREFIX}{source.primary_skill_id}-{number}"
            if session.get(Activity, activity_id) is not None:
                skipped += 1
                continue

            source_options = {option["label"]: option for option in source.content["options"]}
            options = [
                {
                    **source_options[label],
                    "id": f"{activity_id}-opt{index + 1}",
                    "isCorrect": index == question.correct_index,
                }
                for index, label in enumerate(question.choices)
            ]
            session.add(
                Activity(
                    id=activity_id,
                    primary_skill_id=source.primary_skill_id,
                    type=source.type,
                    difficulty=source.difficulty,
                    content={**source.content, "id": activity_id, "prompt": question.prompt, "options": options},
                )
            )
            inserted += 1

    session.flush()
    return {"inserted": inserted, "skipped_already_present": skipped, "total": inserted + skipped}
