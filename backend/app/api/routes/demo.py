from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db_session
from app.models.curriculum import Activity, ActivitySkill
from app.models.enums import ContentStatus
from app.seeds.demo import uid
from app.services.adaptive.workflow import SubmitAttemptCommand, submit_attempt

DEMO_CHILD_ID = uid(10)
DEMO_LEARNER_LEVEL = 2

router = APIRouter(prefix="/demo", tags=["demo"])


class ActivitySkillResponse(BaseModel):
    id: UUID
    code: str
    name: str
    category: str
    level: int


class ActivityResponse(BaseModel):
    id: UUID
    title: str
    prompt: str
    activity_type: str
    difficulty: int
    sequence: int
    content: dict[str, Any]
    skills: list[ActivitySkillResponse]


class SubmitAttemptRequest(BaseModel):
    activity_id: UUID
    is_correct: bool
    selected_index: int | None = Field(default=None, ge=0)
    response_ms: int | None = Field(default=None, ge=0, le=3_600_000)


class MasteryResponse(BaseModel):
    skill_id: UUID
    score: float
    band: str
    confidence: str
    attempt_count: int


class RecommendationResponse(BaseModel):
    id: UUID
    activity_id: UUID
    priority_score: float
    reason_code: str
    reason_details: dict[str, Any]
    algorithm_version: str


class SubmitAttemptResponse(BaseModel):
    attempt_id: UUID
    mastery: list[MasteryResponse]
    recommendation: RecommendationResponse | None


def _activity_response(activity: Activity) -> ActivityResponse:
    return ActivityResponse(
        id=activity.id,
        title=activity.title,
        prompt=activity.prompt,
        activity_type=activity.activity_type.value,
        difficulty=activity.difficulty,
        sequence=activity.sequence,
        content=activity.content,
        skills=[
            ActivitySkillResponse(
                id=link.skill.id,
                code=link.skill.code,
                name=link.skill.name,
                category=link.skill.category,
                level=link.skill.level,
            )
            for link in activity.skill_links
        ],
    )


@router.get("/activities", response_model=list[ActivityResponse])
def list_demo_activities(session: Session = Depends(get_db_session)) -> list[ActivityResponse]:
    statement = (
        select(Activity)
        .options(selectinload(Activity.skill_links).selectinload(ActivitySkill.skill))
        .where(Activity.status == ContentStatus.PUBLISHED)
        .order_by(Activity.sequence, Activity.title)
    )
    return [_activity_response(activity) for activity in session.scalars(statement)]


@router.post("/attempts", response_model=SubmitAttemptResponse)
def submit_demo_attempt(
    payload: SubmitAttemptRequest,
    session: Session = Depends(get_db_session),
) -> SubmitAttemptResponse:
    answer = {"selected_index": payload.selected_index} if payload.selected_index is not None else None
    try:
        with session.begin():
            if session.get(Activity, payload.activity_id) is None:
                raise HTTPException(status_code=404, detail="activity not found")
            outcome = submit_attempt(
                session,
                SubmitAttemptCommand(
                    child_id=DEMO_CHILD_ID,
                    activity_id=payload.activity_id,
                    is_correct=payload.is_correct,
                    response_ms=payload.response_ms,
                    answer=answer,
                    occurred_at=datetime.now(UTC),
                    learner_level=DEMO_LEARNER_LEVEL,
                ),
            )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    recommendation = None
    if outcome.recommendation is not None:
        recommendation = RecommendationResponse(
            id=outcome.recommendation.id,
            activity_id=outcome.recommendation.activity_id,
            priority_score=float(outcome.recommendation.priority_score),
            reason_code=outcome.recommendation.reason_code,
            reason_details=outcome.recommendation.reason_details,
            algorithm_version=outcome.recommendation.algorithm_version,
        )

    return SubmitAttemptResponse(
        attempt_id=outcome.attempt.id,
        mastery=[
            MasteryResponse(
                skill_id=record.skill_id,
                score=float(record.score),
                band=record.band.value,
                confidence=record.confidence.value,
                attempt_count=record.attempt_count,
            )
            for record in outcome.mastery_records
        ],
        recommendation=recommendation,
    )
