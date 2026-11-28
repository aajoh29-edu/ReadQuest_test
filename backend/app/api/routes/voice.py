from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, desc, select
from sqlalchemy.orm import Session

from app.api.dependencies import require_current_user, require_session
from app.db import get_db
from app.models.account import AuthSession, User
from app.models.curriculum import Activity, Learner, ReadingText
from app.models.enums import (
    ActivityType,
    VoiceAttemptStatus,
    VoiceProvider,
    VoiceScope,
    WordResultType,
)
from app.models.progress import Attempt, SkillMastery
from app.models.voice import VoiceAttempt, VoiceConsent, WordResult
from app.schemas.voice import (
    ReadAloudActivityResponse,
    ReadAloudRecommendation,
    ReadAloudSubmission,
    VoiceAttemptResponse,
    VoiceConsentResponse,
    VoiceConsentUpdate,
    VoiceProgressPoint,
    VoiceProgressResponse,
)
from app.services.attempts import mastery_score, submit_attempt
from app.services.voice import align_words, score_alignment
from app.services.learning import require_learner_access

router = APIRouter(tags=["voice"])


def _active_consent(
    db: Session, child_id: str, provider: VoiceProvider, scope: VoiceScope
) -> VoiceConsent | None:
    return db.scalar(
        select(VoiceConsent).where(
            VoiceConsent.child_id == child_id,
            VoiceConsent.provider == provider,
            VoiceConsent.scope == scope,
            VoiceConsent.granted.is_(True),
            VoiceConsent.revoked_at.is_(None),
        )
    )


def _voice_response(attempt: VoiceAttempt) -> VoiceAttemptResponse:
    retry_words = list(
        dict.fromkeys(
            result.expected_word
            for result in attempt.word_results
            if result.result_type != WordResultType.CORRECT
            and result.expected_word is not None
        )
    )
    response = VoiceAttemptResponse.model_validate(attempt)
    response.retry_words = retry_words
    response.is_correct = (
        attempt.accuracy
        >= (
            0.85
            if db_value(attempt, "text_type") == "word"
            else 0.80
        )
    )
    return response


def db_value(attempt: VoiceAttempt, key: str):
    if key == "text_type":
        return attempt.__dict__.get("_text_type", "passage")
    return getattr(attempt, key)


def _load_voice_attempt(
    db: Session, child_id: str, voice_attempt_id: str
) -> VoiceAttempt:
    attempt = db.scalar(
        select(VoiceAttempt)
        .where(
            VoiceAttempt.id == voice_attempt_id,
            VoiceAttempt.child_id == child_id,
        )
    )
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voice attempt not found.")
    text_type = db.scalar(
        select(ReadingText.text_type).where(
            ReadingText.id == attempt.reading_text_id
        )
    )
    setattr(attempt, "_text_type", text_type.value if text_type else "passage")
    return attempt


