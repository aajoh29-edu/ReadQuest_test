from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ALLOWED_AUDIO_TYPES = {"audio/webm", "audio/wav", "audio/mp3"}


class VoiceConsentUpdate(BaseModel):
    provider: Literal["web_speech"] = "web_speech"
    scope: Literal["read_aloud_assessment"] = "read_aloud_assessment"
    granted: bool
    granted_by: str | None = Field(default=None, max_length=128)


class VoiceConsentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    child_id: str
    provider: str
    scope: str
    granted: bool
    granted_at: datetime
    revoked_at: datetime | None


class ReadAloudSubmission(BaseModel):
    activity_id: str
    transcript: str = Field(min_length=1, max_length=12000)
    word_confidences: list[float] = Field(default_factory=list, max_length=2000)
    duration_seconds: float = Field(gt=0, le=60)
    provider: Literal["web_speech"] = "web_speech"
    audio_content_type: str | None = None
    audio_size_bytes: int | None = Field(default=None, ge=0)

    @field_validator("word_confidences")
    @classmethod
    def confidence_range(cls, values: list[float]) -> list[float]:
        if any(value < 0 or value > 1 for value in values):
            raise ValueError("word confidences must be between 0 and 1")
        return values

    @model_validator(mode="after")
    def validate_audio_limits(self) -> "ReadAloudSubmission":
        if self.audio_content_type is not None and self.audio_content_type not in ALLOWED_AUDIO_TYPES:
            raise ValueError("audio type must be audio/webm, audio/wav, or audio/mp3")
        if self.audio_size_bytes is not None and self.audio_size_bytes > 10 * 1024 * 1024:
            raise ValueError("audio size must not exceed 10 MB")
        return self


class ReadAloudActivityResponse(BaseModel):
    activity_id: str
    title: str
    text_type: str
    text: str
    word_count: int
    difficulty: int


class WordResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    result_index: int
    expected_index: int | None
    expected_word: str | None
    actual_word: str | None
    result_type: str
    confidence: float | None


class VoiceAttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    child_id: str
    activity_id: str
    transcript: str
    accuracy: float
    wcpm: float
    duration_seconds: float
    provider: str
    status: str
    audio_retention: str
    created_at: datetime
    word_results: list[WordResultResponse]
    retry_words: list[str] = Field(default_factory=list)
    is_correct: bool = False


class VoiceProgressPoint(BaseModel):
    voice_attempt_id: str
    created_at: datetime
    activity_id: str
    accuracy: float
    wcpm: float


class VoiceProgressResponse(BaseModel):
    items: list[VoiceProgressPoint]
    attempt_count: int
    average_accuracy: float
    average_wcpm: float


class ReadAloudRecommendation(BaseModel):
    activity_id: str
    skill_id: str
    title: str
    text_type: str
