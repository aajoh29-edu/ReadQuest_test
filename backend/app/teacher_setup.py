"""Administrative commands for provisioning educators and classrooms."""

import argparse
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.account import User
from app.models.curriculum import Learner
from app.models.portal import Classroom, ClassroomEnrollment


def _account(db: Session, email: str) -> User:
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if user is None:
        raise ValueError("Account not found. Register the account first.")
    return user


def _text(value: str, label: str, limit: int) -> str:
    value = value.strip()
    if not value or len(value) > limit:
        raise ValueError(f"{label} must contain 1 to {limit} characters.")
    return value


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Provision teacher access and classroom enrollment as a trusted administrator."
    )
    commands = parser.add_subparsers(dest="command", required=True)

    promote = commands.add_parser("promote-teacher")
    promote.add_argument("--email", required=True)

    create_class = commands.add_parser("create-class")
    create_class.add_argument("--teacher-email", required=True)
    create_class.add_argument("--name", required=True)
    create_class.add_argument("--grade", required=True)
    create_class.add_argument("--school", default="")

    learners = commands.add_parser("list-learners")
    learners.add_argument("--parent-email", required=True)

    enroll = commands.add_parser("enroll")
    enroll.add_argument("--class-id", required=True)
    enroll.add_argument("--learner-id", required=True)

    args = parser.parse_args(argv)
    try:
        with SessionLocal() as db:
            if args.command == "promote-teacher":
                user = _account(db, args.email)
                if not user.email_verified:
                    raise ValueError("Verify the account email before granting teacher access.")
                if user.role not in {"parent", "teacher"}:
                    raise ValueError("Only parent or teacher accounts can be promoted.")
                user.role = "teacher"
                db.commit()
                result = {"userId": user.id, "role": user.role}
            elif args.command == "create-class":
                teacher = _account(db, args.teacher_email)
                if not teacher.email_verified:
                    raise ValueError("Verify the classroom owner's email before creating a classroom.")
                if teacher.role == "parent":
                    raise ValueError(
                        "The classroom owner has the parent role. Run promote-teacher "
                        "with the same email before creating a classroom."
                    )
                if teacher.role not in {"teacher", "admin"}:
                    raise ValueError("The classroom owner must have the teacher or admin role.")
                school = args.school.strip()
                if len(school) > 240:
                    raise ValueError("School name cannot exceed 240 characters.")
                classroom = Classroom(
                    teacher_user_id=teacher.id,
                    name=_text(args.name, "Class name", 240),
                    grade=_text(args.grade, "Grade", 80),
                    school_name=school,
                )
                db.add(classroom)
                db.commit()
                result = {"classId": classroom.id}
            elif args.command == "list-learners":
                parent = _account(db, args.parent_email)
                rows = db.scalars(
                    select(Learner)
                    .where(Learner.parent_user_id == parent.id)
                    .order_by(Learner.display_name, Learner.id)
                )
                result = [{"learnerId": row.id, "name": row.display_name} for row in rows]
            else:
                classroom = db.get(Classroom, args.class_id)
                learner = db.get(Learner, args.learner_id)
                if classroom is None:
                    raise ValueError("Classroom not found.")
                if learner is None:
                    raise ValueError("Learner not found.")
                enrollment = db.get(ClassroomEnrollment, (classroom.id, learner.id))
                if enrollment is None:
                    db.add(ClassroomEnrollment(class_id=classroom.id, learner_id=learner.id))
                    db.commit()
                result = {"classId": classroom.id, "learnerId": learner.id}
            print(json.dumps(result))
    except ValueError as exc:
        parser.exit(2, f"Error: {exc}\n")


if __name__ == "__main__":
    main()
