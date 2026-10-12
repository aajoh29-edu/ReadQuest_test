from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models.curriculum import Activity, ActivitySkill, Lesson, Skill
from app.models.enums import ContentStatus, RecommendationStatus
from app.models.learning import Attempt, Recommendation, SkillMastery
from app.services.adaptive.mastery import AttemptResult, MasteryResult
from app.services.adaptive.recommendation import ActivityCandidate, RankedRecommendation


class AdaptiveRepository:
    """All database operations required by the adaptive transaction."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def add_attempt(self, attempt: Attempt) -> None:
        self.session.add(attempt)
        self.session.flush()

    def activity_skill_ids(self, activity_id: UUID) -> list[UUID]:
        statement = select(ActivitySkill.skill_id).where(ActivitySkill.activity_id == activity_id)
        return list(self.session.scalars(statement))

    def lock_adaptive_key(self, child_id: UUID, skill_id: UUID) -> None:
        """Serialize mastery updates for one child/skill pair in PostgreSQL."""
        key = f"{child_id}:{skill_id}"
        self.session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": key},
        )

    def recent_attempts_for_skill(
        self, child_id: UUID, skill_id: UUID, *, limit: int = 10
    ) -> list[AttemptResult]:
        statement = (
            select(Attempt.is_correct, Attempt.occurred_at)
            .join(ActivitySkill, ActivitySkill.activity_id == Attempt.activity_id)
            .where(Attempt.child_id == child_id, ActivitySkill.skill_id == skill_id)
            .order_by(Attempt.occurred_at.desc(), Attempt.id.desc())
            .limit(limit)
        )
        return [
            AttemptResult(is_correct=row.is_correct, occurred_at=row.occurred_at)
            for row in self.session.execute(statement)
        ]

    def lock_mastery(self, child_id: UUID, skill_id: UUID) -> SkillMastery | None:
        statement = (
            select(SkillMastery)
            .where(SkillMastery.child_id == child_id, SkillMastery.skill_id == skill_id)
            .with_for_update()
        )
        return self.session.scalar(statement)

    def save_mastery(self, child_id: UUID, skill_id: UUID, result: MasteryResult) -> SkillMastery:
        record = self.lock_mastery(child_id, skill_id)
        if record is None:
            record = SkillMastery(child_id=child_id, skill_id=skill_id)
            self.session.add(record)
        record.score = Decimal(str(result.score))
        record.band = result.band
        record.confidence = result.confidence
        record.attempt_count = result.attempt_count
        record.last_practiced_at = result.last_practiced_at
        record.algorithm_version = result.algorithm_version
        self.session.flush()
        return record

    def recommendation_candidates(
        self,
        child_id: UUID,
        *,
        learner_level: int,
        now: datetime,
        cooldown_hours: int = 4,
    ) -> list[ActivityCandidate]:
        cooldown_start = now - timedelta(hours=cooldown_hours)
        recent_activity_ids = select(Attempt.activity_id).where(
            Attempt.child_id == child_id,
            Attempt.occurred_at >= cooldown_start,
        )
        statement = (
            select(
                Activity.id,
                ActivitySkill.skill_id,
                Activity.difficulty,
                SkillMastery.score,
                SkillMastery.last_practiced_at,
            )
            .join(ActivitySkill, ActivitySkill.activity_id == Activity.id)
            .join(Lesson, Lesson.id == Activity.lesson_id)
            .join(Skill, Skill.id == ActivitySkill.skill_id)
            .outerjoin(
                SkillMastery,
                (SkillMastery.child_id == child_id)
                & (SkillMastery.skill_id == ActivitySkill.skill_id),
            )
            .where(
                Activity.status == ContentStatus.PUBLISHED,
                Lesson.status == ContentStatus.PUBLISHED,
                Skill.status == ContentStatus.PUBLISHED,
                ~Activity.skill_links.any(ActivitySkill.skill.has(Skill.status != ContentStatus.PUBLISHED)),
                Activity.id.not_in(recent_activity_ids),
            )
        )
        return [
            ActivityCandidate(
                activity_id=row.id,
                skill_id=row.skill_id,
                difficulty=row.difficulty,
                learner_level=learner_level,
                mastery_score=float(row.score) if row.score is not None else None,
                last_practiced_at=row.last_practiced_at,
            )
            for row in self.session.execute(statement)
        ]

    def save_recommendation(
        self,
        child_id: UUID,
        triggering_attempt_id: UUID | None,
        ranked: RankedRecommendation,
    ) -> Recommendation:
        record = Recommendation(
            child_id=child_id,
            activity_id=ranked.activity_id,
            triggering_attempt_id=triggering_attempt_id,
            priority_score=Decimal(str(ranked.priority_score)),
            reason_code=ranked.reason_code,
            reason_details=ranked.components,
            algorithm_version=ranked.algorithm_version,
            status=RecommendationStatus.SERVED,
        )
        self.session.add(record)
        self.session.flush()
        return record
