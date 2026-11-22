# ReadQuest backend

## Windows setup

On Python 3.15, force prebuilt dependency wheels. This prevents `pip` from
building `pydantic-core` with Rust, which can be blocked by Windows Application
Control when it runs a temporary compiler executable.

```powershell
py -m pip install --only-binary=:all: -r requirements.txt
```

Run the backend from this directory:

```powershell
py -m app
```

The demo seed reads only the checked-in JSON fixtures:

```powershell
py -m app.seeds.demo
py -m app.seeds.demo
```

The default local database is `sqlite:///./readquest.db`. Set `DATABASE_URL`
to a PostgreSQL URL when running the Alembic migrations.

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
