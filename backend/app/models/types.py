from enum import Enum

from sqlalchemy import Enum as SQLAlchemyEnum


def database_enum[EnumType: Enum](enum_class: type[EnumType], name: str) -> SQLAlchemyEnum:
    """Persist enum values such as 'active', not Python member names such as 'ACTIVE'."""
    return SQLAlchemyEnum(
        enum_class,
        name=name,
        values_callable=lambda members: [member.value for member in members],
        validate_strings=True,
    )
