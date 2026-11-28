from itertools import combinations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.curriculum import Activity, Skill

VARIED_ACTIVITY_PREFIX = "varied-"


class DatabaseContentProvider:
    def __init__(self, session: Session):
        self.session = session
        self.sources: dict[str, Activity] = {}
        self.difficulties: dict[str, int] = {}
        self.items_by_skill: dict[str, list[dict]] = {}

    def get_items_for_skill(self, skill_code: str) -> list[dict]:
        if skill_code in self.items_by_skill:
            return self.items_by_skill[skill_code].copy()

        activities = self.session.scalars(
            select(Activity)
            .join(Skill, Skill.id == Activity.primary_skill_id)
            .where(Skill.code == skill_code, ~Activity.id.startswith(VARIED_ACTIVITY_PREFIX))
            .order_by(Activity.id)
        )
        items = []
        for activity in activities:
            content = activity.content
            if content.get("publicationStatus") != "published":
                continue
            options = content.get("options", [])
            correct = [option["label"] for option in options if option.get("isCorrect")]
            if len(correct) != 1 or not content.get("prompt"):
                continue
            wrong = dict.fromkeys(option["label"] for option in options if not option.get("isCorrect"))
            wrong.pop(correct[0], None)
            for distractors in combinations(wrong, 2):
                items.append({
                    "template": "{prompt}",
                    "context": {"prompt": content["prompt"]},
                    "correct": correct[0],
                    "distractors": distractors,
                    "source_id": activity.id,
                })
                self.sources[activity.id] = activity
                self.difficulties.setdefault(skill_code, activity.difficulty)
        self.items_by_skill[skill_code] = items
        return items.copy()

    def get_skill_difficulty(self, skill_code: str) -> int:
        return self.difficulties[skill_code]
