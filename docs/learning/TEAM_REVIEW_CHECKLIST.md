# Team review checklist

## Member 1 — Backend and architecture lead

- [ ] API schemas remain separate from SQLAlchemy models.
- [ ] Authenticated child identity is derived server-side.
- [ ] Role checks protect parent, teacher, and admin queries.
- [ ] The attempt endpoint wraps `submit_attempt()` in one transaction.
- [ ] Database errors become safe API responses without leaking SQL or personal data.
- [ ] Production CORS, logging, health, and readiness are reviewed.

## Member 2 — Frontend and UX lead

- [ ] Activity data supports the child learning screen.
- [ ] Progress data includes score, band, confidence, and last-practiced time.
- [ ] Recommendation data includes the activity and understandable explanation.
- [ ] React does not calculate mastery or recommendation priority.
- [ ] Loading, empty, no-candidate, and failure states are designed.
- [ ] Frontend build/test commands are supplied for Docker and CI.

## Member 3 — Data, adaptive learning, and DevOps lead

- [ ] Models match the ERD and data dictionary.
- [ ] Migration upgrades, downgrades, and passes `alembic check`.
- [ ] Seed is idempotent and contains no real child data or usable credentials.
- [ ] Algorithm tests cover boundaries and deterministic output.
- [ ] PostgreSQL tests cover persistence and concurrency strategy.
- [ ] Compose works from a fresh clone.
- [ ] CI blocks failing lint, tests, migrations, and image builds.
- [ ] Release and rollback are rehearsed.

## Full-team release gate

- [ ] Open ERD questions are resolved in ADR-0002.
- [ ] Formula and ranking examples are approved.
- [ ] One vertical-slice demo passes on `main`.
- [ ] Each teammate can run the README.
- [ ] Known limitations appear in the final report.
- [ ] A local Compose demo is available if cloud deployment fails.

