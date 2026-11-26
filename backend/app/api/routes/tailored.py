from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies import require_session
from app.database import get_db
from app.ml.model import current_model
from app.ml.tailor import tailored_lesson
from app.models.account import AuthSession, User
from app.models.curriculum import Activity, ReadingText
from app.models.enums import ActivityType, ReadingTextType, VoiceProvider
from app.services.learning import require_learner_access

router = APIRouter(tags=["tailored-learning"])


@router.get("/learners/{learner_id}/tailored-lesson")
def get_tailored_lesson(
    learner_id: str,
    size: int = Query(default=5, ge=1, le=10),
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    learner = require_learner_access(db, user, learner_id)
    return tailored_lesson(db, learner, size=size)


@router.get("/ml/model")
def model_info(
    _session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> dict:
    return current_model(db).metadata


@router.get("/read-aloud/capabilities")
def read_aloud_capabilities(db: Session = Depends(get_db)) -> dict:
    """Report what read-aloud support the deployed system really provides."""
    read_aloud_types = [
        ActivityType.READ_ALOUD_WORD,
        ActivityType.READ_ALOUD_SENTENCE,
        ActivityType.READ_ALOUD_PASSAGE,
    ]
    activities = db.scalar(
        select(func.count()).select_from(Activity).where(Activity.type.in_(read_aloud_types))
    )
    texts_by_type = dict(
        db.execute(
            select(ReadingText.text_type, func.count()).group_by(ReadingText.text_type)
        ).all()
    )
    return {
        "readAloud": {
            "supported": bool(activities),
            "activities": activities or 0,
            "textsByType": {
                kind.value: texts_by_type.get(kind, 0) for kind in ReadingTextType
            },
            "providers": [provider.value for provider in VoiceProvider],
        },
        "speechRecognition": {
            "location": "browser",
            "api": "Web Speech API (SpeechRecognition)",
            "note": "Chromium and Safari based browsers only; no server-side ASR is bundled.",
        },
        "serverScoring": {
            "alignment": "word-level edit-distance alignment of the submitted transcript",
            "metrics": ["accuracy", "wcpm", "per-word result type"],
            "audioStored": False,
            "requiresGuardianConsent": True,
        },
        "textToSpeech": {"supported": False},
    }
