import secrets
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.dependencies import current_user, require_roles, transaction_session
from app.api.schemas import (
    ActivityInput,
    ActivityView,
    AttemptInput,
    AttemptView,
    ChildInput,
    ChildView,
    ClassInput,
    ClassStatusInput,
    ClassView,
    JoinInput,
    LessonInput,
    LessonView,
    MasteryView,
    RecommendationView,
    SkillInput,
    SkillView,
    StatusInput,
    UserInput,
    UserView,
)
from app.core.security import hash_password
from app.models.auth import AuthSession
from app.models.curriculum import Activity, ActivitySkill, Lesson, Skill
from app.models.enums import ClassStatus, ContentStatus, EnrollmentStatus, UserRole, UserStatus
from app.models.identity import ChildProfile, Classroom, Enrollment, GuardianChild, User
from app.models.learning import Attempt
from app.repositories.access import AccessRepository
from app.services.adaptive.workflow import SubmitAttemptCommand, submit_attempt
from app.services.learning import (
    activities,
    activity,
    activity_view,
    mastery_views,
    recommend,
    recommendation_view,
)

router = APIRouter(tags=["production"])
admin = require_roles(UserRole.ADMIN)
adult = require_roles(UserRole.PARENT, UserRole.ADMIN)
teacher = require_roles(UserRole.TEACHER, UserRole.ADMIN)
child_role = require_roles(UserRole.CHILD)


def permitted_child(session, user, child_id):
    row = AccessRepository(session).child(user, child_id)
    if row is None:
        raise HTTPException(404, "child not available")
    return row


def create_account(session: Session, payload: UserInput) -> User:
    if session.scalar(select(User.id).where(User.email == str(payload.email).lower())):
        raise HTTPException(409, "account already exists")
    row = User(email=str(payload.email).lower(), password_hash=hash_password(payload.password), role=payload.role)
    session.add(row)
    session.flush()
    if row.role == UserRole.CHILD:
        session.add(ChildProfile(user_id=row.id, display_name=payload.display_name, grade_level=payload.grade_level))
        session.flush()
    return row


@router.get("/children", response_model=list[ChildView])
def children(user: User = Depends(current_user), session: Session = Depends(transaction_session, scope="function")):
    return AccessRepository(session).children(user)


@router.post("/children", response_model=ChildView, status_code=201)
def create_child(payload: ChildInput, user: User = Depends(adult), session: Session = Depends(transaction_session, scope="function")):
    row = create_account(session, UserInput(**payload.model_dump(), role=UserRole.CHILD))
    child = session.scalar(select(ChildProfile).where(ChildProfile.user_id == row.id))
    if user.role == UserRole.PARENT:
        session.add(GuardianChild(guardian_id=user.id, child_id=child.id, relationship_label="guardian"))
    return child


@router.get("/children/{child_id}/progress", response_model=list[MasteryView])
def progress(child_id: UUID, user: User = Depends(current_user), session: Session = Depends(transaction_session, scope="function")):
    permitted_child(session, user, child_id)
    return mastery_views(session, child_id)


@router.post("/children/{child_id}/recommendations", response_model=RecommendationView | None)
def recommendation(child_id: UUID, user: User = Depends(current_user), session: Session = Depends(transaction_session, scope="function")):
    child = permitted_child(session, user, child_id)
    return recommendation_view(session, recommend(session, child.id, child.current_level))


@router.get("/lessons", response_model=list[LessonView])
def lessons(user: User = Depends(current_user), session: Session = Depends(transaction_session, scope="function")):
    return list(session.scalars(select(Lesson).where(Lesson.status == ContentStatus.PUBLISHED).order_by(Lesson.sequence)))


@router.get("/activities", response_model=list[ActivityView])
def list_activities(user: User = Depends(current_user), session: Session = Depends(transaction_session, scope="function")):
    return [activity_view(row) for row in activities(session)]


@router.get("/activities/{activity_id}", response_model=ActivityView)
def get_activity(activity_id: UUID, user: User = Depends(current_user), session: Session = Depends(transaction_session, scope="function")):
    return activity_view(activity(session, activity_id))


