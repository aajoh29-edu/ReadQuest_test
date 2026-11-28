from __future__ import annotations
import sys
from sqlalchemy import select
from sqlalchemy.orm import Session

# Import your database session and models
from app.db.session import SessionFactory
from app.core.config import get_settings
from app.models.question import QuestionBank, Skill  # Adjust path to match your layout

# Import your original hardcoded content banks
from app.services.question_bank import (
    SKILL_INFO,
    LETTER_SOUNDS,
    SHORT_A_WORDS,
    SHORT_A_DISTRACTORS,
    SHORT_E_WORDS,
    SHORT_E_DISTRACTORS,
    CVC_WORDS,
    SIGHT_WORDS,
    VOCAB_ITEMS,
    MAIN_IDEA_ITEMS,
    DETAIL_ITEMS,
)

def migrate_static_to_postgres(session: Session) -> dict:
    """
    Parses the static Python content banks, maps them to the new schema,
    and populates the PostgreSQL database tables.
    """
    stats = {"skills_inserted": 0, "questions_inserted": 0, "skipped": 0}

    # Step 1: Ensure Skills Configuration Table is Populated
    for code, (display_name, difficulty) in SKILL_INFO.items():
        existing_skill = session.get(Skill, code)
        if not existing_skill:
            skill_row = Skill(code=code, display_name=display_name, difficulty=difficulty)
            session.add(skill_row)
            stats["skills_inserted"] += 1
    session.flush()

    # Step 2: Migrate LETTER_SOUNDS
    # Templates from original _gen_letter_sounds loop
    ls_templates = [
        "Which word begins with the sound {sound}?",
        "Which word starts with {sound}?",
        "Listen for {sound}. Which word begins with that sound?",
    ]
    all_ls_words = [w for words in LETTER_SOUNDS.values() for w in words]
    
    for sound, words in LETTER_SOUNDS.items():
        for target in words:
            for template in ls_templates:
                # Distractors are selected at runtime by the engine, save the whole pool
                distractors = [w for w in all_ls_words if w not in LETTER_SOUNDS[sound]]
                
                _add_question(
                    session, stats, "LETTER_SOUNDS",
                    context={"sound": sound},
                    template=template,
                    correct=target,
                    distractors=distractors
                )

    # Step 3: Migrate SHORT_A_WORDS
    sa_templates = [
        "Which word has the short a sound?",
        "Which word says /a/ like in cat?",
        "Tap the word with the short a sound.",
    ]
    for i, target in enumerate(SHORT_A_WORDS):
        _add_question(
            session, stats, "SHORT_A",
            context={},
            template=sa_templates[i % len(sa_templates)],
            correct=target,
            distractors=SHORT_A_DISTRACTORS
        )

    # Step 4: Migrate SHORT_E_WORDS
    se_templates = [
        "Which word has the short e sound?",
        "Which word says /e/ like in hen?",
        "Tap the word with the short e sound.",
    ]
    for i, target in enumerate(SHORT_E_WORDS):
        _add_question(
            session, stats, "SHORT_E",
            context={},
            template=se_templates[i % len(se_templates)],
            correct=target,
            distractors=SHORT_E_DISTRACTORS
        )

    # Step 5: Migrate CVC_WORDS
    cvc_templates = [
        "Blend {sounds}. Which word do you hear?",
        "Say the sounds {sounds} together. Which word is it?",
    ]
    for i, (target, (sounds, distractors)) in enumerate(CVC_WORDS.items()):
        _add_question(
            session, stats, "CVC_BLEND",
            context={"sounds": sounds},
            template=cvc_templates[i % len(cvc_templates)],
            correct=target,
            distractors=list(distractors)
        )

    # Step 6: Migrate SIGHT_WORDS
    sight_templates = ["Choose the word '{word}'.", "Tap the word '{word}'."]
    for i, target in enumerate(SIGHT_WORDS):
        distractors = [w for w in SIGHT_WORDS if w != target]
        _add_question(
            session, stats, "SIGHT_1",
            context={"word": target},
            template=sight_templates[i % len(sight_templates)],
            correct=target,
            distractors=distractors
        )

    # Step 7: Migrate VOCAB_ITEMS
    vocab_templates = [
        "{sentence} What does {word} mean?",
        "{sentence} What does '{word}' mean here?",
    ]
    for i, (word, sentence, meaning, wrong) in enumerate(VOCAB_ITEMS):
        _add_question(
            session, stats, "VOCAB_CONTEXT",
            context={"sentence": sentence, "word": word},
            template=vocab_templates[i % len(vocab_templates)],
            correct=meaning,
            distractors=list(wrong)
        )

    # Step 8: Migrate MAIN_IDEA_ITEMS
    for story, idea, wrong in MAIN_IDEA_ITEMS:
        _add_question(
            session, stats, "MAIN_IDEA",
            context={},
            template=f"{story} What is this about?",
            correct=idea,
            distractors=list(wrong)
        )

    # Step 9: Migrate DETAIL_ITEMS
    for story, question, answer, wrong in DETAIL_ITEMS:
        _add_question(
            session, stats, "DETAIL_RECALL",
            context={},
            template=f"{story} {question}",
            correct=answer,
            distractors=list(wrong)
        )

    session.flush()
    return stats


def _add_question(session: Session, stats: dict, skill_code: str, context: dict, template: str, correct: str, distractors: list[str]):
    """Helper to check for existing duplicates by matching target template and answer criteria."""
    stmt = select(QuestionBank).where(
        QuestionBank.skill_code == skill_code,
        QuestionBank.template_string == template,
        QuestionBank.correct_answer == correct
    )
    if session.scalar(stmt) is not None:
        stats["skipped"] += 1
        return

    row = QuestionBank(
        skill_code=skill_code,
        context_data=context,
        template_string=template,
        correct_answer=correct,
        distractors=distractors
    )
    session.add(row)
    stats["questions_inserted"] += 1


def main() -> int:
    if get_settings().environment == "production":
        print("Error: Running seed migrations is prohibited in production environmental contexts.", file=sys.stderr)
        return 1

    print("Connecting to database and running migration script...")
    with SessionFactory.begin() as session:
        results = migrate_static_to_postgres(session)
        
    print(f"Migration Completed successfully!")
    print(f" -> Skills Added: {results['skills_inserted']}")
    print(f" -> Questions Migrated: {results['questions_inserted']}")
    print(f" -> Skipped (Already Present): {results['skipped']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
