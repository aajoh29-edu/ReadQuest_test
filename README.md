# ReadQuest

**ReadQuest** is an adaptive children's literacy web application built with React, TypeScript, Vite, and Tailwind CSS. It combines structured phonics, word blending, sight word fluency, and reading comprehension adventures for young readers with parent-managed child profiles, deterministic skill mastery tracking, and educator classroom insights.

> **Architecture Status:** This repository contains the production-hardened **frontend application**. Persistent authentication, relational database storage, email delivery, and authoritative server-side activity grading are integrated through the `/api/v1/*` REST contract documented in [`AUTH_DATABASE_INTEGRATION.md`](./AUTH_DATABASE_INTEGRATION.md).

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
- **Styling:** Tailwind CSS 4 (`@tailwindcss/vite`)
- **Routing:** React Router 7 (`react-router-dom`)
- **Animations & Icons:** Motion (`motion`) + Lucide (`lucide-react`) + custom ReadQuest SVG illustrations & badges

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (lockfile uses `bun.lock`) or Node.js `>= 20`

### Installation

```bash
bun install --frozen-lockfile
```

*(Or `npm install` if using npm.)*

### Environment Configuration

Copy `.env.example` to `.env` and configure for your environment:

```bash
cp .env.example .env
```

```env
# Same-origin reverse proxy default (recommended for production)
VITE_API_BASE_URL="/api/v1"

# Public display name
VITE_APP_NAME="ReadQuest"

# Double-submit CSRF header settings
VITE_ENABLE_CSRF_HEADER="true"
VITE_CSRF_COOKIE_NAME="rq_csrf_token"
```

> **Security Note:** Never place database URLs, JWT secrets, or private API keys in `VITE_*` variables—they are bundled into client-side JavaScript.

### Running Locally

Start the development server on port `3000`:

```bash
npm run dev
```

Visit `http://localhost:3000`. When no backend server is mounted at `/api/v1`, public landing and curriculum previews load safely while authentication and protected dashboards fail closed with an offline service notice.

---

## Scripts & Verification

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite development server on port `3000` |
| `npm run build` | Build production bundle into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run TypeScript type checking (`tsc --noEmit`) |
| `npx tsx --test src/services/authAndSecurity.test.ts` | Run automated auth validation, security, API transport, and 22 deterministic adaptive engine tests |
| `bun audit` | Scan dependencies in `bun.lock` for known vulnerabilities |
| `npm run clean` | Remove build artifacts (`dist`) |

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
- [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) — Current launch readiness assessment and pre-release checklist.
