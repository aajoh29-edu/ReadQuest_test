from enum import StrEnum


class UserRole(StrEnum):
    CHILD = "child"
    PARENT = "parent"
    TEACHER = "teacher"
    ADMIN = "admin"


class UserStatus(StrEnum):
    ACTIVE = "active"
    DISABLED = "disabled"
    PENDING = "pending"


class ClassStatus(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class EnrollmentStatus(StrEnum):
    ACTIVE = "active"
    REMOVED = "removed"


class ContentStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ActivityType(StrEnum):
    MULTIPLE_CHOICE = "multiple_choice"
    WORD_MATCH = "word_match"
    READ_AND_ANSWER = "read_and_answer"


class MasteryBand(StrEnum):
    HIGH_PRIORITY = "high_priority"
    ADDITIONAL_PRACTICE = "additional_practice"
    NORMAL_REVIEW = "normal_review"
    MASTERED = "mastered"


class MasteryConfidence(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RecommendationStatus(StrEnum):
    SERVED = "served"
    ACCEPTED = "accepted"
    DISMISSED = "dismissed"
    EXPIRED = "expired"
