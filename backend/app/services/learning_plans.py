"""Persistence and audit operations for adaptive learning plans."""

from dataclasses import asdict
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from app.models.curriculum import Activity, ActivitySkill, Skill
from app.models.enums import (
    LearningPlanItemStatus,
    LearningPlanItemType,
    LearningPlanStatus,
)
from app.models.identity import ChildProfile
from app.models.learning import LearningPlan, LearningPlanEvent, LearningPlanItem, SkillMastery
from app.repositories.adaptive import AdaptiveRepository
from app.services.adaptive.learning_plan import SkillPlanInput, generate_learning_plan


def active_plan(session: Session, child_id: UUID, *, lock: bool = False) -> LearningPlan | None:
    statement = (
        select(LearningPlan)
        .options(
            selectinload(LearningPlan.items)
            .selectinload(LearningPlanItem.activity)
            .selectinload(Activity.skill_links)
            .selectinload(ActivitySkill.skill),
            selectinload(LearningPlan.events),
        )
        .where(
            LearningPlan.child_id == child_id,
            LearningPlan.status == LearningPlanStatus.ACTIVE,
        )
    )
    if lock:
        statement = statement.with_for_update()
    return session.scalar(statement)


def _plan_inputs(
    session: Session, child: ChildProfile, *, now: datetime
) -> list[SkillPlanInput]:
    candidates = AdaptiveRepository(session).recommendation_candidates(
        child.id,
        learner_level=child.current_level,
        now=now,
        cooldown_hours=0,
    )
    candidates_by_skill: dict[UUID, list] = {}
    for candidate in candidates:
        candidates_by_skill.setdefault(candidate.skill_id, []).append(candidate)

    rows = session.execute(
        select(Skill, SkillMastery)
        .join(SkillMastery, SkillMastery.skill_id == Skill.id)
        .where(SkillMastery.child_id == child.id)
        .order_by(Skill.code)
    )
    return [
        SkillPlanInput(
            skill_id=skill.id,
            skill_code=skill.code,
            band=mastery.band,
            score=float(mastery.score),
            last_practiced_at=mastery.last_practiced_at,
            activities=tuple(candidates_by_skill.get(skill.id, [])),
        )
        for skill, mastery in rows
    ]


def regeneration_trigger(plan: LearningPlan, inputs: list[SkillPlanInput], *, now: datetime) -> str | None:
    if all(
        item.status in {LearningPlanItemStatus.COMPLETED, LearningPlanItemStatus.SKIPPED}
        for item in plan.items
    ) and plan.items:
        return "items_completed"

    previous = {
        item["skill_code"]: item["band"]
        for item in plan.focus_summary
        if "skill_code" in item and "band" in item
    }
    if any(
        item.skill_code in previous and previous[item.skill_code] != item.band.value
        for item in inputs
    ):
        return "band_changed"
    created_at = plan.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=UTC)
    if now - created_at >= timedelta(days=7):
        return "stale_plan"
    return None


def generate_plan(
    session: Session,
    child: ChildProfile,
    *,
    generated_by: str,
    reason: str,
    now: datetime | None = None,
    force: bool = False,
) -> LearningPlan:
    calculation_time = now or datetime.now(UTC)
    if calculation_time.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    session.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
        {"key": f"learning-plan:{child.id}"},
    )
    current = active_plan(session, child.id, lock=True)
    inputs = _plan_inputs(session, child, now=calculation_time)
    if current is not None and not force:
        reason = regeneration_trigger(current, inputs, now=calculation_time) or reason
    elif current is not None:
        reason = reason or "refresh_requested"

    draft = generate_learning_plan(inputs, now=calculation_time)
    if not draft.items:
        raise ValueError("no eligible plan activities")

    if current is not None:
        current.status = LearningPlanStatus.ARCHIVED
        session.add(
            LearningPlanEvent(
                plan_id=current.id,
                event_type=reason,
                details={
                    "reason": reason,
                    "generated_at": calculation_time.isoformat(),
                },
            )
        )
        session.flush()

    plan = LearningPlan(
        child_id=child.id,
        status=LearningPlanStatus.ACTIVE,
        generated_by=generated_by,
        algorithm_version=draft.algorithm_version,
        focus_summary=[asdict(item) | {"band": item.band.value} for item in draft.focus_summary],
        starts_on=calculation_time.date(),
        target_ends_on=(calculation_time + timedelta(days=7)).date(),
    )
    session.add(plan)
    session.flush()
    for item in draft.items:
        session.add(
            LearningPlanItem(
                plan_id=plan.id,
                item_type=LearningPlanItemType.ACTIVITY,
                activity_id=item.activity_id,
                sequence=item.sequence,
                target_score=Decimal(str(item.target_score)),
            )
        )
    session.add(
        LearningPlanEvent(
            plan_id=plan.id,
            event_type="plan_generated",
            details={"reason": reason, "item_count": len(draft.items)},
        )
    )
    session.flush()
    return active_plan(session, child.id) or plan


