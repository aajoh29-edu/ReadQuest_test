import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator

# Fetch the database URL from the environment (defaulting to the test stack)
# SQLAlchemy requires the +asyncpg driver prefix for asynchronous PostgreSQL connections
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://readquest_test:test_password@localhost:5432/readquest_test_db"
)

# Fix common URL formatting: if a standard postgresql:// URL is provided (e.g., by PaaS providers),
# convert it to use the asyncpg driver automatically.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Create the async engine. 
# pool_pre_ping=True checks connection health before checking out a connection from the pool.
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True to log raw SQL queries during debugging
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Create a highly concurrent, thread-safe session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for your SQLAlchemy ORM models
Base = declarative_base()

# FastAPI Dependency
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function to provide an isolated database session per request.
    Ensures the session is safely closed after the request completes or if an error occurs.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
