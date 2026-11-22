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

### Prerequisites
- Node.js `20.19+` (or `22.12+`) with npm
- Python `3.11+`

Run all commands below from the `ReadQuest` project directory unless a step says otherwise.

### 1. Install frontend dependencies

Install the lockfile-pinned npm dependencies:

```powershell
npm install
```

### 2. Configure the frontend

Copy the environment template. The default `/api/v1` value is correct for local development because Vite proxies `/api` to the backend on port `8000`.

```powershell
Copy-Item .env.example .env
```

```env
VITE_API_BASE_URL="/api/v1"
VITE_APP_NAME="ReadQuest"
VITE_ENABLE_CSRF_HEADER="true"
VITE_CSRF_COOKIE_NAME="rq_csrf_token"
```

> **Security Note:** Never place database URLs, JWT secrets, or private API keys in `VITE_*` variables—they are bundled into client-side JavaScript.

On macOS/Linux, copy the file with `cp .env.example .env`.

### 3. Prepare and seed the backend

Use a separate virtual environment for backend dependencies.

**Windows PowerShell:**

```powershell
Set-Location backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install --only-binary=:all: -r requirements.txt
python -m app.seeds.demo
```

**macOS/Linux:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m app.seeds.demo
```

`app.seeds.demo` creates the local `backend\readquest.db` SQLite database, creates its tables, and inserts the complete 12-quest/60-activity curriculum plus the checked-in books and read-aloud texts. The seed is safe to run again.

SQLite is the supported zero-configuration local database. The Alembic migrations use PostgreSQL-specific types; do not run `alembic upgrade head` for the local SQLite workflow.

### 4. Launch both services

Keep the virtual environment active and start FastAPI from `backend`:

```powershell
python -m app
```

Leave that terminal running. In a second terminal, return to the `ReadQuest` directory and start Vite:

```powershell
npm run dev
```

Open:

- Application: `http://localhost:3000`
- Backend API documentation: `http://localhost:8000/docs`
- Seeded books endpoint: `http://localhost:8000/api/v1/books`

Vite proxies `http://localhost:3000/api/*` to `http://127.0.0.1:8000/api/*`, so the frontend and API behave as one same-origin application during development. If the API runs elsewhere, set `VITE_DEV_API_TARGET` before starting Vite; for example, in PowerShell:

```powershell
$env:VITE_DEV_API_TARGET = "http://127.0.0.1:9000"
npm run dev
```

### Local account behavior

For a usable zero-configuration launch, `READQUEST_AUTO_VERIFY_EMAIL` defaults to `true`, so registration creates an authenticated parent account immediately. For a production-like verification flow, set it to `false` and configure SMTP as described in the [backend README](./backend/README.md). Registration always defaults to `parent`; teacher/admin roles must be assigned through an administrative onboarding process.

The backend requires the frontend's double-submit CSRF cookie/header pair on state-changing authenticated requests. Public catalog reads do not require authentication, while learner, session, progress, parent, teacher, assignment, book-progress, and voice-attempt access is ownership checked.

---

## Scripts & Verification

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite development server on port `3000` |
| `npm run build` | Build production bundle into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run TypeScript type checking (`tsc --noEmit`) |
| `npx tsx --test src/services/authAndSecurity.test.ts` | Run automated auth validation, security, API transport, and 22 deterministic adaptive engine tests |
| `npm audit` | Scan dependencies in `package-lock.json` for known vulnerabilities |
| `npm run clean` | Remove generated artifacts (`dist/` and legacy `server.js`) on Windows, macOS, or Linux |
| `cd backend; python -m pytest -q` | Run the complete backend authentication, curriculum, learning, books, voice, and portal test suite |

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
├── backend/                         # FastAPI books/read-aloud service and local SQLite seed
│   ├── app/                         # API routes, models, services, and seed fixtures
│   ├── alembic/                     # PostgreSQL migration chain
│   ├── tests/                       # Backend pytest suite
│   └── requirements.txt             # Python dependencies
├── public/                          # Static assets (favicon.svg)
├── docs/
│   └── ADAPTIVE_ENGINE_SPEC.md      # Adaptive mastery formula & rules specification
├── AUTH_DATABASE_INTEGRATION.md     # Backend API & database schema contract
├── SECURITY_AUDIT.md                # Frontend security audit & verification results
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
