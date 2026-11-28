# ReadQuest

**ReadQuest** is an adaptive children's literacy web application built with React, TypeScript, Vite, and Tailwind CSS. It combines structured phonics, word blending, sight word fluency, and reading comprehension adventures for young readers with parent-managed child profiles, deterministic skill mastery tracking, and educator classroom insights.

> **Architecture Status:** The repository includes a complete local full-stack application: React/Vite plus a FastAPI/SQLAlchemy backend. The backend implements cookie-based authentication, learner profiles, the 12-quest curriculum, server-side grading, sessions, mastery, books, read-aloud assessment, parent/teacher portals, and assignments. Production email delivery and HTTPS/session secrets remain deployment configuration rather than hard-coded development defaults.

## Table of contents

- [Production deployment](#production-deployment)
- [Administrator and account setup](#administrator-and-account-setup)
- [Container operations and troubleshooting](#container-operations-and-troubleshooting)
- [Development and testing](#development-and-testing)
- [Security and privacy notes](#security-and-privacy-notes)
- [Key features](#key-features)
- [Tech stack](#tech-stack)
- [Application routes](#application-routes)
- [Project structure](#project-structure)
- [Documentation](#documentation)

## Production deployment

Run every command from the repository root in Linux or WSL Ubuntu. The default ports below assume no overrides in `.env`. This is a production-image **local deployment**; Internet-facing deployment requires the additional security configuration below.

<a id="production-like-local-run"></a>

### 1. Verify prerequisites

Install Docker Engine or Docker Desktop with WSL integration, Docker Compose v2 and GNU Make. Host Node.js, Python and PostgreSQL are not required.

```bash
sudo apt-get update && sudo apt-get install -y make                                                                                             
make --version
docker version
docker compose version
```

For a complete Windows/WSL walkthrough see [Junior Developer Setup Guide](./docs/JUNIOR_DEVELOPER_SETUP.md).

### 2. Configure the environment

```bash
# Preserve an existing configuration.
[ -f .env ] || cp .env.example .env
chmod 600 .env
# Generate a strong password for a NEW database only.
openssl rand -hex 32
nano .env
```

Set `PROD_POSTGRES_PASSWORD` to the generated value for a new database. Preserve the existing password when reusing its volume; changing `.env` alone does not rotate a PostgreSQL password. Do not commit `.env` or place secrets in `VITE_*` variables (these are public browser build values).

For local HTTP testing only, configure:

```dotenv
PROD_POSTGRES_PASSWORD=<replace-with-your-password>
READQUEST_FRONTEND_URL=http://localhost:8081
READQUEST_COOKIE_SECURE=false
READQUEST_AUTO_VERIFY_EMAIL=true
```

For an Internet-facing deployment use HTTPS, secure cookies and real email verification. Configure the root `.env` with the following values instead of the local settings (replace all examples):

```dotenv
READQUEST_FRONTEND_URL=https://app.example.org
READQUEST_COOKIE_SECURE=true
READQUEST_AUTO_VERIFY_EMAIL=false
SMTP_HOST=smtp.example.org
SMTP_PORT=587
SMTP_FROM=readquest@example.org
SMTP_USERNAME=<smtp-username>
SMTP_PASSWORD=<smtp-password>
```

Also review the session secret configuration in the actual environment template and [deployment guide](./DEPLOYMENT.md). The supplied READMEs do not name the session secret variable or confirm that all settings are forwarded by the production Compose file. Verify those before exposing the application publicly.

### 3. Build and launch all production services

```bash
# Validate the Compose configuration without printing credentials.
docker compose -f compose.production.yaml config --quiet
# Optional: build development, test, audit and production targets.
make build
# Primary production launch (stops development).
make prod
```

If production images need to be built explicitly, run `docker compose -f compose.production.yaml build` before `make prod`. Use `docker compose -f compose.production.yaml config --services` to discover the exact service names in your checkout.

| Component | Expected behavior |
| --- | --- |
| PostgreSQL | Running; persistent database volume |
| Alembic migration job | Runs `alembic upgrade head` before API startup; successful one-shot jobs may exit with code 0 |
| FastAPI backend | Running; exposes health and API endpoints |
| React/Nginx frontend | Running; serves UI and proxies `/api/` to backend |

Production images run without development bind mounts or development dependencies. Do not expect every one-shot job to remain running.

### 4. Verify images, containers and connectivity

```bash
docker compose -f compose.production.yaml config --services
docker compose -f compose.production.yaml images
docker compose -f compose.production.yaml ps -a
docker compose -f compose.production.yaml logs --tail=100
curl -fsS http://localhost:8001/health
curl -fsS http://localhost:8081/api/v1/books
```

Expect successful HTTP responses from both checks. An empty books `items` list is normal for a healthy unseeded database. Inspect failed services before continuing.

| Resource | Local URL |
| --- | --- |
| Frontend | http://localhost:8081 |
| Backend health | http://localhost:8001/health |
| Proxied books API | http://localhost:8081/api/v1/books |
| Sign in | http://localhost:8081/login |
| Parent registration | http://localhost:8081/signup |
| Teacher registration | http://localhost:8081/signup?account=teacher |
| Account / child profiles | http://localhost:8081/account |
| Parent portal | http://localhost:8081/parent |
| Teacher portal | http://localhost:8081/teacher |

### 5. Initialize the local demonstration curriculum

For a new **local demonstration** database, after the backend starts:

```bash
docker compose -f compose.production.yaml exec -T backend python -m app.seeds.demo
curl -fsS http://localhost:8081/api/v1/books
```

Refresh http://localhost:8081/books to view the 16 books. The seed loads 12 lessons, 60 activities, demo skills, reading texts and read-aloud fixtures. It is idempotent but updates matching fixture IDs. Review it before using it with real data. `make seed` targets the separate development database, not production. A non-demo production curriculum provisioning procedure is not specified in the supplied documentation.

## Administrator and account setup

The following commands target the production backend. Run them only as a trusted operator authorized to manage the deployment. Container access is privileged; do not grant it to ordinary teachers or parents.

### 1. Verify administrative tooling

```bash
docker compose -f compose.production.yaml exec -T backend python -m app.teacher_setup --help
```

### 2. Create a parent account and student profile

1. Open http://localhost:8081/signup and register the parent with their own email and strong password (at least 10 characters, uppercase, lowercase, number and symbol).
2. Verify email when verification is enabled; sign in at http://localhost:8081/login.
3. Open **Account** at http://localhost:8081/account and create a child profile with nickname, avatar and reading level.
4. Repeat for each authorized child. Select the active child before opening the learner dashboard.

Students are learner profiles, not independent email/password accounts. Registration always creates a `parent`. The documentation provides no administrator CLI for creating parents or children directly; use the supported UI with the parent/account owner's authorization. Do not collect child email addresses or share adult passwords.

### 3. Register and promote a teacher

Register a separate teacher account at http://localhost:8081/signup?account=teacher and verify email when required. The signup form does not send an approval request or grant the teacher role. The teacher must contact an administrator. After confirming authorization, run:

```bash
docker compose -f compose.production.yaml exec -T backend \
  python -m app.teacher_setup promote-teacher --email teacher@example.org
```

Replace example emails throughout with the registered account emails. Promotion changes an existing parent-role account to `teacher`; it does not create an account or grant the parent dashboard role. Have the teacher sign out and sign back in, then verify access at http://localhost:8081/teacher.

### 4. Create a classroom

```bash
docker compose -f compose.production.yaml exec -T backend \
  python -m app.teacher_setup create-class \
  --teacher-email teacher@example.org \
  --name "Room 1" --grade "Grade 1" --school "Example School"
```

Save the returned `classId`. Do not assume repeated classroom creation is idempotent.

### 5. Locate and enroll students

After the parent creates a child profile, and with authorization to enroll that child:

```bash
docker compose -f compose.production.yaml exec -T backend \
  python -m app.teacher_setup list-learners --parent-email parent@example.org
```

Save the correct `learnerId`. Replace the example values below with the actual identifiers:

```bash
CLASS_ID='replace-with-returned-classId'
LEARNER_ID='replace-with-returned-learnerId'
docker compose -f compose.production.yaml exec -T backend \
  python -m app.teacher_setup enroll --class-id "$CLASS_ID" --learner-id "$LEARNER_ID"
```

Repeat for each student. Repeating an enrollment is safe. Sign in as the teacher and verify the roster contains the expected students.

### 6. Publish and verify a reading assignment

1. As the teacher, open `/teacher`, create an assignment, choose the classroom and select at least one enrolled student.
2. As the parent, select the enrolled child and open `/dashboard` to start the assigned quest.
3. Complete every activity in the quest. Reload the teacher dashboard and verify the **Student Completion** count and percentage.

Completing a quest marks all pending assignments for that learner and lesson complete, even across different classes. Partial quests do not count. Assignments created after a completed session are not backfilled; a new completed quest is required. The existing explicit assignment-completion API remains available to the learner's account owner.

### Role and acceptance checklist

| Role | Expected access / verification |
| --- | --- |
| Docker operator | Can execute authorized teacher setup CLI in the production backend |
| Application admin | Role exists; bootstrap not documented |
| Teacher | Teacher portal, authorized classroom roster and assignments |
| Parent | Parent portal, own child profiles and progress |
| Student | Parent-selected learner profile, assigned activities and progress |

- [ ] Production images and runtime containers are present; migrations succeeded.
- [ ] Backend health and proxied API respond successfully.
- [ ] Parent registration and login succeed; child profile is visible.
- [ ] Teacher promotion, classroom creation and enrollment succeed.
- [ ] Teacher can publish an assignment; enrolled learner can complete it.
- [ ] Teacher sees completion; unrelated accounts cannot access private learner data.
- [ ] HTTPS, secure cookies, email delivery and secrets are verified before public launch.

## Container operations and troubleshooting

| Operation | Command |
| --- | --- |
| Launch/rebuild production | `make prod` |
| Build all image targets | `make build` |
| List images | `docker compose -f compose.production.yaml images` |
| List all containers | `docker compose -f compose.production.yaml ps -a` |
| Follow logs | `docker compose -f compose.production.yaml logs -f` |
| Stop production | `docker compose -f compose.production.yaml stop` |
| Start existing containers | `docker compose -f compose.production.yaml start` |
| Restart existing containers | `docker compose -f compose.production.yaml restart` |
| Remove containers, retain named volumes | `docker compose -f compose.production.yaml down` |
| Backend shell | `docker compose -f compose.production.yaml exec backend sh` |

Restarting does not apply changed environment variables or rebuild images. Use the production launch workflow after configuration or code changes. Back up the production database and verify restoration before upgrades or destructive operations; an exact backup/restore command requires the actual database service name, credentials and volume configuration, which were not supplied.

**Warning:** `make clean` removes development, test and production volumes and generated files. Do not use it for a normal restart or troubleshooting. Never use `down --volumes` on production unless intentional data destruction is authorized.

| Symptom | Action |
| --- | --- |
| Docker unavailable in WSL | Enable integration for the active distribution and rerun `docker version`. |
| Port already allocated | Inspect `docker ps`; change `PROD_FRONTEND_PORT` or `PROD_BACKEND_PORT` in `.env` and adjust URLs accordingly. |
| Database password error | Verify `PROD_POSTGRES_PASSWORD` matches the existing volume; do not delete the database to fix credentials. |
| Backend unavailable | Inspect Compose logs and migration exit status; check database readiness. |
| Books API empty | Seed only the intended local demo database if needed. |
| Login fails on local HTTP | Check local cookie setting and email verification; do not disable secure cookies on public HTTPS. |
| Teacher portal denied | Verify registration, email verification and successful promotion in the correct database. |
| Empty classroom roster | Verify classroom ID and authorized enrollment of the correct learner ID. |
| CLI unavailable | Check `python -m app.teacher_setup --help` inside the production backend; inspect image contents before assuming the CLI is included. |

## Development and testing

Development uses a separate database and hot-reload stack. For best bind-mount performance use a Linux-native checkout such as `~/projects/ReadQuest` rather than `/mnt/c` or `/mnt/d`.

```bash
[ -f .env ] || cp .env.example .env
make up
make seed
make test
make audit
```

Development frontend: http://localhost:8080; backend: http://localhost:8000/health; OpenAPI: http://localhost:8000/docs; activity feed: http://localhost:8000/demo/activities. For development teacher administration, use `docker compose exec backend` in place of `docker compose -f compose.production.yaml exec -T backend` in the CLI examples above.

### Daily workflow

| Command | Action |
| --- | --- |
| `make setup` | Start the development stack, load demo data, and train ML models in one step |
| `make up` | Build and start PostgreSQL, migrations, FastAPI, and Vite with hot reload |
| `make seed` | Load or refresh the idempotent demo data |
| `make logs` | Follow development service logs |
| `make test` | Run backend pytest plus frontend type, security, build, and audit checks in isolated containers |
| `make audit` | Run `npm audit --audit-level=high` and `pip-audit` in containers; the unpublished backend package itself is excluded, but its installed dependencies are audited |
| `make build` | Build development, test, audit, and production image targets |
| `make prod` | Stop development and run the non-root Nginx/FastAPI production stack |
| `make down` | Stop development containers without deleting database data |
| `make clean` | Remove project containers/volumes and delete generated `dist/` and `server.js` in a container |

For an intentional development-only database reset (preserves production data):

```bash
docker compose down --volumes
make up
make seed
```

For slow file reloads on mounted Windows drives, retain `CHOKIDAR_USEPOLLING=true`. For CRLF problems, review `.gitattributes` and use `git add --renormalize .` before committing normalized files.

## Security and privacy notes

Authenticated state-changing API requests require the double-submit CSRF cookie/header pair. Public catalog reads require no authentication; private learner, session, progress, parent, teacher, assignment, book-progress and voice-attempt access is ownership checked. See [Security Audit](./SECURITY_AUDIT.md), [Deployment](./DEPLOYMENT.md) and [Production Readiness](./PRODUCTION_READINESS.md).

### Browser voice attempts

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


## Key Features

### Learner Experience
- **Four Reading Worlds (12 Quests · 60 Activities):**
  - **Phonics Forest** — Letter recognition, initial consonant sounds, short vowels, and consonant digraphs
  - **Blending Beach** — CVC word building, phoneme blending, and consonant clusters
  - **Sight Word Galaxy** — High-frequency word recognition and sentence cloze practice
  - **Storybook Kingdom** — Short passages and reading comprehension quests
- **Three Configurable Reading Levels:** *Seedling* (`level-1`), *Sprout* (`level-2`), and *Bloom* (`level-3`), configurable independently of grade level.
- **Interactive Activity Player:** Keyboard shortcuts (`1–4` to select, `Enter` to submit/advance, `Escape` to pause), active practice timer tracking, idempotent attempt submission keys, and session review breakdowns.
- **Resilient Public Preview:** The landing page (`/`) and story library (`/library`) load public curriculum previews without requiring login or a live database, while keeping answer keys stripped from client payloads.

### Deterministic Adaptive Engine
- Defined in [`src/services/adaptiveEngine.ts`](./src/services/adaptiveEngine.ts) and [`docs/ADAPTIVE_ENGINE_SPEC.md`](./docs/ADAPTIVE_ENGINE_SPEC.md).
- Evaluates the most recent 10 scored attempts per learner and skill using a deterministic formula:
  ```text
  Mastery = 100 × (0.60 × Accuracy + 0.20 × Recency + 0.20 × Consistency)
  ```
  - **Recency:** Exponential decay with a 14-day half-life (`2 ^ (-days_since_attempt / 14)`).
  - **Evidence Separation:** Keeps score distinct from evidence status (`unknown`, `provisional`, `insufficient_sessions`, `confirmed`), requiring at least 5 attempts across 2 sessions before awarding a **Confirmed Mastered** status.
  - **Mastery Bands:** `< 60` (`needs_focus`), `60–<75` (`developing`), `75–<90` (`proficient`), `90–100` (`mastered`).

### Parent & Educator Portals
- **Parent-Managed Child Profiles (`/account`, `/parent`):** Parents create and manage child nicknames, avatars, and reading levels without collecting child email addresses, set daily practice goals, inspect skill evidence and plain-language recommendation explanations, and export progress reports as formula-safe CSV files.
- **Educator Classroom Portal (`/teacher`):** Role-protected (`teacher` / `admin`) classroom roster, student-by-skill mastery matrix, search and category filters, individual student drill-downs, lesson assignments that appear in learners' dashboards, and authorized CSV class exports.

### Security & Privacy Controls
- **Fail-Closed Route Protection:** `<ProtectedRoute>` guards all private learner, parent, and teacher routes (`/dashboard`, `/activity/:lessonId`, `/summary/:sessionId`, `/progress`, `/profile`, `/account`, `/parent`, `/teacher`).
- **Cookie + CSRF API Transport:** Requests use `credentials: 'include'` for backend `HttpOnly` session cookies and attach `X-CSRF-Token` (double-submit cookie) plus `X-Requested-With: XMLHttpRequest` on state-changing requests—zero tokens or user progress are persisted in `localStorage` or `sessionStorage`.
- **Input & Output Hardening:**
  - Enforces strong passwords (`>= 10` chars with uppercase, lowercase, number, and symbol).
  - Blocks open redirects on `returnTo` query parameters (`sanitizeReturnTo`).
  - Strips reset tokens from browser history (`window.history.replaceState`) on `/reset-password`.
  - Neutralizes spreadsheet formula injection (`=`, `+`, `-`, `@`, `\t`, `\r`) in CSV exports (`sanitizeCsvCell`).
  - Enforces HTTPS for remote production `VITE_API_BASE_URL` origins.

---

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 8
- **Backend:** FastAPI + SQLAlchemy + Argon2id password hashing
- **Database:** PostgreSQL for Docker deployments; SQLite is referenced for local non-Docker use
- **Styling:** Tailwind CSS 4 (`@tailwindcss/vite`)
- **Routing:** React Router 7 (`react-router-dom`)
- **Animations & Icons:** Motion (`motion`) + Lucide (`lucide-react`) + custom ReadQuest SVG illustrations & badges

---

## Application Routes

### Public Routes
| Path | Description |
| --- | --- |
| `/` and `/welcome` | Public landing page with hero, reading pillars, story showcase, and family benefits |
| `/library` | Filterable public curriculum catalog |
| `/login` | Parent and educator sign in |
| `/signup` | Parent account registration with password strength meter and policy consent |
| `/forgot-password` | Request password reset email |
| `/reset-password` | Set a new password via email reset token |
| `/verify-email` | Confirm email verification token or resend link |
| `/privacy` | Privacy Policy (including child profile data protections) |
| `/terms` | Terms of Use |

### Protected Routes (Authentication Required)
| Path | Allowed Roles | Description |
| --- | --- | --- |
| `/dashboard` | Authenticated users | Child reader quest hub, assigned quests, and adaptive recommendations |
| `/activity/:lessonId` | Authenticated users | Interactive reading quest player |
| `/summary/:sessionId` | Authenticated users | Post-quest score, active time, badge rewards, and answer review |
| `/progress` | Authenticated users | Skill mastery breakdown, evidence status, review timers, and badges |
| `/profile` | Authenticated users | Child reader nickname, avatar, and reading level customization |
| `/account` | Authenticated users | Parent account settings, child profile CRUD, password update, and account deletion |
| `/parent` | `parent`, `admin` | Parent insights dashboard, weekly chart, goal setting, and CSV export |
| `/teacher` | `teacher`, `admin` | Educator classroom roster, mastery matrix, assignments, and CSV export |

---

## Project Structure

```text
├── .env.example                     # Frontend environment template
├── index.html                       # Entry HTML with metadata and strict referrer policy
├── backend/                         # FastAPI books/read-aloud service and PostgreSQL seed
│   ├── app/                         # API routes, models, services, and seed fixtures
│   ├── alembic/                     # PostgreSQL migration chain
│   ├── tests/                       # Backend pytest suite
│   └── pyproject.toml               # Python runtime and test dependencies
├── public/                          # Static assets (favicon.svg)
├── docs/
│   └── ADAPTIVE_ENGINE_SPEC.md      # Adaptive mastery formula & rules specification
├── AUTH_DATABASE_INTEGRATION.md     # Backend API & database schema contract
├── SECURITY_AUDIT.md                # Frontend security audit & verification results
├── compose.yaml                     # Hot-reload development stack
├── compose.test.yaml                # Isolated PostgreSQL test/audit jobs
├── compose.production.yaml          # Non-root production runtime stack
├── Makefile                         # Docker-only build/test/run entry points
├── DEPLOYMENT.md                    # Production build, Nginx proxy & CSP/HSTS guide
├── PRODUCTION_READINESS.md          # Current readiness & backend launch checklist
└── src/
    ├── App.tsx                      # Router, AuthProvider & ErrorBoundary setup
    ├── contexts/
    │   └── AuthContext.tsx          # Fail-closed auth & active child profile state
    ├── utils/
    │   └── security.ts              # Validation, open-redirect guard, CSV sanitizer, CSRF cookie helper
    ├── services/
    │   ├── apiConfig.ts             # apiFetch client, endpoint map, HTTPS & error classification
    │   ├── authService.ts           # Auth & child profile CRUD service
    │   ├── repository.ts            # ApiReadingQuestRepository + CSV builders
    │   ├── adaptiveEngine.ts        # Deterministic skill mastery & recommendation engine
    │   ├── gradingService.ts        # Lesson answer-key sanitizer
    │   ├── timerService.ts          # Active practice duration timer
    │   ├── authAndSecurity.test.ts  # Automated unit & security test suite
    │   ├── adaptiveEngine.test.ts   # 22 deterministic mastery & decay tests
    │   └── data/                    # Static public curriculum definitions
    ├── components/
    │   ├── auth/                    # AuthLayout & ProtectedRoute guard
    │   ├── common/                  # Navbar, FloatingBottomNav, ErrorBoundary, buttons, modals
    │   ├── landing/                 # HeroSection, QuestExplorer, LibraryPreview, ParentBenefits, Footer
    │   ├── activity/                # QuestionRenderer & FeedbackBanner
    │   ├── icons/                   # Custom ReadQuest SVG iconography & achievement badges
    │   └── illustrations/           # Custom reading illustrations
    └── views/                       # Page-level React views (Welcome, Library, Auth, Dashboards, Policies)
```

---

## Documentation

- [`backend/README.md`](./backend/README.md) — Backend-specific authentication, database, classroom setup and voice assessment reference.

- [`docs/ADAPTIVE_ENGINE_SPEC.md`](./docs/ADAPTIVE_ENGINE_SPEC.md) — Mathematical specification for mastery, decay, evidence, and recommendations.
- [`AUTH_DATABASE_INTEGRATION.md`](./AUTH_DATABASE_INTEGRATION.md) — Complete REST endpoint, cookie/CSRF, RBAC, and conceptual relational database schema guide for backend integration.
- [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) — Frontend security controls, static/dependency scan outputs, and remaining backend security requirements.
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Production build steps, Nginx reverse proxy example, and recommended HTTP security headers (`CSP`, `HSTS`, `X-Frame-Options`, `Referrer-Policy`).
- [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) — Production configuration and pre-release checklist.
