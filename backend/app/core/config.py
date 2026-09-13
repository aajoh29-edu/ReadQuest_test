from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed settings with a READQUEST_ prefix."""

    model_config = SettingsConfigDict(
        env_prefix="READQUEST_",
        env_file=".env",
        extra="ignore",
    )

    app_name: str = "ReadQuest API"
    app_version: str = "0.1.0"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://readquest:readquest@localhost:5432/readquest"
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    """Create settings once per process; tests can clear the cache."""
    return Settings()
