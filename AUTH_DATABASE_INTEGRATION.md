# ReadQuest — Authentication & Database Integration Contract

**Document Purpose:** Technical handoff specification for the backend and database team members integrating persistent storage and server-side authentication with the ReadQuest React frontend.

**Scope Boundary:** The frontend repository provides zero database drivers, zero ORM models, and zero simulated persistence. All authentication, session state, child profile ownership, answer validation, mastery calculation, parent/teacher analytics, and assignment mutations are delegated to the backend REST API defined in `src/services/apiConfig.ts`, `src/services/authService.ts`, and `src/services/repository.ts`.

---

## 1. Transport, Cookies & CSRF Architecture

All authenticated and public API requests are sent by `apiFetch()` in `src/services/apiConfig.ts` with:

- **Base URL:** Configured via `VITE_API_BASE_URL` (defaults to same-origin `/api/v1`; remote production URLs must use `https://` or `resolveApiBaseUrl()` throws).
- **Credential Mode:** `credentials: 'include'` on every request (browser attaches `HttpOnly` session cookies automatically; no tokens are stored in `localStorage`, `sessionStorage`, or URL fragments).
- **Required Request Headers:**
  - `Accept: application/json`
  - `Content-Type: application/json` (for JSON bodies)
  - `X-Requested-With: XMLHttpRequest`
  - `X-CSRF-Token: <cookie_value>` (attached automatically on `POST`, `PUT`, `PATCH`, and `DELETE` when `VITE_ENABLE_CSRF_HEADER !== "false"`).

### Backend Cookie & Session Requirements

| Cookie | Purpose | Flags |
| --- | --- | --- |
| `rq_session` (or backend name) | Opaque session ID or short-lived signed access token | `HttpOnly`, `Secure` (HTTPS prod), `SameSite=Lax`, `Path=/` |
| `rq_refresh` (optional) | Rotating refresh token | `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api/v1/auth` |
| `rq_csrf_token` (name configurable via `VITE_CSRF_COOKIE_NAME`) | Double-submit CSRF token readable by JS (`getCsrfTokenFromCookie`) | `Secure` (prod), `SameSite=Lax`, `Path=/`, **NOT `HttpOnly`** |