@router.post("/attempts", response_model=AttemptView, status_code=201)
def attempt(payload: AttemptInput, user: User = Depends(child_role), session: Session = Depends(transaction_session, scope="function")):
    child = session.scalar(select(ChildProfile).where(ChildProfile.user_id == user.id))
    if child is None:
        raise HTTPException(404, "child profile missing")
    session.execute(select(Activity.id).where(Activity.id == payload.activity_id).with_for_update())
    row = activity(session, payload.activity_id)
    if payload.selected_index >= len(row.content["choices"]):
        raise HTTPException(422, "answer is outside choices")
    correct = payload.selected_index == row.content["correct_index"]
    outcome = submit_attempt(session, SubmitAttemptCommand(child_id=child.id, activity_id=row.id,
        is_correct=correct, response_ms=payload.response_ms, answer={"selected_index": payload.selected_index},
        occurred_at=datetime.now(UTC), learner_level=child.current_level))
    return AttemptView(attempt_id=outcome.attempt.id, is_correct=correct,
        mastery=mastery_views(session, child.id), recommendation=recommendation_view(session, outcome.recommendation))


@router.get("/classes", response_model=list[ClassView])
def classes(user: User = Depends(teacher), session: Session = Depends(transaction_session, scope="function")):
    query = select(Classroom).order_by(Classroom.name)
    if user.role != UserRole.ADMIN:
        query = query.where(Classroom.teacher_id == user.id)
    return list(session.scalars(query))


@router.post("/classes", response_model=ClassView, status_code=201)
def create_class(payload: ClassInput, user: User = Depends(require_roles(UserRole.TEACHER)), session: Session = Depends(transaction_session, scope="function")):
    row = Classroom(teacher_id=user.id, name=payload.name, join_code=secrets.token_hex(8))
    session.add(row)
    session.flush()
    return row


def owned_class(session, user, class_id):
    row = session.get(Classroom, class_id)
    if row is None or (user.role != UserRole.ADMIN and row.teacher_id != user.id):
        raise HTTPException(404, "class not available")
    return row


@router.patch("/classes/{class_id}", response_model=ClassView)
def class_status(class_id: UUID, payload: ClassStatusInput, user: User = Depends(teacher), session: Session = Depends(transaction_session, scope="function")):
    row = owned_class(session, user, class_id)
    row.status = payload.status
    return row


@router.get("/classes/{class_id}/children", response_model=list[ChildView])
def class_children(class_id: UUID, user: User = Depends(teacher), session: Session = Depends(transaction_session, scope="function")):
    room = owned_class(session, user, class_id)
    if room.status != ClassStatus.ACTIVE:
        return []
    return list(session.scalars(select(ChildProfile).join(Enrollment).join(User, User.id == ChildProfile.user_id).where(
        Enrollment.class_id == class_id, Enrollment.status == EnrollmentStatus.ACTIVE,
        User.status == UserStatus.ACTIVE)))


@router.post("/children/{child_id}/enrollments", response_model=ClassView, status_code=201)
def join_class(child_id: UUID, payload: JoinInput, user: User = Depends(adult), session: Session = Depends(transaction_session, scope="function")):
    permitted_child(session, user, child_id)
    classroom = session.scalar(select(Classroom).where(Classroom.join_code == payload.join_code,
        Classroom.status == ClassStatus.ACTIVE))
    if classroom is None:
        raise HTTPException(404, "class not available")
    row = session.get(Enrollment, (classroom.id, child_id))
    if row is None:
        session.add(Enrollment(class_id=classroom.id, child_id=child_id))
    else:
        row.status = EnrollmentStatus.ACTIVE
    return classroom


@router.delete("/classes/{class_id}/children/{child_id}", status_code=204)
def remove_enrollment(class_id: UUID, child_id: UUID, user: User = Depends(current_user), session: Session = Depends(transaction_session, scope="function")):
    if user.role in {UserRole.TEACHER, UserRole.ADMIN}:
        owned_class(session, user, class_id)
    elif user.role == UserRole.PARENT:
        permitted_child(session, user, child_id)
    else:
        raise HTTPException(403, "role not permitted")
    row = session.get(Enrollment, (class_id, child_id))
    if row is None:
        raise HTTPException(404, "enrollment not available")
    row.status = EnrollmentStatus.REMOVED


@router.get("/admin/users", response_model=list[UserView])
def users(user: User = Depends(admin), session: Session = Depends(transaction_session, scope="function")):
    return list(session.scalars(select(User).order_by(User.email)))


@router.post("/admin/users", response_model=UserView, status_code=201)
def add_user(payload: UserInput, user: User = Depends(admin), session: Session = Depends(transaction_session, scope="function")):
    return create_account(session, payload)


