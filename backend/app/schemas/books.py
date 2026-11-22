from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Attribution(BaseModel):
    source_title: str
    creator_credits: list[str]
    copyright_notice: str
    edition_url: str | None
    license_url: str | None
    reformatting_note: str
    sourcing_notes: list[str]


class BookPage(BaseModel):
    page_number: int = Field(ge=1)
    sentences: list[str]


class BookContent(BaseModel):
    pages: list[BookPage]


class BookListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    author: str
    level: int
    category: str
    word_count: int
    cover_url: str | None
    source: str


class BookDetail(BookListItem):
    content: BookContent
    attribution: Attribution


class BookPageResponse(BaseModel):
    items: list[BookListItem]
    total: int
    limit: int
    offset: int


class BookProgressUpdate(BaseModel):
    status: Literal["started", "finished", "favorite"]
    last_page: int = Field(default=0, ge=0)
    minutes_read: int = Field(default=0, ge=0)


class BookProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    child_id: str
    book_id: str
    status: str
    last_page: int
    minutes_read: int
    started_at: datetime
    finished_at: datetime | None
    stars_awarded: int = 0
