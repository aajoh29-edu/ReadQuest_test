from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import require_current_user, require_session
from app.api.routes.auth import learner_payload, owned_learners
from app.database import get_db
from app.models.account import AuthSession, User
from app.models.curriculum import Learner
from app.models.portal import Assignment, AssignmentTarget, Classroom, ClassroomEnrollment
from app.schemas.accounts import ParentProfileUpdate
from app.schemas.learning import AssignmentCompleteRequest, AssignmentRequest
from app.services.curriculum import find_lesson
from app.services.learning import mastery_payloads, progress_summary

router = APIRouter(tags=["portals"])


def _require_teacher(user: User) -> None:
    if user.role not in {"teacher", "admin"}:
        raise HTTPException(status_code=403, detail="Educator access is required.")


def _classroom(user: User, class_id: str, db: Session) -> Classroom:
    _require_teacher(user)
    item = db.get(Classroom, class_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Classroom not found.")
    if user.role != "admin" and item.teacher_user_id != user.id:
        raise HTTPException(status_code=403, detail="Classroom access denied.")
    return item


def _assignment_payload(db: Session, item: Assignment) -> dict:
    completed = list(
        db.scalars(
            select(AssignmentTarget).where(
                AssignmentTarget.assignment_id == item.id,
                AssignmentTarget.completed_at.is_not(None),
            )
        )
    )
    lesson = find_lesson(item.lesson_id)
    completed_ids = [row.learner_id for row in completed]
    return {
        "id": item.id,
        "title": item.title,
        "classId": item.class_id,
        "teacherId": item.teacher_user_id,
        "lessonId": item.lesson_id,
        "lessonTitle": lesson["title"] if lesson else item.lesson_id,
        "skillId": item.skill_id,
        "assignedLearnerIds": list(item.assigned_learner_ids or []),
        "completedLearnerIds": completed_ids,
        "dueDate": item.due_date.isoformat() if item.due_date else None,
        "instructions": item.instructions,
        "createdAt": item.created_at.isoformat(),
        "status": "completed"
        if set(completed_ids) == set(item.assigned_learner_ids or [])
        and completed_ids
        else "pending",
    }


@router.get("/parent/profile")
def parent_profile(
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    children = owned_learners(db, user.id)
    return {
        "id": user.id,
        "name": user.full_name,
        "email": user.email,
        "childrenIds": [item.id for item in children],
        "practiceGoalMinutesPerDay": user.practice_goal_minutes_per_day,
    }


@router.patch("/parent/profile")
def update_parent_profile(
    payload: ParentProfileUpdate,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    if payload.name is not None:
        user.full_name = payload.name.strip()
    if payload.practice_goal_minutes_per_day is not None:
        user.practice_goal_minutes_per_day = payload.practice_goal_minutes_per_day
    db.commit()
    db.refresh(user)
    return parent_profile((user, session_data[1]), db)


@router.get("/parent/learners")
def parent_learners(
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> list[dict]:
    user, _ = session_data
    return [learner_payload(item) for item in owned_learners(db, user.id)]


@router.get("/teacher/profile")
def teacher_profile(
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    _require_teacher(user)
    classes = list(
        db.scalars(select(Classroom).where(Classroom.teacher_user_id == user.id))
    )
    return {
        "id": user.id,
        "name": user.full_name,
        "email": user.email,
        "schoolName": classes[0].school_name if classes else "",
        "classIds": [item.id for item in classes],
    }


@router.get("/teacher/classes")
def teacher_classes(
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> list[dict]:
    user, _ = session_data
    _require_teacher(user)
    statement = select(Classroom)
    if user.role != "admin":
        statement = statement.where(Classroom.teacher_user_id == user.id)
    classes = list(db.scalars(statement))
    enrollments = list(db.scalars(select(ClassroomEnrollment)))
    return [
        {
            "id": item.id,
            "name": item.name,
            "grade": item.grade,
            "teacherId": item.teacher_user_id,
            "studentIds": [
                enrollment.learner_id
                for enrollment in enrollments
                if enrollment.class_id == item.id
            ],
        }
        for item in classes
    ]


@router.get("/teacher/classes/{class_id}/learners")
def class_learners(
    class_id: str,
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> list[dict]:
    user, _ = session_data
    _classroom(user, class_id, db)
    learners = list(
        db.scalars(
            select(Learner)
            .join(ClassroomEnrollment, ClassroomEnrollment.learner_id == Learner.id)
            .where(ClassroomEnrollment.class_id == class_id)
            .order_by(Learner.display_name)
        )
    )
    return [learner_payload(item) for item in learners]


@router.get("/teacher/classes/{class_id}/mastery-matrix")
def mastery_matrix(
    class_id: str,
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> list[dict]:
    user, _ = session_data
    _classroom(user, class_id, db)
    learners = list(
        db.scalars(
            select(Learner)
            .join(ClassroomEnrollment, ClassroomEnrollment.learner_id == Learner.id)
            .where(ClassroomEnrollment.class_id == class_id)
        )
    )
    result = []
    for learner in learners:
        mastery = mastery_payloads(db, learner)
        progress = progress_summary(db, learner.id)
        result.append(
            {
                "learner": learner_payload(learner),
                "skillsMastery": {item["skillId"]: item for item in mastery},
                "overallAccuracy": round(progress["averageAccuracy"] * 100, 2),
                "totalQuestsCompleted": progress["totalLessonsCompleted"],
                "totalActiveMinutes": progress["totalActivePracticeSeconds"] / 60,
            }
        )
    return result


@router.get("/assignments")
def assignments(
    classId: str | None = Query(default=None),
    learnerId: str | None = Query(default=None),
    session_data: tuple[User, AuthSession] = Depends(require_session),
    db: Session = Depends(get_db),
) -> list[dict]:
    user, _ = session_data
    statement = select(Assignment)
    if classId:
        _classroom(user, classId, db)
        statement = statement.where(Assignment.class_id == classId)
    elif user.role in {"teacher", "admin"}:
        if user.role != "admin":
            statement = statement.where(Assignment.teacher_user_id == user.id)
    else:
        learner_ids = [item.id for item in owned_learners(db, user.id)]
        items = [
            item
            for item in db.scalars(statement)
            if any(learner_id in (item.assigned_learner_ids or []) for learner_id in learner_ids)
        ]
        return [
            _assignment_payload(db, item)
            for item in items
            if learnerId is None or learnerId in (item.assigned_learner_ids or [])
        ]
    items = list(db.scalars(statement))
    if learnerId:
        items = [item for item in items if learnerId in (item.assigned_learner_ids or [])]
    return [_assignment_payload(db, item) for item in items]


@router.post("/assignments", status_code=201)
def create_assignment(
    payload: AssignmentRequest,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    _require_teacher(user)
    if find_lesson(payload.lesson_id) is None:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    if payload.class_id:
        classroom = _classroom(user, payload.class_id, db)
        enrolled = {
            row.learner_id
            for row in db.scalars(
                select(ClassroomEnrollment).where(
                    ClassroomEnrollment.class_id == classroom.id
                )
            )
        }
        if not set(payload.assigned_learner_ids).issubset(enrolled):
            raise HTTPException(status_code=403, detail="Assignment contains an unenrolled learner.")
    due_date = datetime.fromisoformat(payload.due_date.replace("Z", "+00:00")) if payload.due_date else None
    assignment = Assignment(
        class_id=payload.class_id,
        teacher_user_id=user.id,
        lesson_id=payload.lesson_id,
        title=payload.title,
        skill_id=payload.skill_id,
        due_date=due_date,
        instructions=payload.instructions,
        assigned_learner_ids=list(payload.assigned_learner_ids),
    )
    db.add(assignment)
    db.flush()
    db.add_all(
        [
            AssignmentTarget(assignment_id=assignment.id, learner_id=learner_id)
            for learner_id in payload.assigned_learner_ids
        ]
    )
    db.commit()
    db.refresh(assignment)
    return _assignment_payload(db, assignment)


@router.post("/assignments/{assignment_id}/complete")
def complete_assignment(
    assignment_id: str,
    payload: AssignmentCompleteRequest,
    session_data: tuple[User, AuthSession] = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> dict:
    user, _ = session_data
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    learner = db.get(Learner, payload.learner_id)
    if learner is None or learner.parent_user_id != user.id:
        raise HTTPException(status_code=403, detail="Learner access denied.")
    if payload.learner_id not in (assignment.assigned_learner_ids or []):
        raise HTTPException(status_code=403, detail="Learner is not assigned.")
    target = db.get(AssignmentTarget, (assignment_id, payload.learner_id))
    if target is None:
        target = AssignmentTarget(
            assignment_id=assignment_id, learner_id=payload.learner_id
        )
        db.add(target)
    target.completed_at = target.completed_at or datetime.now(UTC)
    db.commit()
    return _assignment_payload(db, assignment)
