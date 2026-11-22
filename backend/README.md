# ReadQuest backend

This FastAPI service implements authentication, learner profiles, curriculum,
server-side lesson grading, sessions, mastery analytics, books, read-aloud
assessment, parent/teacher portals, and assignments.

## Docker setup

Run the Docker workflow from the repository root; host Python is not required:

```bash
cp .env.example .env
make up
make seed
```

The API listens on `http://127.0.0.1:8000`. Check
`http://127.0.0.1:8000/health`, `http://127.0.0.1:8000/docs`, or
`http://127.0.0.1:8000/api/v1/books`.

## Database

PostgreSQL is the supported Docker database. Compose runs Alembic migrations in
the separate `migrate` service before FastAPI starts. Seed data is loaded only
when `make seed` runs; it imports 12 lessons, 60 frontend activities, 16 books,
and all read-aloud fixtures. The seed is idempotent.

## Authentication and email configuration

Local development defaults to automatically verifying new accounts so the UI is
immediately usable. Set backend configuration in the root `.env`, not in a host
shell.

For production-like email verification and password reset, set
`READQUEST_AUTO_VERIFY_EMAIL=false` and configure:

```text
READQUEST_FRONTEND_URL=https://app.example.org
SMTP_HOST=smtp.example.org
SMTP_PORT=587
SMTP_FROM=readquest@example.org
SMTP_USERNAME=...
SMTP_PASSWORD=...
```

Set `READQUEST_COOKIE_SECURE=true` behind HTTPS. Registration always creates a
`parent`; promote teacher/admin users through a controlled administrative or
database onboarding process rather than accepting roles from client requests.

## Tests

```bash
make test
```

For the complete frontend and backend launch sequence, see the main
[`README.md`](../README.md).

## Browser voice attempts

`POST /api/v1/children/{child_id}/voice-consent` grants or revokes
`web_speech` / `read_aloud_assessment` consent for a child. Without an active
grant, read-aloud submission returns `403` before any attempt is written.

The browser sends only a transcript, per-word confidence values, and elapsed
seconds to `POST /api/v1/children/{child_id}/read-aloud`. This phase hard-codes
`audio_retention=none`; no audio upload endpoint or audio file is created.
Optional audio metadata is still limited to 60 seconds, 10 MB, and
`audio/webm`, `audio/wav`, or `audio/mp3`.

Adult detail, trend, recommendation, and deletion endpoints are:

- `GET /api/v1/children/{child_id}/read-aloud/{voice_attempt_id}`
- `GET /api/v1/children/{child_id}/voice-progress`
- `GET /api/v1/children/{child_id}/read-aloud-recommendation`
- `DELETE /api/v1/children/{child_id}/read-aloud/{voice_attempt_id}`
