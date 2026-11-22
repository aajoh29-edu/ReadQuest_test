# ReadQuest backend

This FastAPI service implements authentication, learner profiles, curriculum,
server-side lesson grading, sessions, mastery analytics, books, read-aloud
assessment, parent/teacher portals, and assignments.

## Local setup

Use Python 3.11 or newer. Run these commands from this `backend` directory.

### Windows PowerShell

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install --only-binary=:all: -r requirements.txt
python -m app.seeds.demo
python -m app
```

On Python 3.15, `--only-binary=:all:` avoids attempting a local
`pydantic-core` build, which Windows Application Control may block.

### macOS/Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m app.seeds.demo
python -m app
```

The API listens on `http://127.0.0.1:8000`. Check
`http://127.0.0.1:8000/docs` for the OpenAPI UI or
`http://127.0.0.1:8000/api/v1/books` for seeded data.

## Database

The default database is `sqlite:///./readquest.db`, relative to the directory
where the backend command is launched. `python -m app.seeds.demo` creates the
tables and imports the checked-in JSON fixtures. It is safe to run repeatedly.

The local seed imports 12 lessons, 60 frontend activities, 16 books, and the
read-aloud fixtures.

For PostgreSQL, set `DATABASE_URL` before running the migration and seed:

```powershell
$env:DATABASE_URL = "postgresql+psycopg://user:password@localhost/readquest"
alembic upgrade head
python -m app.seeds.demo
```

Do not run the migrations against the default SQLite database; the migrations
use PostgreSQL enum and JSONB features.

## Authentication and email configuration

Local development defaults to automatically verifying new accounts so the UI is
immediately usable:

```powershell
$env:READQUEST_AUTO_VERIFY_EMAIL = "true"
```

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

```powershell
python -m pytest -q
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
