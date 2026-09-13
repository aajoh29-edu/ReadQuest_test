"""SQLAlchemy model package.

Import concrete model modules explicitly where complete metadata registration
is required (for example, in Alembic's env.py). Keeping this initializer light
also lets the pure adaptive engine import shared enums without loading the ORM.
"""
