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
the separate `migrate` service before FastAPI starts. `make seed` loads the
development database with 12 lessons, 60 frontend activities, 16 books, and
read-aloud fixtures. The seed is idempotent but updates records with matching
fixture IDs. For the separate production-like database, see the opt-in seed
and connectivity checks in the [main README](../README.md#production-like-local-run).

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

## Teacher and classroom setup

These commands are for a trusted administrator with access to the development
database, not for learners or public users. Run them from the repository root
after `make up` and `make seed`. For another environment, use its own backend
container and database connection instead.

1. Register a separate account using **Teacher Account Setup** on the sign-in
   page (`http://localhost:8080/signup?account=teacher`) and verify its email if
   email verification is enabled. The teacher must contact an administrator;
   the form does not send an approval request. Promote that account:

   ```bash
   docker compose exec backend python -m app.teacher_setup promote-teacher --email teacher@example.org
   ```

   Promotion changes the account's role from `parent` to `teacher`; it does not
   create an account or grant the parent dashboard role.

2. Create a classroom and save the `classId` in the output:

   ```bash
   docker compose exec backend python -m app.teacher_setup create-class --teacher-email teacher@example.org --name "Room 1" --grade "Grade 1" --school "Example School"
   ```

3. A parent creates a child profile in **Account**. With the appropriate
   authorization to enroll that child, find its `learnerId` and enroll it:

   ```bash
   docker compose exec backend python -m app.teacher_setup list-learners --parent-email parent@example.org
   docker compose exec backend python -m app.teacher_setup enroll --class-id CLASS_ID --learner-id LEARNER_ID
   ```

   Repeat for each learner. Repeating an enrollment is safe.

4. Sign in as the teacher and open `http://localhost:8080/teacher`. Select the
   class and create a quest under **Assignments**. The parent selects the child
   and starts the assigned quest from the learner dashboard.

When the learner answers every activity and completes the quest, the backend
marks all pending assignments for that learner and lesson complete, including
assignments from different classes. It does not award completion for a partial
quest or for assignments created afterward. Reload the teacher dashboard to see
the updated **Student Completion** count and percentage. Existing completed
sessions are not backfilled; learners must finish a new quest to update
previously pending assignments. The existing assignment completion API remains
available for explicit completion by the learner's account owner.

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
