from __future__ import annotations
import sys
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionFactory
from app.models.question import QuestionBank, Skill  # Adjust imports to your pathing


def verify_database_consistency(session: Session) -> bool:
    """
    Validates the database question bank against production domain invariants.
    Returns True if database is clean, False if errors are discovered.
    """
    print("= Running Question Bank Database Consistency Audit =\n")
    
    # 1. Fetch Master Skill Codes
    skills = session.scalars(select(Skill.code)).all()
    if not skills:
        print("[CRITICAL] No entries found in the skills table.")
        return False
        
    print(f"[INFO] Found {len(skills)} configured skills in database.")

    errors = 0
    warnings = 0
    total_checked = 0

    # 2. Streaming Cursor to Validate Bank Records
    stmt = select(QuestionBank)
    questions = session.scalars(stmt).all()

    for idx, q in enumerate(questions, start=1):
        total_checked += 1
        prefix = f"Row ID {q.id} [{q.skill_code}]:"

        # Rule A: Skill Association Check
        if q.skill_code not in skills:
            print(f"[ERROR] {prefix} References orphaned or non-existent skill code.")
            errors += 1
            continue

        # Rule B: Template Tokens Compilation Check
        try:
            # Reconstruct string interpolation safely using stored JSON context data
            q.template_string.format(**q.context_data)
        except KeyError as e:
            print(f"[ERROR] {prefix} Template string rendering failed. Missing key context value: {e}")
            errors += 1
        except Exception as e:
            print(f"[ERROR] {prefix} Unexpected error parsing token string layout: {e}")
            errors += 1

        # Rule C: Invariant Contradiction Checks
        if q.correct_answer in q.distractors:
            print(f"[ERROR] {prefix} Distractor list contains the correct answer string: {q.correct_answer!r}")
            errors += 1

        # Rule D: Unique Choice Elements Check
        if len(set(q.distractors)) != len(q.distractors):
            print(f"[WARNING] {prefix} Distractors contain internal duplicates. Clean duplicates to preserve variability.")
            warnings += 1

        if len(q.distractors) < 2:
            print(f"[ERROR] {prefix} Inadequate distraction pool. Requires minimum 2, found: {len(q.distractors)}")
            errors += 1

        # Rule E: Phonics Rule Check (Phoneme Initial Sounds)
        if q.skill_code == "LETTER_SOUNDS":
            sound_token = q.context_data.get("sound", "")
            # Check if correct answer matches first character rule structure safely
            if sound_token and not q.correct_answer.startswith(sound_token.strip("/")):
                print(f"[WARNING] {prefix} Target {q.correct_answer!r} doesn't seem to start with phoneme {sound_token}.")
                warnings += 1

    # Summary Report
    print("\n================ Audit Result ================")
    print(f"Total Rows Verified  : {total_checked}")
    print(f"Total Database Errors: {errors}")
    print(f"Total System Warnings: {warnings}")
    print("==============================================")

    if errors > 0:
        print("[FAIL] Database integrity checks failed. Resolve errors before opening traffic.")
        return False
        
    print("[SUCCESS] All question records conform to core engine logic constraints.")
    return True


def main() -> int:
    with SessionFactory.begin() as session:
        success = verify_database_consistency(session)
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
