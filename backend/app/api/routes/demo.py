from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.curriculum import Activity

router = APIRouter(prefix="/demo", tags=["demo"])


class DemoAttemptRequest(BaseModel):
    activity_id: str
    selected_option_id: str


def _public_activity(activity: Activity) -> dict:
    content = {
        **activity.content,
        "options": [
            {key: value for key, value in option.items() if key != "isCorrect"}
            for option in activity.content.get("options", [])
        ],
    }
    return {
        "id": activity.id,
        "primarySkillId": activity.primary_skill_id,
        "type": activity.type.value,
        "difficulty": activity.difficulty,
        "content": content,
    }


@router.get("/activities")
def demo_activities(db: Session = Depends(get_db)) -> list[dict]:
    activities = db.scalars(
        select(Activity).order_by(Activity.id).limit(12)
    ).all()
    return [_public_activity(activity) for activity in activities if activity.content.get("options")]


@router.post("/attempts")
def demo_attempt(
    payload: DemoAttemptRequest, db: Session = Depends(get_db)
) -> dict[str, object]:
    activity = db.get(Activity, payload.activity_id)
    if activity is None:
        raise HTTPException(status_code=404, detail="Activity not found.")
    options = activity.content.get("options", [])
    selected = next(
        (option for option in options if option.get("id") == payload.selected_option_id),
        None,
    )
    expected = next((option for option in options if option.get("isCorrect")), None)
    if selected is None or expected is None:
        raise HTTPException(status_code=422, detail="Selected option is not valid.")
    return {
        "activityId": activity.id,
        "selectedOptionId": payload.selected_option_id,
        "isCorrect": selected["id"] == expected["id"],
        "explanation": activity.content.get("explanation"),
    }
