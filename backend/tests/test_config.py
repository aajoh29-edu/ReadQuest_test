from unittest import TestCase

import pytest

from app.core.config import Settings


class SettingsProductionGuardTests(TestCase):
    """The insecure local-development database default must never reach production.

    `compose.production.yaml` already requires `READQUEST_DATABASE_URL` via
    `:?Set READQUEST_DATABASE_URL`, but `Settings` enforces the same rule
    independently so the API also refuses to start if it is ever run outside
    Compose (for example, invoking the container image directly).
    """

    def test_development_keeps_the_convenience_default(self) -> None:
        settings = Settings(_env_file=None, environment="development")
        self.assertIn("localhost", settings.database_url)

    def test_production_without_an_explicit_database_url_is_rejected(self) -> None:
        with pytest.raises(ValueError):
            Settings(_env_file=None, environment="production")

    def test_production_with_an_explicit_database_url_is_accepted(self) -> None:
        settings = Settings(
            _env_file=None,
            environment="production",
            allowed_origins=["https://reading.example.org"],
            database_url="postgresql+psycopg://app:strong-secret@prod-host:5432/readquest",
        )
        self.assertEqual(settings.environment, "production")
