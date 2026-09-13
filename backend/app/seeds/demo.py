"""Idempotent ReadQuest demonstration seed.

Run inside the backend container:
    python -m app.seeds.demo

Authentication belongs to Member 1. The placeholder hashes created here cannot
be used to log in until Member 1 replaces them through the authentication flow.
"""

from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionFactory
from app.models.curriculum import Activity, ActivitySkill, Lesson, Skill
from app.models.enums import ActivityType, ContentStatus, UserRole
from app.models.identity import ChildProfile, GuardianChild, User
from app.models.learning import Attempt, Recommendation, SkillMastery  # noqa: F401 -- registers mappers

DEMO_PASSWORD_HASH = "DEMO_AUTH_NOT_CONFIGURED"


def uid(number: int) -> UUID:
    return UUID(f"00000000-0000-0000-0000-{number:012d}")


SKILL_ROWS = [
    (101, "LETTER_SOUNDS", "Letter Sounds", "phonemic_awareness", 1),
    (102, "SHORT_A", "Short A Words", "phonics", 2),
    (103, "SHORT_E", "Short E Words", "phonics", 2),
    (104, "CVC_BLEND", "CVC Word Blending", "phonics", 3),
    (105, "SIGHT_1", "Early Sight Words", "sight_words", 2),
    (106, "VOCAB_CONTEXT", "Vocabulary in Context", "vocabulary", 4),
    (107, "MAIN_IDEA", "Identify the Main Idea", "comprehension", 4),
    (108, "DETAIL_RECALL", "Recall Story Details", "comprehension", 3),
]


def seed_users(session: Session) -> dict[str, User]:
    rows = [
        (1, "teacher@readquest.local", UserRole.TEACHER),
        (2, "parent@readquest.local", UserRole.PARENT),
        (3, "child@readquest.local", UserRole.CHILD),
        (4, "admin@readquest.local", UserRole.ADMIN),
    ]
    users: dict[str, User] = {}
    for number, email, role in rows:
        user = session.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(id=uid(number), email=email, password_hash=DEMO_PASSWORD_HASH, role=role)
            session.add(user)
        users[role.value] = user
    session.flush()
    return users


def seed_child_relationship(session: Session, users: dict[str, User]) -> ChildProfile:
    child = session.scalar(select(ChildProfile).where(ChildProfile.user_id == users["child"].id))
    if child is None:
        child = ChildProfile(
            id=uid(10), user_id=users["child"].id, display_name="Demo Reader", grade_level=2
        )
        session.add(child)
        session.flush()

    link = session.get(GuardianChild, (users["parent"].id, child.id))
    if link is None:
        session.add(
            GuardianChild(
                guardian_id=users["parent"].id,
                child_id=child.id,
                relationship_label="parent",
            )
        )
    return child


def seed_curriculum(session: Session) -> None:
    skills: dict[str, Skill] = {}
    for number, code, name, category, level in SKILL_ROWS:
        skill = session.scalar(select(Skill).where(Skill.code == code))
        if skill is None:
            skill = Skill(
                id=uid(number),
                code=code,
                name=name,
                category=category,
                level=level,
                status=ContentStatus.PUBLISHED,
            )
            session.add(skill)
        skills[code] = skill
    session.flush()

    lesson = session.get(Lesson, uid(200))
    if lesson is None:
        lesson = Lesson(
            id=uid(200),
            title="Reading Foundations",
            description="Deterministic activities for development and demonstration.",
            sequence=1,
            status=ContentStatus.PUBLISHED,
        )
        session.add(lesson)
        session.flush()

    for index, (_, code, name, _, level) in enumerate(SKILL_ROWS, start=1):
        for variation in range(1, 3):
            activity_id = uid(300 + (index * 10) + variation)
            activity = session.get(Activity, activity_id)
            if activity is None:
                activity = Activity(
                    id=activity_id,
                    lesson_id=lesson.id,
                    title=f"{name} Practice {variation}",
                    activity_type=ActivityType.MULTIPLE_CHOICE,
                    prompt=f"Choose the best answer for {name.lower()}.",
                    content={
                        "choices": ["Sample A", "Sample B", "Sample C"],
                        "correct_index": 0,
                    },
                    difficulty=level,
                    sequence=((index - 1) * 2) + variation,
                    status=ContentStatus.PUBLISHED,
                )
                session.add(activity)
                session.flush()
            if session.get(ActivitySkill, (activity.id, skills[code].id)) is None:
                session.add(
                    ActivitySkill(
                        activity_id=activity.id,
                        skill_id=skills[code].id,
                        weight=Decimal("1.000"),
                    )
                )


def run_seed() -> None:
    with SessionFactory.begin() as session:
        users = seed_users(session)
        seed_child_relationship(session, users)
        seed_curriculum(session)
    print("ReadQuest demo seed completed successfully.")


if __name__ == "__main__":
    run_seed()
