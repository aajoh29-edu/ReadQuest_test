from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# This connects to localhost with widely-known demo credentials. It exists only
# so a bare `uvicorn app.main:app` works during local development without an
# .env file. It must never reach a production deployment; see the guard below.
_INSECURE_DEV_DATABASE_URL = (
    "postgresql+psycopg://readquest:readquest@localhost:5432/readquest"
)


class Settings(BaseSettings):
    """Environment-backed settings with a READQUEST_ prefix."""

    model_config = SettingsConfigDict(
        env_prefix="READQUEST_",
        env_file=".env",
        extra="ignore",
        populate_by_name=True,
    )

    app_name: str = "ReadQuest API"
    app_version: str = "0.1.0"
    environment: str = Field(default="development", validation_alias=AliasChoices("READQUEST_ENV", "READQUEST_ENVIRONMENT"))
    database_url: str = _INSECURE_DEV_DATABASE_URL
    log_level: str = "INFO"
    session_hours: int = Field(default=8, ge=1, le=24)
    allowed_origins: list[str] = ["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5173", "http://127.0.0.1:5173"]

    def model_post_init(self, __context: object) -> None:
        """Fail fast rather than silently run production on dev defaults.

        `compose.production.yaml` already requires `READQUEST_DATABASE_URL` to
        be set, but that guard is bypassed if the API image is ever run
        directly (outside Compose). This check is a second, independent line
        of defense against deploying with a well-known local password.
        """
        if "*" in self.allowed_origins:
            raise ValueError("explicit allowed origins are required")
        if self.environment == "production" and any(not o.startswith("https://") for o in self.allowed_origins):
            raise ValueError("production origins must use HTTPS")
        if self.environment == "production" and (
            self.database_url == _INSECURE_DEV_DATABASE_URL
            or "readquest:readquest@" in self.database_url
        ):
            raise ValueError(
                "READQUEST_DATABASE_URL must be set explicitly when "
                "READQUEST_ENV=production; refusing to start with the "
                "local-development default credentials."
            )


@lru_cache
def get_settings() -> Settings:
    """Create settings once per process; tests can clear the cache."""
    return Settings()
