from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.schemas import ActivityView, MasteryView, RecommendationView, SkillView
from app.models.curriculum import Activity, ActivitySkill, Lesson, Skill
from app.models.enums import ContentStatus
from app.models.learning import SkillMastery
from app.repositories.adaptive import AdaptiveRepository
from app.services.adaptive.recommendation import rank_activities

EXPLANATIONS = {
    "PRACTICE_WEAK_SKILL": "Let's practice a skill that is still growing.",
    "SPACED_REVIEW_DUE": "Let's revisit a skill you have not practiced recently.",
    "MATCHED_DIFFICULTY": "This activity fits your reading level.",
    "VARIETY_ROTATION": "Try something different to keep learning.",
}


def activities(session: Session, *, include_drafts: bool = False) -> list[Activity]:
    statement = select(Activity).options(selectinload(Activity.skill_links).selectinload(ActivitySkill.skill))
    if not include_drafts:
        statement = statement.join(Lesson).where(
            Activity.status == ContentStatus.PUBLISHED, Lesson.status == ContentStatus.PUBLISHED,
            ~Activity.skill_links.any(ActivitySkill.skill.has(Skill.status != ContentStatus.PUBLISHED)))
    return list(session.scalars(statement.order_by(Activity.sequence, Activity.id)))


def activity(session: Session, activity_id: UUID) -> Activity:
    row = next((a for a in activities(session) if a.id == activity_id), None)
    if row is None:
        raise HTTPException(404, "activity not available")
    return row


def activity_view(row: Activity, *, answer_key: bool = False) -> ActivityView:
    content = dict(row.content)
    if not answer_key:
        content.pop("correct_index", None)
    return ActivityView(id=row.id, lesson_id=row.lesson_id, title=row.title,
        activity_type=row.activity_type, prompt=row.prompt, content=content,
        difficulty=row.difficulty, sequence=row.sequence, status=row.status,
        skills=[SkillView.model_validate(link.skill) for link in row.skill_links])


def mastery_views(session: Session, child_id: UUID) -> list[MasteryView]:
    rows = session.execute(select(Skill, SkillMastery).outerjoin(SkillMastery,
        (SkillMastery.skill_id == Skill.id) & (SkillMastery.child_id == child_id))
        .where(Skill.status == ContentStatus.PUBLISHED).order_by(Skill.code))
    return [MasteryView(skill_id=s.id, skill_name=s.name, score=float(m.score) if m else 0,
        band=m.band if m else "unassessed", confidence=m.confidence if m else "low",
        attempt_count=m.attempt_count if m else 0,
        last_practiced_at=m.last_practiced_at if m else None) for s, m in rows]


def recommendation_view(session: Session, recommendation) -> RecommendationView | None:
    if recommendation is None:
        return None
    return RecommendationView(activity=activity_view(activity(session, recommendation.activity_id)),
        priority_score=float(recommendation.priority_score), reason_code=recommendation.reason_code,
        explanation=EXPLANATIONS[recommendation.reason_code], reason_details=recommendation.reason_details)


def recommend(session: Session, child_id: UUID, learner_level: int):
    repository = AdaptiveRepository(session)
    now = datetime.now(UTC)
    ranked = rank_activities(repository.recommendation_candidates(child_id, learner_level=learner_level, now=now), now=now)
    return repository.save_recommendation(child_id, None, ranked[0]) if ranked else None
