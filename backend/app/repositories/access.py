from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import ClassStatus, EnrollmentStatus, UserRole, UserStatus
from app.models.identity import ChildProfile, Classroom, Enrollment, GuardianChild, User


class AccessRepository:
    def __init__(self, session: Session):
        self.session = session

    def children(self, user: User) -> list[ChildProfile]:
        statement = select(ChildProfile).join(User, User.id == ChildProfile.user_id).where(
            User.status == UserStatus.ACTIVE)
        if user.role == UserRole.CHILD:
            statement = statement.where(ChildProfile.user_id == user.id)
        elif user.role == UserRole.PARENT:
            statement = statement.join(GuardianChild, GuardianChild.child_id == ChildProfile.id).where(GuardianChild.guardian_id == user.id)
        elif user.role == UserRole.TEACHER:
            statement = statement.join(Enrollment, Enrollment.child_id == ChildProfile.id).join(Classroom, Classroom.id == Enrollment.class_id).where(
                Classroom.teacher_id == user.id, Classroom.status == ClassStatus.ACTIVE,
                Enrollment.status == EnrollmentStatus.ACTIVE)
        return list(self.session.scalars(statement.distinct().order_by(ChildProfile.display_name)))

    def child(self, user: User, child_id: UUID) -> ChildProfile | None:
        return next((c for c in self.children(user) if c.id == child_id), None)
