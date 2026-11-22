from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class RegisterRequest(ApiModel):
    full_name: str = Field(alias="fullName", min_length=2, max_length=60)
    email: str = Field(max_length=320)
    password: str = Field(min_length=10, max_length=512)
    accepted_policies: bool = Field(alias="acceptedPolicies")


class CredentialsRequest(ApiModel):
    email: str
    password: str


class PasswordRequest(BaseModel):
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(ApiModel):
    token: str
    new_password: str = Field(alias="newPassword", min_length=10, max_length=512)


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: str


class ChangePasswordRequest(ApiModel):
    current_password: str = Field(alias="currentPassword")
    new_password: str = Field(alias="newPassword", min_length=10, max_length=512)


class UserResponse(ApiModel):
    id: str
    full_name: str = Field(serialization_alias="fullName")
    email: str
    role: str
    email_verified: bool = Field(serialization_alias="emailVerified")
    created_at: str = Field(serialization_alias="createdAt")
    practice_goal_minutes_per_day: int = Field(
        serialization_alias="practiceGoalMinutesPerDay"
    )


class LearnerRequest(ApiModel):
    name: str = Field(min_length=2, max_length=24)
    avatar: str = Field(max_length=80)
    avatar_name: str = Field(alias="avatarName", max_length=120)
    reading_level_id: str = Field(alias="readingLevelId")
    grade_level: str = Field(alias="gradeLevel", max_length=80)


class LearnerUpdateRequest(ApiModel):
    name: str | None = Field(default=None, min_length=2, max_length=24)
    avatar: str | None = Field(default=None, max_length=80)
    avatar_name: str | None = Field(default=None, alias="avatarName", max_length=120)
    reading_level_id: str | None = Field(default=None, alias="readingLevelId")
    grade_level: str | None = Field(default=None, alias="gradeLevel", max_length=80)


class LearnerResponse(ApiModel):
    id: str
    name: str
    avatar: str
    avatar_name: str = Field(serialization_alias="avatarName")
    reading_level_id: str = Field(serialization_alias="readingLevelId")
    grade_level: str = Field(serialization_alias="gradeLevel")
    stars_earned: int = Field(serialization_alias="starsEarned")
    current_streak_days: int = Field(serialization_alias="currentStreakDays")
    badges: list[str]
    total_active_practice_seconds: float = Field(
        serialization_alias="totalActivePracticeSeconds"
    )
    last_active_lesson_id: str | None = Field(
        default=None, serialization_alias="lastActiveLessonId"
    )


class ActiveLearnerRequest(ApiModel):
    learner_id: str = Field(alias="learnerId")


class ParentProfileUpdate(ApiModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    practice_goal_minutes_per_day: int | None = Field(
        default=None,
        alias="practiceGoalMinutesPerDay",
        ge=5,
        le=240,
    )
