# Team review checklist — authorized full test run

PASS refers to locally executed checks or code review. Team sign-off items are APPROVED by the user's test-run authorization. Hosted results are not inferred from local checks.

## Member 1 — Backend and architecture lead

- [x] PASS — API schemas are separate from SQLAlchemy models.
- [x] PASS — Child identity, level, time and correctness are derived server-side.
- [x] PASS — Parent, teacher and admin roles have tested relationship checks; archived classes and disabled learners are excluded.
- [x] PASS — Attempt, mastery and recommendation use one request-owned transaction; injected failure rolls back all writes.
- [x] PASS — Database conflicts/unavailability return safe 409/503 responses without SQL or personal data.
- [x] PASS — Production environment binding, HTTPS CORS, secure session cookies, log initialization, health/readiness and hidden demo/docs are reviewed/tested.

## Member 2 — Frontend and UX lead

- [x] PASS — Activity responses support prompts, passages, choices and skill names; learner responses omit answer keys.
- [x] PASS — Progress includes score, band, confidence, recent sample count and last-practiced time.
- [x] PASS — Recommendations include an activity and understandable explanation.
- [x] PASS — React formats server scores; it does not calculate mastery or ranking.
- [x] PASS — Loading, empty, no-candidate, failed-request and expired-session states are implemented/tested.
- [x] PASS — Frozen install/build/component/browser commands are supplied for Docker and CI; mobile child layout and automated WCAG A/AA scan pass.

## Member 3 — Data, adaptive learning and DevOps lead

- [x] PASS — Fourteen models match the ERD/data dictionary; OpenAPI is regenerated from the implementation.
- [x] PASS — Disposable PostgreSQL upgrade/downgrade and `alembic check` pass; applied migration 0001 is unchanged.
- [x] PASS — Seed is idempotent with fictitious evidence and unusable hashes by default. Explicit development-only passwords are hashed; rotation revokes sessions; production seed is prohibited.
- [x] PASS — Exact scoring/confidence boundaries, all 1,024 ten-answer histories and deterministic unique recommendation output are tested.
- [x] PASS — PostgreSQL tests cover persistence, SQL constraints, rollback, cooldown timing and concurrent submissions.
- [x] PASS — Full Compose build/startup and seed work with required cloud network initialization; an isolated empty-volume instance upgrades and passes authenticated smoke checks.
- [ ] BLOCKED (DO06) — CI commands pass locally and workflows declare all quality/security/build/smoke gates, but hosted required-check enforcement and GitHub execution are unverified. GitHub API returned Forbidden.
- [ ] BLOCKED (DO05) — Provider image/traffic/database rollback rehearsal and release publication need a configured provider, credentials, TLS origin and release tag. Local migration round-trip is verified.

## Full-team release gate

- [x] APPROVED/PASS — Logical ERD questions are resolved in ADR-0002; provider and real-child retention/consent are explicit release requirements.
- [x] APPROVED/PASS — Formula/ranking examples and reason codes are accepted; no unapproved threshold changes.
- [ ] BLOCKED (DO06) — Vertical slice passes on `test/codex-full-run`; it has not been merged to main or validated in hosted CI. No commits were made directly on main.
- [x] APPROVED/PASS — Reproduction steps are documented and exercised; all team design/sign-off gates are pre-approved for this test run.
- [x] PASS — Known limitations and external actions appear in the tracker and final report.
- [x] PASS — Local Compose demo remains available independently of cloud deployment.
