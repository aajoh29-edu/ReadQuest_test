# ReadQuest codebase walkthrough

This guide now describes the authenticated implementation on `test/codex-full-run`; the earlier foundation-only guide is preserved in Git history. The full test-run design gates are approved by the user. Hosted release and repository-policy gates are separate.

## Layers and one request

React (`frontend/src/App.jsx`) signs in using `/api/auth/login`. Nginx or Vite proxies `/api` to FastAPI. `api/routes/auth.py` verifies an Argon2id password, creates a random revocable session and returns a safe user profile. The browser stores the token in an HttpOnly SameSite cookie. The database stores only its SHA-256 digest. Logout, password rotation and account deactivation revoke sessions. Login failures are serialized and throttled in PostgreSQL. `core/config.py` binds `READQUEST_ENV` correctly, validates explicit production HTTPS origins and rejects known demo database credentials.

`api/dependencies.py` loads a non-expired session and an active user, checks browser Origin on mutations and owns a function-scoped database transaction. Function scope commits before a successful response is sent; exceptions roll back. `require_roles` restricts roles, and `repositories/access.py` explicitly joins guardian links or active class enrollments to enforce record ownership. Role alone never grants a parent or teacher access to every child.

`api/routes/production.py` maps request schemas to account, class, curriculum and learning operations. `api/schemas.py` is separate from ORM definitions: unknown production input fields are rejected; lengths, ranges, answer indexes and skill weights are validated. Published learner activity responses omit answer keys. Admin responses include them to support authoring. Questions and skill mappings cannot change after attempts exist; archiving preserves evidence.

For an answer, `POST /attempts` accepts only activity_id, selected_index and optional response_ms. It derives the child and level from the authenticated account, locks the activity, verifies publication, computes correctness against the stored key and timestamps the command on the server. `services/adaptive/workflow.py` takes a per-child advisory lock, then locks child-skill keys in sorted order, inserts an append-only attempt, reads the last-ten evidence window, upserts mastery, ranks published candidates and stores the recommendation. All writes commit or roll back together. A row lock and optimistic `SkillMastery.version` provide additional protection against stale updates.

`repositories/adaptive.py` owns adaptive SQL. Recommendation candidates require a published activity, lesson and every mapped skill, and exclude activities seen within four hours. Pure `services/adaptive/mastery.py` and `recommendation.py` calculate scores without HTTP or SQL. Ties use activity and skill UUIDs; duplicate activities are removed. `services/learning.py` assembles answer-free activity, complete progress and child-friendly recommendation views. The frontend displays these results rather than reimplementing scoring.

## Files and data

Identity models define users, children, guardian relationships, classes and enrollments; curriculum models define skills, lessons, activities and weighted mappings; learning models define attempts, current mastery and served recommendation audits; auth models define sessions and throttle windows. All fourteen tables and every column are shown in `docs/models/ERD.md`. Numeric constraints, UTC timestamps, status deactivation and explicit FK deletion rules remain in PostgreSQL.

Alembic revision `0001` is unchanged. `0002` adds auth tables with a tested downgrade. `alembic/env.py` registers all models; PostgreSQL migration tests and `alembic check` prove consistency. Never rewrite an applied migration.

`seeds/demo.py` creates fictitious reference data, a class and five evidence cases on the demo reader's skills. IDs and evidence timestamps are deterministic. By default password hashes are unusable. An explicit development-only `READQUEST_DEMO_PASSWORD` enables local login; changing it revokes sessions. Production refuses seeding. `cli/create_admin.py` explicitly provisions the first real admin, reading a password without printing it. `cli/adaptive_demo.py` runs the math without a database.

The React application has login/password/logout screens, child answers, guardian/teacher progress and class flows, and admin account/curriculum authoring. It renders untrusted data as text. The archived anonymous frontend is in `frontend/public`; its dynamic strings are escaped and activity titles use DOM text nodes. `bridge/` is generated Docker Desktop Kubernetes reference material with documented limitations, not a production deployment path.

## Security findings and resolution

| Finding | Resolution | Evidence |
|---|---|---|
| Prior production DB fallback | Reject known local/Compose demo credentials even outside Compose | config tests |
| Prior production docs/schema exposure | Hide docs, ReDoc and schema together | production route test |
| Prior ignored log setting | Apply configured log level | application factory |
| Prior excessive CI token permissions | CI contents:read; release only needs packages:write | workflow review |
| READQUEST_ENV did not bind the environment field | Explicit alias with legacy ENVIRONMENT support | alias and production tests |
| No auth/RBAC or child ownership checks | Revocable cookies, active roles and explicit relationship joins | auth/scope integration tests |
| Browser could forge correctness/child IDs | Reject extra production fields and score on server | API validation/submission tests |
| Demo routes reachable in production | Register only in development | production route regression |
| Unsafe dynamic HTML in demo | Escape errors/reasons; use text nodes for titles | React text rendering and retained demo smoke |
| Multi-skill lock order / ambiguous ties | Per-child lock, sorted skill locks, unique deterministic ranking | concurrent DB and reversed-candidate tests |
| Unknown/unpublished content and unsafe SQL errors | Validate mappings/publication; generic 409/503 handlers | admin/integrity tests |
| Timing dummy hash could authenticate an unusable hash | Require a recognized hash in addition to matching | hash and disabled-seed login regressions |
| Critical vulnerable test worker dependency | Upgrade Vitest to patched v5 and freeze npm lock | clean npm audit and frontend tests |
| Non-root images could not read 600-mode source copies | Make application/migration/static files readable inside images | Compose migration, API and demo asset checks |

Production cookies require HTTPS. There is no fixed production signing key or password. Deployment-provider credentials, branch protection, hosted workflow runs and real-world child-data retention/consent remain external release requirements.

## Checks

`make test` runs unit and PostgreSQL suites in a disposable test database and enforces combined coverage ≥75%; `make frontend-test`/`frontend-build` validate React. The integration suite tests migration round trips, seed idempotence, session expiry/revocation/throttling, all roles, relationship denial, admin publishing, server scoring, SQL constraints, cooldown boundaries, rollback and concurrent submissions. Pure tests enumerate all 1,024 ten-answer windows and check exact bands/confidence. Browser tests cover all roles, enrollment, a mobile viewport and an automated accessibility scan. See `docs/VERIFICATION_REPORT.md` for current executed counts; automated accessibility scans do not replace a human accessibility review.
