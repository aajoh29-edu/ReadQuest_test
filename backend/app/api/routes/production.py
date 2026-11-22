from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.curriculum import Book, ChildBook, Learner
from app.models.enums import ChildBookStatus, ContentStatus
from app.schemas.books import (
    BookDetail,
    BookPageResponse,
    BookProgressResponse,
    BookProgressUpdate,
)

router = APIRouter(tags=["books"])


@router.get("/books", response_model=BookPageResponse)
def list_books(
    level: int | None = Query(default=None, ge=1, le=10),
    category: str | None = Query(default=None, max_length=120),
    q: str | None = Query(default=None, max_length=240),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> BookPageResponse:
    filters = [Book.content_status == ContentStatus.PUBLISHED]
    if level is not None:
        filters.append(Book.level == level)
    if category:
        filters.append(Book.category == category)
    if q:
        term = f"%{q.strip()}%"
        filters.append(
            (Book.title.ilike(term))
            | (Book.author.ilike(term))
            | (Book.category.ilike(term))
        )
    query = select(Book).where(*filters).order_by(Book.level, Book.title)
    total = db.scalar(select(func.count()).select_from(Book).where(*filters)) or 0
    books = db.scalars(query.offset(offset).limit(limit)).all()
    return BookPageResponse(items=books, total=total, limit=limit, offset=offset)


@router.get("/books/{book_id}", response_model=BookDetail)
def get_book(book_id: str, db: Session = Depends(get_db)) -> BookDetail:
    book = db.scalar(
        select(Book).where(
            and_(Book.id == book_id, Book.content_status == ContentStatus.PUBLISHED)
        )
    )
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")
    return BookDetail.model_validate(book)


@router.post(
    "/children/{child_id}/books/{book_id}/progress",
    response_model=BookProgressResponse,
)
def update_book_progress(
    child_id: str,
    book_id: str,
    update: BookProgressUpdate,
    db: Session = Depends(get_db),
) -> BookProgressResponse:
    book = db.scalar(
        select(Book).where(
            and_(Book.id == book_id, Book.content_status == ContentStatus.PUBLISHED)
        )
    )
    child = db.get(Learner, child_id)
    if book is None or child is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Child or published book not found."
        )

    page_count = len(book.content.get("pages", []))
    if update.last_page > page_count:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"last_page cannot exceed {page_count}.",
        )

    progress = db.get(ChildBook, (child_id, book_id))
    was_finished = progress is not None and progress.status == ChildBookStatus.FINISHED
    if progress is None:
        progress = ChildBook(child_id=child_id, book_id=book_id)
    progress.status = ChildBookStatus(update.status)
    progress.last_page = update.last_page
    progress.minutes_read = update.minutes_read
    progress.finished_at = (
        datetime.now(UTC)
        if progress.status == ChildBookStatus.FINISHED
        else None
    )

    stars_awarded = 0
    if progress.status == ChildBookStatus.FINISHED and not was_finished:
        progress.last_page = page_count
        child.stars_earned += 1
        stars_awarded = 1

    db.add(progress)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Book progress could not be saved."
        ) from exc
    db.refresh(progress)
    response = BookProgressResponse.model_validate(progress)
    response.stars_awarded = stars_awarded
    return response
