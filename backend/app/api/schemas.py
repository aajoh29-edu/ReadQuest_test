from datetime import datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, model_validator

from app.models.enums import ActivityType, ClassStatus, ContentStatus, UserRole, UserStatus

Text80 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
Text160 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
Password = Annotated[str, Field(min_length=12, max_length=128)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LoginInput(Input):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class PasswordInput(Input):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: Password


class UserView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: str
    role: UserRole
    status: UserStatus


class UserInput(Input):
    email: EmailStr
    password: Password
    role: UserRole
    display_name: Text80 | None = None
    grade_level: int | None = Field(default=None, ge=0, le=12)

    @model_validator(mode="after")
    def child_name(self):
        if self.role == UserRole.CHILD and not self.display_name:
            raise ValueError("a child requires a display name")
        return self


class ChildInput(Input):
    email: EmailStr
    password: Password
    display_name: Text80
    grade_level: int | None = Field(default=None, ge=0, le=12)


class StatusInput(Input):
    status: UserStatus


class ChildView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    display_name: str
    grade_level: int | None
    current_level: int


class ClassInput(Input):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


class ClassStatusInput(Input):
    status: ClassStatus


class JoinInput(Input):
    join_code: str = Field(min_length=1, max_length=20)


class ClassView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    join_code: str
    status: ClassStatus


class SkillInput(Input):
    code: Annotated[str, StringConstraints(pattern=r"^[A-Z][A-Z0-9_]{0,49}$")]
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    category: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]
    level: int = Field(ge=1, le=10)
    status: ContentStatus = ContentStatus.DRAFT


class SkillView(SkillInput):
    model_config = ConfigDict(from_attributes=True)
    id: UUID


class LessonInput(Input):
    title: Text160
    description: str | None = Field(default=None, max_length=5000)
    sequence: int = Field(ge=0)
    status: ContentStatus = ContentStatus.DRAFT


class LessonView(LessonInput):
    model_config = ConfigDict(from_attributes=True)
    id: UUID


class SkillWeight(Input):
    skill_id: UUID
    weight: Decimal = Field(gt=0, le=1, decimal_places=3)


class Content(Input):
    choices: list[Annotated[str, StringConstraints(min_length=1, max_length=500)]] = Field(min_length=2, max_length=8)
    correct_index: int = Field(ge=0)
    passage: str | None = Field(default=None, max_length=10000)

    @model_validator(mode="after")
    def valid_answer(self):
        if self.correct_index >= len(self.choices):
            raise ValueError("correct_index is outside choices")
        return self


class ActivityInput(Input):
    lesson_id: UUID
    title: Text160
    activity_type: ActivityType
    prompt: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]
    content: Content
    difficulty: int = Field(ge=1, le=10)
    sequence: int = Field(ge=0)
    status: ContentStatus = ContentStatus.DRAFT
    skills: list[SkillWeight] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def weights(self):
        if len({s.skill_id for s in self.skills}) != len(self.skills):
            raise ValueError("duplicate skills")
        if sum(s.weight for s in self.skills) != Decimal("1"):
            raise ValueError("skill weights must sum to one")
        if self.activity_type == ActivityType.READ_AND_ANSWER and not self.content.passage:
            raise ValueError("read-and-answer requires a passage")
        return self


class ActivityView(BaseModel):
    id: UUID
    lesson_id: UUID
    title: str
    activity_type: ActivityType
    prompt: str
    content: dict
    difficulty: int
    sequence: int
    status: ContentStatus
    skills: list[SkillView]
    skill_weights: list[SkillWeight]


class AttemptInput(Input):
    activity_id: UUID
    selected_index: int = Field(ge=0, le=7, strict=True)
    response_ms: int | None = Field(default=None, ge=0, le=3_600_000)


class MasteryView(BaseModel):
    skill_id: UUID
    skill_name: str
    score: float
    band: str
    confidence: str
    attempt_count: int
    last_practiced_at: datetime | None


class RecommendationView(BaseModel):
    activity: ActivityView
    priority_score: float
    reason_code: str
    explanation: str
    reason_details: dict


class AttemptView(BaseModel):
    attempt_id: UUID
    is_correct: bool
    mastery: list[MasteryView]
    recommendation: RecommendationView | None