def ensure_current_plan(
    session: Session,
    child: ChildProfile,
    *,
    generated_by: str,
    now: datetime | None = None,
) -> LearningPlan | None:
    current = active_plan(session, child.id)
    if current is None:
        return None
    calculation_time = now or datetime.now(UTC)
    reason = regeneration_trigger(current, _plan_inputs(session, child, now=calculation_time), now=calculation_time)
    if reason is None:
        return current
    return generate_plan(
        session,
        child,
        generated_by=generated_by,
        reason=reason,
        now=calculation_time,
        force=True,
    )


def complete_targeted_item(
    session: Session,
    child_id: UUID,
    activity_id: UUID,
    mastery_records: tuple[SkillMastery, ...],
    *,
    plan_id: UUID | None = None,
    item_id: UUID | None = None,
) -> LearningPlanItem | None:
    statement = (
        select(LearningPlanItem)
        .join(LearningPlan, LearningPlan.id == LearningPlanItem.plan_id)
        .where(
            LearningPlan.child_id == child_id,
            LearningPlan.status == LearningPlanStatus.ACTIVE,
            LearningPlanItem.activity_id == activity_id,
            LearningPlanItem.status.in_(
                [LearningPlanItemStatus.PENDING, LearningPlanItemStatus.IN_PROGRESS]
            ),
        )
        .with_for_update()
        .order_by(LearningPlanItem.sequence)
    )
    if plan_id is not None:
        statement = statement.where(LearningPlan.id == plan_id)
    if item_id is not None:
        statement = statement.where(LearningPlanItem.id == item_id)
    item = session.scalar(statement)
    if item is None:
        return None

    plan = session.get(LearningPlan, item.plan_id)
    focus_codes = {
        row["skill_code"] for row in plan.focus_summary if "skill_code" in row
    }
    linked_skills = list(
        session.execute(
            select(Skill.id, Skill.code)
            .join(ActivitySkill, ActivitySkill.skill_id == Skill.id)
            .where(ActivitySkill.activity_id == activity_id)
            .order_by(Skill.code)
        )
    )
    intended_skill_id = next(
        (
            row.id
            for row in linked_skills
            if row.code in focus_codes
        ),
        None,
    )
    if intended_skill_id is None and linked_skills:
        intended_skill_id = linked_skills[0].id
    qualifying = [
        mastery
        for mastery in mastery_records
        if mastery.skill_id == intended_skill_id
        and item.target_score is not None
        and mastery.score >= item.target_score
    ]
    if not qualifying:
        return None

    item.status = LearningPlanItemStatus.COMPLETED
    session.add(
        LearningPlanEvent(
            plan_id=item.plan_id,
            event_type="item_completed",
            details={
                "item_id": str(item.id),
                "activity_id": str(activity_id),
                "skill_ids": [str(mastery.skill_id) for mastery in qualifying],
                "target_score": str(item.target_score),
            },
        )
    )
    session.flush()
    return item


def complete_item(
    session: Session,
    child_id: UUID,
    plan_id: UUID,
    item_id: UUID,
) -> LearningPlanItem:
    item = session.scalar(
        select(LearningPlanItem)
        .join(LearningPlan, LearningPlan.id == LearningPlanItem.plan_id)
        .where(
            LearningPlan.child_id == child_id,
            LearningPlan.id == plan_id,
            LearningPlan.status == LearningPlanStatus.ACTIVE,
            LearningPlanItem.id == item_id,
        )
        .with_for_update()
    )
    if item is None:
        raise LookupError("learning plan item not available")
    mastery_records = tuple(
        session.scalars(
            select(SkillMastery)
            .join(ActivitySkill, ActivitySkill.skill_id == SkillMastery.skill_id)
            .where(
                SkillMastery.child_id == child_id,
                ActivitySkill.activity_id == item.activity_id,
            )
        )
    )
    completed = complete_targeted_item(
        session,
        child_id,
        item.activity_id,
        mastery_records,
        plan_id=plan_id,
        item_id=item_id,
    )
    if completed is None:
        raise ValueError("learning plan target has not been met")
    return completed
