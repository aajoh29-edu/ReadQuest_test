"""Build the training corpus from the live ReadQuest database.

Only curriculum content is used (activities, read-aloud texts and books).
Child transcripts, attempts text and account data never enter the language model.
"""

import re
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.curriculum import Activity, Book, ReadingText
from app.models.enums import ActivityType, ContentStatus
from app.utils.tokenizer import tokenize_text

READ_ALOUD_TYPES = {
    ActivityType.READ_ALOUD_WORD,
    ActivityType.READ_ALOUD_SENTENCE,
    ActivityType.READ_ALOUD_PASSAGE,
}
TEXT_FIELDS = (
    "passageTitle",
    "passageText",
    "prompt",
    "contextSentenceWithBlank",
    "targetSightWord",
    "blendedTarget",
)
SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")


@dataclass(frozen=True)
class Document:
    id: str
    kind: str  # "activity" | "book"
    skill_id: str | None
    level: float  # difficulty normalised to 0..1 by authors' own scale
    sentences: list[list[str]]

    @property
    def tokens(self) -> list[str]:
        return [word for sentence in self.sentences for word in sentence]


def sentences_of(text: str) -> list[list[str]]:
    parts = (part for part in SENTENCE_SPLIT.split(text) if part)
    return [tokens for part in parts if (tokens := tokenize_text(part))]


def normalised_level(activity: Activity) -> float:
    scale = 10 if activity.type in READ_ALOUD_TYPES else 3
    return min(1.0, max(0.0, activity.difficulty / scale))


def _activity_text(activity: Activity, reading_text: ReadingText | None) -> str:
    if reading_text is not None:
        return reading_text.text
    content = activity.content or {}
    return "\n".join(str(content[key]) for key in TEXT_FIELDS if content.get(key))


def build_documents(db: Session) -> list[Document]:
    texts = {
        item.activity_id: item for item in db.scalars(select(ReadingText))
    }
    documents: list[Document] = []
    for activity in db.scalars(select(Activity).order_by(Activity.id)):
        if (activity.content or {}).get("publicationStatus", "published") != "published":
            continue
        sentences = sentences_of(_activity_text(activity, texts.get(activity.id)))
        if sentences:
            documents.append(
                Document(
                    id=f"activity:{activity.id}",
                    kind="activity",
                    skill_id=activity.primary_skill_id,
                    level=normalised_level(activity),
                    sentences=sentences,
                )
            )
    books = db.scalars(
        select(Book)
        .where(Book.content_status == ContentStatus.PUBLISHED)
        .order_by(Book.id)
    )
    for book in books:
        sentences = [
            tokens
            for page in book.content.get("pages", [])
            for sentence in page.get("sentences", [])
            if (tokens := tokenize_text(sentence))
        ]
        if sentences:
            documents.append(
                Document(
                    id=f"book:{book.id}",
                    kind="book",
                    skill_id=None,
                    level=min(1.0, book.level / 10),
                    sentences=sentences,
                )
            )
    return documents