@router.post(
    "/children/{child_id}/voice-consent", response_model=VoiceConsentResponse
)
def set_voice_consent(
    child_id: str,
    update: VoiceConsentUpdate,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> VoiceConsentResponse:
    user, _ = session_data
    require_learner_access(db, user, child_id)
    child = db.get(Learner, child_id)
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found.")
    provider = VoiceProvider(update.provider)
    scope = VoiceScope(update.scope)
    consent = db.scalar(
        select(VoiceConsent).where(
            VoiceConsent.child_id == child_id,
            VoiceConsent.provider == provider,
            VoiceConsent.scope == scope,
        )
    )
    if consent is None:
        consent = VoiceConsent(
            child_id=child_id,
            provider=provider,
            scope=scope,
            granted=False,
        )
        db.add(consent)
    consent.granted = update.granted
    consent.granted_by = update.granted_by
    consent.granted_at = datetime.now(UTC)
    consent.revoked_at = None if update.granted else datetime.now(UTC)
    db.commit()
    db.refresh(consent)
    return VoiceConsentResponse.model_validate(consent)


@router.get(
    "/read-aloud-activities/{activity_id}", response_model=ReadAloudActivityResponse
)
def get_read_aloud_activity(
    activity_id: str, db: Session = Depends(get_db)
) -> ReadAloudActivityResponse:
    activity, reading_text = db.execute(
        select(Activity, ReadingText).join(
            ReadingText, ReadingText.activity_id == Activity.id
        ).where(Activity.id == activity_id)
    ).one_or_none() or (None, None)
    if activity is None or reading_text is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Read-aloud activity not found.")
    return ReadAloudActivityResponse(
        activity_id=activity.id,
        title=f"{reading_text.text_type.value.title()} practice",
        text_type=reading_text.text_type.value,
        text=reading_text.text,
        word_count=reading_text.word_count,
        difficulty=reading_text.level,
    )


@router.post(
    "/children/{child_id}/read-aloud",
    response_model=VoiceAttemptResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_read_aloud(
    child_id: str,
    submission: ReadAloudSubmission,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> VoiceAttemptResponse:
    user, _ = session_data
    require_learner_access(db, user, child_id)
    provider = VoiceProvider(submission.provider)
    scope = VoiceScope.READ_ALOUD_ASSESSMENT
    consent = _active_consent(db, child_id, provider, scope)
    if consent is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active guardian voice consent is required.",
        )

    child = db.get(Learner, child_id)
    activity = db.get(Activity, submission.activity_id)
    reading_text = (
        db.scalar(
            select(ReadingText).where(
                ReadingText.activity_id == submission.activity_id
            )
        )
        if activity is not None
        else None
    )
    if child is None or activity is None or reading_text is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child or read-aloud activity not found.",
        )
    if activity.type not in {
        ActivityType.READ_ALOUD_WORD,
        ActivityType.READ_ALOUD_SENTENCE,
        ActivityType.READ_ALOUD_PASSAGE,
    }:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Activity is not a read-aloud activity.",
        )

    alignment = align_words(
        reading_text.expected_words,
        submission.transcript,
        submission.word_confidences,
    )
    accuracy, wcpm, _, _ = score_alignment(
        reading_text.expected_words, alignment, submission.duration_seconds
    )
    threshold = 0.85 if reading_text.text_type.value == "word" else 0.80
    is_correct = accuracy >= threshold

    attempt = VoiceAttempt(
        id=uuid4().hex,
        child_id=child_id,
        activity_id=activity.id,
        reading_text_id=reading_text.id,
        transcript=submission.transcript,
        word_confidences=submission.word_confidences,
        accuracy=accuracy,
        wcpm=wcpm,
        duration_seconds=submission.duration_seconds,
        provider=provider,
        status=VoiceAttemptStatus.COMPLETED,
        audio_retention="none",
    )
    db.add(attempt)
    db.flush()
    attempt.word_results = [
        WordResult(
            voice_attempt_id=attempt.id,
            result_index=index,
            expected_index=result.expected_index,
            expected_word=result.expected_word,
            actual_word=result.actual_word,
            result_type=result.result_type,
            confidence=result.confidence,
        )
        for index, result in enumerate(alignment)
    ]
    mastery_attempt = submit_attempt(
        db,
        child_id=child_id,
        activity_id=activity.id,
        is_correct=is_correct,
        answer={
            "voice_attempt_id": attempt.id,
            "accuracy": accuracy,
            "wcpm": wcpm,
        },
        active_duration_seconds=submission.duration_seconds,
    )
    attempt.mastery_attempt_id = mastery_attempt.id
    db.commit()
    db.refresh(attempt)
    setattr(attempt, "_text_type", reading_text.text_type.value)
    return _voice_response(attempt)


