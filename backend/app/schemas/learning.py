from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class SessionRequest(ApiModel):
    lesson_id: str = Field(alias="lessonId")
    learner_id: str = Field(alias="learnerId")


class AttemptRequest(ApiModel):
    activity_id: str = Field(alias="activityId")
    selected_option_id: str = Field(alias="selectedOptionId")
    idempotency_key: str | None = Field(default=None, alias="idempotencyKey", max_length=128)
    active_duration_seconds: float = Field(alias="activeDurationSeconds", ge=0, le=86400)


class AssignmentRequest(ApiModel):
    title: str = Field(min_length=1, max_length=240)
    class_id: str | None = Field(default=None, alias="classId")
    teacher_id: str | None = Field(default=None, alias="teacherId")
    lesson_id: str = Field(alias="lessonId")
    lesson_title: str = Field(alias="lessonTitle")
    skill_id: str | None = Field(default=None, alias="skillId")
    assigned_learner_ids: list[str] = Field(alias="assignedLearnerIds")
    due_date: str | None = Field(default=None, alias="dueDate")
    instructions: str | None = None


class AssignmentCompleteRequest(ApiModel):
    learner_id: str = Field(alias="learnerId")