@router.patch("/admin/users/{user_id}", response_model=UserView)
def update_user(user_id: UUID, payload: StatusInput, user: User = Depends(admin), session: Session = Depends(transaction_session, scope="function")):
    if user_id == user.id:
        raise HTTPException(409, "cannot change your own status")
    row = session.scalar(select(User).where(User.id == user_id).with_for_update())
    if row is None:
        raise HTTPException(404, "account not available")
    row.status = payload.status
    session.execute(delete(AuthSession).where(AuthSession.user_id == row.id))
    return row


@router.get("/admin/skills", response_model=list[SkillView])
def skills(user: User = Depends(admin), session: Session = Depends(transaction_session, scope="function")):
    return list(session.scalars(select(Skill).order_by(Skill.code)))


@router.post("/admin/skills", response_model=SkillView, status_code=201)
def create_skill(payload: SkillInput, user: User = Depends(admin), session: Session = Depends(transaction_session, scope="function")):
    row = Skill(**payload.model_dump())
    session.add(row)
    session.flush()
    return row


@router.put("/admin/skills/{skill_id}", response_model=SkillView)
def update_skill(skill_id: UUID, payload: SkillInput, user: User = Depends(admin), session: Session = Depends(transaction_session, scope="function")):
    row = session.get(Skill, skill_id)
    if row is None:
        raise HTTPException(404, "skill not available")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    return row


@router.get("/admin/lessons", response_model=list[LessonView])
def admin_lessons(user: User = Depends(admin), session: Session = Depends(transaction_session, scope="function")):
    return list(session.scalars(select(Lesson).order_by(Lesson.sequence)))


@router.post("/admin/lessons", response_model=LessonView, status_code=201)
def create_lesson(payload: LessonInput, user: User = Depends(admin), session: Session = Depends(transaction_session, scope="function")):
    row = Lesson(**payload.model_dump())
    session.add(row)
    session.flush()
    return row


@router.put("/admin/lessons/{lesson_id}", response_model=LessonView)
def update_lesson(lesson_id: UUID, payload: LessonInput, user: User = Depends(admin), session: Session = Depends(transaction_session, scope="function")):
    row = session.get(Lesson, lesson_id)
    if row is None:
        raise HTTPException(404, "lesson not available")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    return row


@router.get("/admin/activities", response_model=list[ActivityView])
def admin_activities(user: User = Depends(admin), session: Session = Depends(transaction_session, scope="function")):
    return [activity_view(row, answer_key=True) for row in activities(session, include_drafts=True)]


def save_activity(session, payload, row=None):
    lesson = session.get(Lesson, payload.lesson_id)
    mapped = [session.get(Skill, link.skill_id) for link in payload.skills]
    if lesson is None or any(s is None for s in mapped):
        raise HTTPException(422, "unknown lesson or skill")
    if payload.status == ContentStatus.PUBLISHED and (
        lesson.status != ContentStatus.PUBLISHED or any(s.status != ContentStatus.PUBLISHED for s in mapped)):
        raise HTTPException(422, "publish the lesson and skills first")
    values = payload.model_dump(exclude={"skills"}, exclude_none=True)
    if row is not None and session.scalar(select(Attempt.id).where(Attempt.activity_id == row.id).limit(1)):
        if any(getattr(row, key) != value for key, value in values.items() if key != "status"):
            raise HTTPException(409, "This activity has answers. Archive it and create a new one.")
        # Mapping changes are also forbidden once evidence exists.
        old = {(link.skill_id, link.weight) for link in row.skill_links}
        if old != {(link.skill_id, link.weight) for link in payload.skills}:
            raise HTTPException(409, "This activity has answers. Its reading skills cannot be changed.")
        row.status = payload.status
        return row
    if row is None:
        row = Activity(**values)
        session.add(row)
    else:
        for key, value in values.items():
            setattr(row, key, value)
        row.skill_links.clear()
        session.flush()
    session.flush()
    row.skill_links = [ActivitySkill(skill_id=link.skill_id, weight=link.weight) for link in payload.skills]
    session.flush()
    return row


@router.post("/admin/activities", response_model=ActivityView, status_code=201)
def create_activity(payload: ActivityInput, user: User = Depends(admin), session: Session = Depends(transaction_session, scope="function")):
    return activity_view(save_activity(session, payload), answer_key=True)


@router.put("/admin/activities/{activity_id}", response_model=ActivityView)
def update_activity(activity_id: UUID, payload: ActivityInput, user: User = Depends(admin), session: Session = Depends(transaction_session, scope="function")):
    row = session.scalar(select(Activity).where(Activity.id == activity_id).with_for_update())
    if row is None:
        raise HTTPException(404, "activity not available")
    return activity_view(save_activity(session, payload, row), answer_key=True)
