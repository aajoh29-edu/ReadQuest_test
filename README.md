# ReadQuest

**ReadQuest** is an adaptive children's literacy web application built with React, TypeScript, Vite, and Tailwind CSS. It combines structured phonics, word blending, sight word fluency, and reading comprehension adventures for young readers with parent-managed child profiles, deterministic skill mastery tracking, and educator classroom insights.

> **Architecture Status:** The repository includes a complete local full-stack application: React/Vite plus a FastAPI/SQLAlchemy backend. The backend implements cookie-based authentication, learner profiles, the 12-quest curriculum, server-side grading, sessions, mastery, books, read-aloud assessment, parent/teacher portals, and assignments. Production email delivery and HTTPS/session secrets remain deployment configuration rather than hard-coded development defaults.

---

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
- **Local Database:** SQLite (PostgreSQL migrations are provided for deployment)
- **Styling:** Tailwind CSS 4 (`@tailwindcss/vite`)
- **Routing:** React Router 7 (`react-router-dom`)
- **Animations & Icons:** Motion (`motion`) + Lucide (`lucide-react`) + custom ReadQuest SVG illustrations & badges

---

## Getting Started

New to the project? Follow the
[Junior Developer Setup Guide](./docs/JUNIOR_DEVELOPER_SETUP.md) for a complete
Windows/WSL walkthrough.

### Prerequisites
- Docker Engine in Ubuntu, **or** Docker Desktop with WSL integration enabled for
  the Ubuntu distribution.
- Docker Compose v2 (`docker compose`, not `docker-compose`).
- GNU Make. On Ubuntu: `sudo apt-get update && sudo apt-get install -y make`.
- Node.js, npm, Bun, Python, and PostgreSQL do **not** need to be installed on the
  host.

Run commands from an Ubuntu terminal in the repository root. A native Linux
checkout (for example, `~/projects/ReadQuest`) gives the fastest bind mounts and
file watching. `/mnt/c` and `/mnt/d` checkouts are supported, including the
polling configuration used by Vite and Uvicorn.

### First-time setup

```bash
cp .env.example .env
make build
make up
make seed
```

Edit `.env` before starting a shared or production-like environment. Keep all
`VITE_*` values public; never put database passwords, SMTP credentials, or tokens
in a `VITE_*` variable because Vite embeds those values in browser JavaScript.

Development URLs:

- Frontend: `http://localhost:8080`
- Backend health: `http://localhost:8000/health`
- Backend OpenAPI: `http://localhost:8000/docs`
- Demo activity feed: `http://localhost:8000/demo/activities`
- Same-origin API from the frontend: `http://localhost:8080/api/v1/*` through the
  development proxy configuration

The migration service runs `alembic upgrade head` before FastAPI starts. `seed`
is an explicit profile so normal startup never reloads fixture data implicitly.
The demo seed is idempotent.

### Daily workflow

| Command | Action |
| --- | --- |
| `make up` | Build and start PostgreSQL, migrations, FastAPI, and Vite with hot reload |
| `make down` | Stop development containers without deleting database data |
| `make logs` | Follow development service logs |
| `make seed` | Load or refresh the idempotent demo data |
| `make test` | Run backend pytest plus frontend type, security, build, and audit checks in isolated containers |
| `make audit` | Run `npm audit --audit-level=high` and `pip-audit` in containers |
| `make build` | Build development, test, audit, and production image targets |
| `make clean` | Remove project containers/volumes and delete generated `dist/` and `server.js` in a container |
| `make prod` | Stop development and run the non-root Nginx/FastAPI production stack |

### Production-like local run

Set a production database password through the environment or `.env`, then run:

```bash
export PROD_POSTGRES_PASSWORD="$(openssl rand -hex 24)"
make prod
curl http://localhost:8081/
curl http://localhost:8081/api/v1/curriculum/levels
```

The production frontend is on `http://localhost:8081`, and the production
backend health endpoint is on `http://localhost:8001/health`. Production images
contain no bind mounts or development dependencies.

### Resetting the database

`make clean` is the complete reset: it removes the development, test, and
production Compose volumes. To recreate development data afterward:

```bash
make up
make seed
```

For a development-only reset that preserves production data:

```bash
docker compose down --volumes
make up
make seed
```

### Troubleshooting

- **Port conflict:** Change `DEV_FRONTEND_PORT`, `DEV_BACKEND_PORT`,
  `PROD_FRONTEND_PORT`, or `PROD_BACKEND_PORT` in `.env`.
- **Slow or missed reloads under `/mnt/c` or `/mnt/d`:** Keep
  `CHOKIDAR_USEPOLLING=true`. For best performance, clone into
  `~/projects/ReadQuest`.
- **Shell script line endings:** `.gitattributes` enforces LF for Dockerfiles,
  shell/Python/TypeScript files, YAML, and `Makefile`. If a script still has
  CRLF, run `git add --renormalize .` and recommit the normalized files.
- **Docker unavailable in WSL:** Enable Docker Desktop's WSL integration for the
  active Ubuntu distribution, or install Docker Engine directly in Ubuntu.
  Re-run `docker version` and `docker compose version` before `make up`.
- **Production refuses to start:** `PROD_POSTGRES_PASSWORD` is required by
  `compose.production.yaml`; supply it through the shell or an untracked `.env`.
- **Database is still starting:** Wait for the PostgreSQL and backend health
  checks, then inspect `make logs`.

### Local account behavior

For a usable zero-configuration launch, `READQUEST_AUTO_VERIFY_EMAIL` defaults to `true`, so registration creates an authenticated parent account immediately. For a production-like verification flow, set it to `false` and configure SMTP as described in the [backend README](./backend/README.md). Registration always defaults to `parent`; teacher/admin roles must be assigned through an administrative onboarding process.

The backend requires the frontend's double-submit CSRF cookie/header pair on state-changing authenticated requests. Public catalog reads do not require authentication, while learner, session, progress, parent, teacher, assignment, book-progress, and voice-attempt access is ownership checked.

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

- [`docs/ADAPTIVE_ENGINE_SPEC.md`](./docs/ADAPTIVE_ENGINE_SPEC.md) — Mathematical specification for mastery, decay, evidence, and recommendations.
- [`AUTH_DATABASE_INTEGRATION.md`](./AUTH_DATABASE_INTEGRATION.md) — Complete REST endpoint, cookie/CSRF, RBAC, and conceptual relational database schema guide for backend integration.
- [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) — Frontend security controls, static/dependency scan outputs, and remaining backend security requirements.
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Production build steps, Nginx reverse proxy example, and recommended HTTP security headers (`CSP`, `HSTS`, `X-Frame-Options`, `Referrer-Policy`).
- [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) — Production configuration and pre-release checklist.