@router.get(
    "/children/{child_id}/read-aloud/{voice_attempt_id}",
    response_model=VoiceAttemptResponse,
)
def get_voice_attempt(
    child_id: str,
    voice_attempt_id: str,
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> VoiceAttemptResponse:
    user, _ = session_data
    require_learner_access(db, user, child_id)
    return _voice_response(_load_voice_attempt(db, child_id, voice_attempt_id))


@router.get(
    "/children/{child_id}/voice-progress", response_model=VoiceProgressResponse
)
def get_voice_progress(
    child_id: str,
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> VoiceProgressResponse:
    user, _ = session_data
    require_learner_access(db, user, child_id)
    attempts = db.scalars(
        select(VoiceAttempt)
        .where(VoiceAttempt.child_id == child_id)
        .order_by(VoiceAttempt.created_at)
    ).all()
    items = [
        VoiceProgressPoint(
            voice_attempt_id=attempt.id,
            created_at=attempt.created_at,
            activity_id=attempt.activity_id,
            accuracy=attempt.accuracy,
            wcpm=attempt.wcpm,
        )
        for attempt in attempts
    ]
    count = len(items)
    return VoiceProgressResponse(
        items=items,
        attempt_count=count,
        average_accuracy=sum(item.accuracy for item in items) / count if count else 0,
        average_wcpm=sum(item.wcpm for item in items) / count if count else 0,
    )


@router.delete(
    "/children/{child_id}/read-aloud/{voice_attempt_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_voice_attempt(
    child_id: str,
    voice_attempt_id: str,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> None:
    user, _ = session_data
    require_learner_access(db, user, child_id)
    attempt = _load_voice_attempt(db, child_id, voice_attempt_id)
    mastery_attempt_id = attempt.mastery_attempt_id
    mastery_skill_id = db.scalar(
        select(Activity.primary_skill_id).where(Activity.id == attempt.activity_id)
    )
    db.delete(attempt)
    if mastery_attempt_id:
        db.execute(delete(Attempt).where(Attempt.id == mastery_attempt_id))
    if mastery_skill_id:
        remaining = db.scalars(
            select(Attempt)
            .where(Attempt.child_id == child_id, Attempt.skill_id == mastery_skill_id)
            .order_by(desc(Attempt.attempted_at))
            .limit(10)
        ).all()
        mastery = db.get(SkillMastery, (child_id, mastery_skill_id))
        if mastery is not None:
            if remaining:
                score, accuracy = mastery_score(remaining)
                mastery.accuracy = accuracy
                mastery.score = score
                mastery.window_attempt_count = len(remaining)
                mastery.total_attempt_count = max(0, mastery.total_attempt_count - 1)
            else:
                db.delete(mastery)
    db.commit()


@router.get(
    "/children/{child_id}/read-aloud-recommendation",
    response_model=ReadAloudRecommendation,
)
def get_read_aloud_recommendation(
    child_id: str,
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> ReadAloudRecommendation:
    user, _ = session_data
    require_learner_access(db, user, child_id)
    weakest = db.scalar(
        select(SkillMastery.skill_id)
        .where(SkillMastery.child_id == child_id)
        .order_by(SkillMastery.score, SkillMastery.updated_at.desc())
    )
    query = (
        select(Activity, ReadingText)
        .join(ReadingText, ReadingText.activity_id == Activity.id)
        .where(
            Activity.type.in_(
                [
                    ActivityType.READ_ALOUD_WORD,
                    ActivityType.READ_ALOUD_SENTENCE,
                    ActivityType.READ_ALOUD_PASSAGE,
                ]
            )
        )
        .order_by(Activity.id)
    )
    if weakest:
        matching = db.execute(query.where(Activity.primary_skill_id == weakest)).first()
        if matching:
            activity, reading_text = matching
        else:
            row = db.execute(query).first()
            if row is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No read-aloud activities are available.",
                )
            activity, reading_text = row
    else:
        row = db.execute(query).first()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No read-aloud activities are available.",
            )
        activity, reading_text = row
    return ReadAloudRecommendation(
        activity_id=activity.id,
        skill_id=activity.primary_skill_id,
        title=f"{reading_text.text_type.value.title()} practice",
        text_type=reading_text.text_type.value,
    )
