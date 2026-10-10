"""Idempotent ReadQuest demonstration seed.

Run inside the backend container:
    python -m app.seeds.demo

Authentication belongs to Member 1. The placeholder hashes created here cannot
be used to log in until Member 1 replaces them through the authentication flow.
"""

import os
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionFactory
from app.models.curriculum import Activity, ActivitySkill, Lesson, Skill
from app.models.enums import ActivityType, ContentStatus, UserRole
from app.models.identity import ChildProfile, Classroom, Enrollment, GuardianChild, User
from app.models.learning import Attempt, Recommendation, SkillMastery  # noqa: F401 -- registers mappers
from app.repositories.adaptive import AdaptiveRepository
from app.services.adaptive.mastery import calculate_mastery

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


DEMO_CONTENT = {
    "LETTER_SOUNDS": ("Which word begins with the sound /m/?", ["moon", "sun", "cat"]),
    "SHORT_A": ("Which word has the short a sound?", ["cat", "tree", "moon"]),
    "SHORT_E": ("Which word has the short e sound?", ["hen", "rain", "boat"]),
    "CVC_BLEND": ("Blend /d/ /o/ /g/. Which word do you hear?", ["dog", "dig", "dot"]),
    "SIGHT_1": ("Choose the word 'the'.", ["the", "and", "you"]),
    "VOCAB_CONTEXT": ("The tiny mouse fit in a cup. What does tiny mean?", ["very small", "very loud", "very tall"]),
    "MAIN_IDEA": ("Mia plants seeds, waters them, and watches flowers grow. What is this about?", ["growing flowers", "building a house", "riding a bike"]),
    "DETAIL_RECALL": ("Sam put a red book in his bag. What color was the book?", ["red", "blue", "green"]),
}


def seed_users(session: Session) -> dict[str, User]:
    rows = [
        (1, "teacher@readquest.example.org", UserRole.TEACHER),
        (2, "parent@readquest.example.org", UserRole.PARENT),
        (3, "child@readquest.example.org", UserRole.CHILD),
        (4, "admin@readquest.example.org", UserRole.ADMIN),
    ]
    users: dict[str, User] = {}
    for number, email, role in rows:
        user = session.scalar(select(User).where(User.email == email))
        if user is None:
            user = session.get(User, uid(number))
            if user is not None and user.email.endswith("@readquest.local"):
                user.email = email
        if user is None:
            user = User(id=uid(number), email=email, password_hash=DEMO_PASSWORD_HASH, role=role)
            session.add(user)
        password = os.environ.get("READQUEST_DEMO_PASSWORD")
        if password:
            if not 12 <= len(password) <= 128:
                raise ValueError("READQUEST_DEMO_PASSWORD must contain 12–128 characters")
            user.password_hash = hash_password(password)
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
                    prompt=DEMO_CONTENT[code][0],
                    content={
                        "choices": DEMO_CONTENT[code][1],
                        "correct_index": 0,
                    },
                    difficulty=level,
                    sequence=((index - 1) * 2) + variation,
                    status=ContentStatus.PUBLISHED,
                )
                session.add(activity)
                session.flush()
            if activity.content.get("choices") == ["Sample A", "Sample B", "Sample C"]:
                activity.prompt = DEMO_CONTENT[code][0]
                activity.content = {"choices": DEMO_CONTENT[code][1], "correct_index": 0}
            if session.get(ActivitySkill, (activity.id, skills[code].id)) is None:
                session.add(
                    ActivitySkill(
                        activity_id=activity.id,
                        skill_id=skills[code].id,
                        weight=Decimal("1.000"),
                    )
                )


def seed_histories(session: Session, child_id) -> None:
    """Low, improving, inconsistent, mastered and overdue cases on five skills."""
    cases = [(101, 311, [False]*10, 1), (102, 321, [False]*4+[True]*6, 1),
             (103, 331, [True, False]*5, 1), (104, 341, [True]*10, 1),
             (105, 351, [True]*10, 21)]
    reference = datetime(2026, 9, 1, 12, tzinfo=UTC)
    repository = AdaptiveRepository(session)
    for case_index, (skill_number, activity_number, answers, age_days) in enumerate(cases):
        for index, correct in enumerate(answers):
            attempt_id = uid(5000 + case_index*100 + index)
            if session.get(Attempt, attempt_id) is None:
                session.add(Attempt(id=attempt_id, child_id=child_id, activity_id=uid(activity_number),
                    is_correct=correct, response_ms=2400, answer={"selected_index": 0 if correct else 1},
                    occurred_at=reference-timedelta(days=age_days, minutes=10-index)))
        session.flush()
        evidence = repository.recent_attempts_for_skill(child_id, uid(skill_number))
        repository.save_mastery(child_id, uid(skill_number), calculate_mastery(evidence))


def run_seed() -> None:
    if get_settings().environment == "production":
        raise ValueError("demo seeding is prohibited in production")
    with SessionFactory.begin() as session:
        users = seed_users(session)
        seed_child_relationship(session, users)
        seed_curriculum(session)
        child = seed_child_relationship(session, users)
        classroom = session.get(Classroom, uid(20))
        if classroom is None:
            classroom = Classroom(id=uid(20), teacher_id=users["teacher"].id,
                                  name="Demo reading class", join_code="readquest-demo")
            session.add(classroom)
            session.flush()
        if session.get(Enrollment, (classroom.id, child.id)) is None:
            session.add(Enrollment(class_id=classroom.id, child_id=child.id))
        seed_histories(session, child.id)
    print("ReadQuest demo seed completed successfully.")


if __name__ == "__main__":
    run_seed()
