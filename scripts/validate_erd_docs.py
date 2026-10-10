"""Small structural check for Build Process 2 documentation.

This does not replace team review. It catches the simpler mistake where an
entity appears in the ERD but is missing from the data dictionary or
requirements traceability document.
"""

from pathlib import Path


ARCHITECTURE_DIR = Path(__file__).resolve().parents[1] / "docs" / "architecture"
EXPECTED_ENTITIES = {
    "auth_sessions",
    "login_throttles",
    "users",
    "child_profiles",
    "guardian_children",
    "classes",
    "enrollments",
    "skills",
    "lessons",
    "activities",
    "activity_skills",
    "attempts",
    "skill_mastery",
    "recommendations",
}


def main() -> None:
    erd = (ARCHITECTURE_DIR / "ERD.md").read_text(encoding="utf-8").lower()
    dictionary = (ARCHITECTURE_DIR / "DATA_DICTIONARY.md").read_text(encoding="utf-8").lower()
    traceability = (ARCHITECTURE_DIR / "REQUIREMENTS_TRACEABILITY.md").read_text(
        encoding="utf-8"
    ).lower()

    errors: list[str] = []
    for entity in sorted(EXPECTED_ENTITIES):
        if entity not in erd:
            errors.append(f"ERD is missing entity: {entity}")
        if f"## {entity}" not in dictionary:
            errors.append(f"Data dictionary is missing section: {entity}")
        if entity not in traceability:
            errors.append(f"Traceability matrix never references: {entity}")

    if errors:
        raise SystemExit("\n".join(errors))

    print(f"Build Process 2 documentation check passed for {len(EXPECTED_ENTITIES)} entities.")


if __name__ == "__main__":
    main()

