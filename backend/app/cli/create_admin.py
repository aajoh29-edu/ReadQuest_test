"""Provision an initial administrator explicitly; never runs during API startup."""
import getpass
import os

from pydantic import EmailStr, TypeAdapter
from sqlalchemy import select

import app.models.curriculum  # noqa: F401
import app.models.learning  # noqa: F401
from app.core.security import hash_password
from app.db.session import SessionFactory
from app.models.enums import UserRole
from app.models.identity import User


def main() -> None:
    email = str(TypeAdapter(EmailStr).validate_python(input("Administrator email: ").strip().lower()))
    password = os.environ.get("READQUEST_BOOTSTRAP_PASSWORD") or getpass.getpass("Password (12–128 characters): ")
    if not 12 <= len(password) <= 128:
        raise ValueError("password must contain 12–128 characters")
    with SessionFactory.begin() as session:
        if session.scalar(select(User.id).where(User.email == email)):
            raise ValueError("account already exists; use account administration")
        session.add(User(email=email, role=UserRole.ADMIN, password_hash=hash_password(password)))
    print("Administrator created.")


if __name__ == "__main__":
    main()
