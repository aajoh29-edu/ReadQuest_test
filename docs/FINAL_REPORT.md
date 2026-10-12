# ReadQuest full-run report

Implemented on `test/codex-full-run`, with grouped local commits. No commits went directly to main. [Task tracker](TASK_TRACKER.md): **25 DONE, 2 BLOCKED**. [Verification](VERIFICATION_REPORT.md) distinguishes current-machine checks from unrun hosted gates.

## PROJECT MANAGER

Read the required foundation/build/learning/review/env/Compose/CI/bridge files, inventoried all remaining processes, prior security findings, missing workflows/dependencies and the sole source TODO, and tracked them to terminal outcomes. The user authorized all team/design sign-offs for this test run.

## SYSTEMS ANALYST

Added actor/use-case, login/start/submission sequence and mastery-state Mermaid models in `docs/models/WORKFLOWS.md`. `docs/models/ERD.md` and the canonical architecture ERD/Graphviz now cover every column and relationship in fourteen SQLAlchemy tables and migrations 0001–0002. Updated dictionary/traceability and resolved logical questions in ADR-0002.

## SOFTWARE ARCHITECT

Documented component responsibilities, exact API schemas/contracts, revocable-cookie authentication, role-plus-relationship permissions, account provisioning, immutable evidence/content, development demo compatibility and production isolation. Retained validated mastery-v1/recommendation-v1 weights/bands/reason codes; fixed deterministic deduplication/lock order. bridge is generated Docker Desktop Kubernetes material, explicitly archived with limitations rather than used as a production target.

## CODE REVIEWER

Rechecked the four prior security fixes and addressed environment binding, authentication/ownership, answer-key/client-correctness trust, XSS, unsafe SQL errors, unstable concurrency, unusable-hash fallback, password rotation, archived/disabled rosters and vulnerable dev dependencies. The learning walkthrough lists findings, resolutions and evidence. Audits report no known dependency vulnerabilities.

## BACKEND DEVELOPER

Implemented Argon2id passwords, hashed opaque sessions, expiry/logout/password change, persistent login throttling, initial-admin CLI and production guards. Added published curriculum/read/attempt/progress/recommendation APIs, guardian child creation/class join, teacher classroom workflows and admin account/content management. Added migration 0002 without changing applied 0001. Production scoring derives child/level/time/correctness on the server; every adaptive write commits or rolls back together. Seeds provide safe opt-in demo login and five evidence cases.

## FRONTEND DEVELOPER

Replaced the static sample with React login/session/password and role screens, accessible answer targets, server progress/recommendations, guardian/class workflows and admin account/curriculum authoring with skill selectors. Loading, error, empty and no-candidate states are explicit. Preserved the development-only legacy sample in `frontend/public` with safe text handling. Browser checks include mobile layout and admin draft editing.

## DEVOPS ENGINEER

Added Python hash locks and frozen npm dependencies, Node/Python pins, separate cached dependency/image stages, Nginx same-origin proxy/security headers and readable non-root files. Hardened the production Compose override so images/database/HTTPS origins are explicit and demo seeding is rejected. Updated Make targets, backend/frontend/security/Compose/browser CI and both API/frontend release images. Added the tested cloud networking helper and saved complete install_script/start_skill draft contents; saving does not publish them.

## QA ENGINEER

41 unit + 19 real PostgreSQL tests pass with **92.86%** combined coverage; **10 frontend tests** and **7 browser checks** pass. Lint, migration consistency/round trips, hash-preserving installation, builds, audits, configured Compose startup/seed, an isolated empty-volume instance, functional authenticated smoke, retained demo assets and the adaptive CLI pass. The team checklist marks local PASS/approved gates separately from hosted BLOCKED items. Failed intermediate runs were investigated and replaced with verified final results; none is counted as passing.

## PROJECT MANAGER (final)

Every tracker row is DONE or BLOCKED with a reason. Remaining blockers:

- **DO05 — hosted deployment/release/rollback:** supply a provider, secure production DB credentials, HTTPS origin and release tag, then execute provider smoke/rollback rehearsal. No production secret or release was invented.
- **DO06 — hosted GitHub policy/CI/main integration:** the API request returned Forbidden. Obtain applicable API/admin access or configure required checks manually, run the hosted workflow and integrate the branch. Native Git read works; no token absence is inferred from the API result.

Changes by file area:

| Files | Why |
|---|---|
| backend/app/api/{dependencies,schemas,routes/auth,routes/production}.py; core/{config,security}.py; models/auth.py | Authentication, strict contracts, scoped authorization, safe production behavior |
| backend/services/learning.py; repositories/access.py; adaptive workflow/repository/functions | Dashboard views, relationship queries, atomic/concurrent learning and deterministic eligibility |
| backend/alembic/versions/0002_auth_sessions.py; CLI and seeds | Persistent auth, explicit bootstrap, repeatable fictitious histories and password rotation |
| backend/tests; requirements*.lock; pyproject.toml | Behavioral/security/database/math tests and reproducible dependencies |
| frontend/src; package files; browser tests; public legacy assets | Full role-based React workflows, accessible controls, preserved sample and meaningful validation |
| Dockerfiles; nginx.conf; Compose files; Makefile; .env.example; .github/workflows | Reproducible startup, secure production settings, same-origin deployment and quality/release gates |
| scripts/cloud_compose_override.py, smoke.py, export_contract.py | Cloud trust/DNS initialization, functional validation and current diagrams/contracts |
| docs/models; architecture; learning guides; tracker/checklist/reports; infra; bridge README | Align documentation with implemented behavior and expose genuine external gates |

### How to demo

The prepared stack is already running on frontend port 8080. For a new local session:

1. Copy `.env.example` to ignored `.env` and choose a throwaway `READQUEST_DEMO_PASSWORD` (12–128 characters). In this cloud export writable DOCKER_CONFIG, generate the cloud override and set COMPOSE_FILE as described in README.
2. Run `docker compose up --build`, then `docker compose --profile seed run --rm seed` in another terminal.
3. Sign in as `child@readquest.example.org` using the supplied password. Select an answer, check it, inspect progress and try the suggested next activity.
4. Sign out and use parent/teacher/admin demo accounts to inspect scoped progress, create/join a class and author curriculum. All use the explicitly supplied development seed password.
5. Run `make test`, frontend tests/build and the browser commands from README. Keep integration runs sequential and disposable.

The known local test fixture password is not a production credential and is not saved in the reusable configuration. Set your own local password and reseed before sharing this test environment. Scores represent recent demonstration evidence, not a validated assessment. Hosted publication, live Kubernetes activation and restoration into a new task are not claimed. Review/save the updated configuration draft in environment settings, then publish the environment when ready.
