from enum import StrEnum


class BookSource(StrEnum):
    ORIGINAL = "original"
    PUBLIC_DOMAIN = "public_domain"
    LICENSED_EDITION = "licensed_edition"


class ReadingTextType(StrEnum):
    WORD = "word"
    SENTENCE = "sentence"
    PASSAGE = "passage"


class ActivityType(StrEnum):
    MULTIPLE_CHOICE_SOUND = "multiple_choice_sound"
    PHONICS_BLENDING = "phonics_blending"
    SIGHT_WORD_CLOZE = "sight_word_cloze"
    READING_COMPREHENSION = "reading_comprehension"
    READ_ALOUD_WORD = "read_aloud_word"
    READ_ALOUD_SENTENCE = "read_aloud_sentence"
    READ_ALOUD_PASSAGE = "read_aloud_passage"


class ContentStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ChildBookStatus(StrEnum):
    STARTED = "started"
    FINISHED = "finished"
    FAVORITE = "favorite"


class VoiceProvider(StrEnum):
    WEB_SPEECH = "web_speech"


class VoiceScope(StrEnum):
    READ_ALOUD_ASSESSMENT = "read_aloud_assessment"


class VoiceAttemptStatus(StrEnum):
    COMPLETED = "completed"
    REJECTED = "rejected"


class WordResultType(StrEnum):
    CORRECT = "correct"
    SUBSTITUTION = "substitution"
    OMISSION = "omission"
    INSERTION = "insertion"
    SELF_CORRECTION = "self_correction"