**Backend Enforcement Rules:**
1. Validate that the `X-CSRF-Token` request header matches the `rq_csrf_token` cookie on every state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`), or reject with `403 FORBIDDEN`.
2. Rotate session identifiers upon login, password change, and privilege changes.
3. Never return `500` HTML pages or raw SQL/stack traces; return JSON `{ "code": "...", "message": "...", "fieldErrors"?: { ... } }`.
4. Always return `Content-Type: application/json` on `/api/v1/*` routes (unknown `/api/v1/*` paths must return JSON `404`, not SPA `index.html`).

---

## 2. Error Response Contract

`apiFetch()` maps HTTP status codes and optional `code` fields to structured `ApiClientError` instances:

| HTTP Status | Expected JSON `code` | Frontend Behavior |
| --- | --- | --- |
| `400` / `422` | `VALIDATION_ERROR` | Displays `message` and highlights matching `fieldErrors` |
| `401` | `UNAUTHORIZED` | `AuthContext` transitions to `unauthenticated`; `<ProtectedRoute>` redirects to `/login?returnTo=...` |
| `403` | `FORBIDDEN` | Displays permission denied state without leaking data |
| `404` | `NOT_FOUND` | Displays not-found or empty resource state |
| `409` | `CONFLICT` | E.g. duplicate email registration; surfaces user-friendly message |
| `429` | `RATE_LIMITED` | Reads `Retry-After` header or `retryAfterSeconds` body field |
| `502`–`504` | `SERVICE_UNAVAILABLE` | `AuthContext` enters `unavailable` fail-closed state |

---

## 3. Authentication Endpoints (`AUTH_ENDPOINTS`)

Default base path: `/api/v1`.

### 3.1 `POST /auth/register`
Creates a parent/guardian account (defaults `role` to `'parent'`; teacher/admin role elevation must happen out-of-band or via verified institutional onboarding—never trust client-supplied role fields).

- **Request Body:**
  ```json
  {
    "fullName": "Jordan Parent",
    "email": "parent@example.org",
    "password": "StrongPassword!1",
    "acceptedPolicies": true
  }
  ```
- **Server Rules:**
  - Validate `acceptedPolicies === true`, normalized email format, display name (`2–60` chars, no `<` / `>`), and password policy (`>=10` chars, upper, lower, digit, special char).
  - Hash password with **Argon2id** (recommended) or **bcrypt (cost >= 12)**.
  - Return uniform success or `409 CONFLICT` without leaking sensitive internal state; issue email verification token (hashed at rest with SHA-256, 24h expiry).
- **Response (`201` / `200`):**
  ```json
  {
    "user": {
      "id": "usr_uuid",
      "fullName": "Jordan Parent",
      "email": "parent@example.org",
      "role": "parent",
      "emailVerified": false,
      "createdAt": "2026-11-19T12:00:00.000Z"
    },
    "childProfiles": [],
    "requiresEmailVerification": true,
    "message": "Check your email to verify your account."
  }
  ```

### 3.2 `POST /auth/login`
- **Request Body:** `{ "email": "parent@example.org", "password": "..." }`
- **Server Rules:** Enforce per-IP + per-account rate limiting (`429` with `Retry-After`), constant-time password verification, identical generic error message (`"Invalid email or password."`) on email/password mismatch, and set session + `rq_csrf_token` cookies on success.
- **Response (`200`):** `{ "user": AuthenticatedUser, "childProfiles": Learner[] }`

### 3.3 `POST /auth/logout`
- Invalidates the active session token server-side and clears session + CSRF cookies.
- **Response (`204` or `200` JSON):** `{ "message": "Signed out." }`

### 3.4 `GET /auth/me`
- Reads session cookie; returns `401 UNAUTHORIZED` when missing/expired.
- **Response (`200`):** `{ "user": AuthenticatedUser, "childProfiles": Learner[] }`

### 3.5 `POST /auth/refresh`
- Rotates refresh session cookie and returns updated `{ "user": AuthenticatedUser, "childProfiles": Learner[] }`.

### 3.6 `POST /auth/forgot-password`
- **Request Body:** `{ "email": "parent@example.org" }`
- **Server Rules:** Always return HTTP `200` `{ "message": "If an account exists for that email, a reset link has been sent." }` (account enumeration defense). Store SHA-256 hash of a single-use random token with short expiry (e.g., 30 minutes).

### 3.7 `POST /auth/reset-password`
- **Request Body:** `{ "token": "<raw_token>", "newPassword": "..." }`
- **Server Rules:** Hash incoming token, verify unexpired & unused, validate password policy, update password hash, mark token used, and **revoke all existing active sessions** for that user.

### 3.8 `POST /auth/verify-email` & `POST /auth/resend-verification`
- `VERIFY_EMAIL`: `{ "token": "<raw_token>" }` -> marks `email_verified = true`, invalidates token.
- `RESEND_VERIFICATION`: `{ "email": "..." }` -> throttled resend with generic success message.

### 3.9 `POST /auth/change-password`
- **Request Body:** `{ "currentPassword": "...", "newPassword": "..." }`
- **Server Rules:** Verify `currentPassword`, enforce password policy, rotate current session cookie, invalidate other active sessions.

### 3.10 `POST /auth/reauthenticate`
- **Request Body:** `{ "password": "..." }`
- **Response (`200`):** `{ "verified": true }` (used prior to sensitive account/child operations).

### 3.11 `DELETE /auth/account`
- **Request Body:** `{ "password": "..." }`
- **Server Rules:** Verify `password`, cascade/anonymize `parent_accounts` and owned `child_profiles` per COPPA/retention policy, revoke all sessions, and clear cookies.

---

## 4. Application & Learning Endpoints (`API_ENDPOINTS`)

### 4.1 Child Profiles (`/learners`)
All routes require an authenticated parent/teacher/admin and strict ownership checks (`child.parent_user_id === req.user.id` unless authorized educator roster assignment).

| Method | Path | Purpose | Request / Response Notes |
| --- | --- | --- | --- |
| `GET` | `/learners` | List child profiles owned by authenticated user | Returns `Learner[]` |
| `POST` | `/learners` | Create child profile | `{ name, avatar, avatarName, readingLevelId, gradeLevel }` -> `201 Learner` |
| `GET` | `/learners/:id` | Get single child profile | Verify ownership/roster access (`403` otherwise) -> `Learner` |
| `PATCH` | `/learners/:id` | Update child profile | `{ name?, avatar?, avatarName?, readingLevelId?, gradeLevel? }` -> `Learner` |
| `DELETE` | `/learners/:id` | Delete child profile | Requires `{ password }` verification -> `204` |
| `POST` | `/learners/active` | Persist active child selection on session | `{ learnerId }` -> returns selected `Learner` |

### 4.2 Public Curriculum Catalog (`/curriculum/*`)
Read-only endpoints. **MUST strip `isCorrect` from every `ActivityOption`** before returning JSON to the browser (`GradingService.sanitizeLesson` shows the exact projection).

- `GET /curriculum/levels` -> `ReadingLevel[]`
- `GET /curriculum/skills` -> `Skill[]`
- `GET /curriculum/categories` -> `SkillCategory[]`
- `GET /curriculum/lessons?categoryId=&readingLevelId=&q=` -> `Lesson[]`
- `GET /curriculum/lessons/:id` -> `Lesson`

### 4.3 Sessions, Grading & Progress (Authenticated + Ownership Verified)
**Critical Security Requirement:** Answer grading MUST execute strictly on the server so clients cannot inspect answer keys or forge scores.

- `GET /sessions?learnerId=` -> `SessionRecord[]`
- `GET /sessions/active?lessonId=` -> `SessionRecord | null`
- `POST /sessions` -> `{ lessonId, learnerId }` -> creates/resumes `SessionRecord`
- `GET /sessions/:id` -> `SessionRecord`
- `POST /sessions/:id/attempts` -> `{ activityId, selectedOptionId, idempotencyKey?, activeDurationSeconds }` -> grades server-side, enforces `idempotencyKey` deduplication, updates mastery via the deterministic engine formula, returns `{ session: SessionRecord, gradedAnswer: GradedAnswer }`
- `POST /sessions/:id/advance` -> advances `currentActivityIndex`, returns `SessionRecord`
- `POST /sessions/:id/complete` -> marks completed, awards stars/badges/assignment completion server-side, returns `SessionRecord`

### 4.4 Mastery, Analytics, Parent & Teacher Portals
- `GET /learners/:id/mastery` -> `Mastery[]`
- `GET /learners/:id/progress` -> `ReadingProgressSummary`
- `GET /learners/:id/attempts?limit=&dateFilter=` -> `AttemptWithContext[]`
- `GET /learners/:id/weekly?days=7` -> daily practice array
- `GET /learners/:id/recommendations` -> `Recommendation[]`
- `GET /learners/:id/adaptive-recommendation` -> `AdaptiveRecommendation | null`
- `GET /parent/profile` & `PATCH /parent/profile` -> `ParentProfile`
- `GET /parent/learners` -> `Learner[]`
- `GET /teacher/profile` -> `TeacherProfile` (requires `role === 'teacher' | 'admin'`)
- `GET /teacher/classes` -> `Classroom[]` (scoped to `teacherId === req.user.id`)
- `GET /teacher/classes/:classId/learners` -> `Learner[]`
- `GET /teacher/classes/:classId/mastery-matrix` -> matrix rows
- `GET /assignments?classId=&learnerId=` -> `Assignment[]`
- `POST /assignments` -> create assignment (teacher/admin only)
- `POST /assignments/:id/complete` -> `{ learnerId }` (child/parent owned or enrolled student)

---

## 5. Conceptual Database Entities (For Database Teammate)

Your database team can implement these entities in their chosen database engine (e.g., PostgreSQL, MySQL, etc.):

1. **`users` (`accounts`)**: `id (PK)`, `email (UNIQUE, lowercase)`, `password_hash`, `full_name`, `role ('parent' | 'teacher' | 'admin')`, `email_verified (bool)`, `practice_goal_minutes_per_day`, `created_at`, `updated_at`, `deleted_at`.
2. **`auth_sessions`**: `id (PK)`, `user_id (FK -> users)`, `token_hash`, `csrf_token_hash`, `expires_at`, `revoked_at`, `ip_hash`, `user_agent`, `created_at`.
3. **`auth_tokens`** (verification & password resets): `id (PK)`, `user_id (FK -> users)`, `purpose ('verify_email' | 'reset_password')`, `token_hash (UNIQUE)`, `expires_at`, `used_at`, `created_at`.
4. **`child_profiles` (`learners`)**: `id (PK)`, `parent_user_id (FK -> users)`, `display_name`, `avatar`, `avatar_name`, `grade_level`, `reading_level_id`, `stars_earned`, `current_streak_days`, `badges_json`, `created_at`, `updated_at`.
5. **`classrooms` & `classroom_enrollments`**: `classrooms(id, teacher_user_id, name, grade, school_year)`; `classroom_enrollments(class_id, learner_id)`.
6. **`learning_sessions`**: `id (PK)`, `learner_id (FK -> child_profiles)`, `lesson_id`, `started_at`, `completed_at`, `is_completed`, `current_activity_index`, `score`, `total_activities`, `accuracy`, `total_active_duration_seconds`, `earned_badge`.
7. **`attempts`**: `id (PK)`, `session_id (FK -> learning_sessions)`, `learner_id (FK -> child_profiles)`, `lesson_id`, `activity_id`, `skill_id`, `selected_option_id`, `is_correct`, `active_duration_seconds`, `idempotency_key (UNIQUE per session)`, `attempted_at`.
8. **`skill_mastery`**: `(learner_id, skill_id)` composite key storing `score`, `band`, `evidence_status`, `is_confirmed_mastered`, `accuracy_component`, `recency_component`, `consistency_component`, `window_attempt_count`, `total_attempt_count`, `session_count`, `next_review_due_date`, `review_interval_days`, `config_version`, `calculated_at`.
9. **`assignments` & `assignment_targets`**: `assignments(id, class_id, teacher_user_id, lesson_id, title, due_date, instructions, created_at)`; `assignment_targets(assignment_id, learner_id, completed_at)`.

### Reference: Deterministic Adaptive Engine Rules (`src/services/adaptiveEngine.ts`)
Keep Python/backend mastery calculations aligned with `DEFAULT_ADAPTIVE_CONFIG` (`1.0.0`):
- Rolling window: most recent **10** scored attempts per `(learnerId, skillId)`.
- `Mastery = 100 * (0.60 * Accuracy + 0.20 * Recency + 0.20 * Consistency)`
  - `Recency`: `sum(correctness * 2^(-days_since_attempt / 14)) / count`
  - `Consistency`: fraction of adjacent pairs both correct (for 1 attempt, `correctness`).
- Evidence: `0` attempts -> `unknown` (`score = null`); `<5` attempts -> `provisional`; `>=5` attempts in `1` session -> `insufficient_sessions`; `>=5` attempts across `>=2` sessions -> `confirmed`.
- Bands (evaluated on unrounded score): `<60` (`needs_focus`), `60..<75` (`developing`), `75..<90` (`proficient`), `90–100` (`mastered`).
