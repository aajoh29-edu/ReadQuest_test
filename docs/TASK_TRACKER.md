# ReadQuest full-run task tracker

All design/team review gates are approved for this test run. DONE requires passing checks; BLOCKED requires a concrete external prerequisite. Deployment publication is separate from local validation.

| ID | Task | Source (file/doc) | Role | Priority | Status |
|---|---|---|---|---|---|
| PM01 | Inventory requirements, findings, dependencies and TODOs | BUILD_PROCESS; learning guides; source scan | Project Manager | P0 | DONE |
| SA01 | Actors, use cases, exact ERD, sequences and mastery states | models; migrations; data dictionary | Systems Analyst | P1 | DONE |
| AR01 | Components, bridge purpose, API/auth design and demo migration | README; OPEN_QUESTIONS | Software Architect | P0 | DONE |
| AR02 | Resolve ERD questions and approve algorithm thresholds/reasons | ADR-0002; adaptive services | Software Architect | P1 | DONE |
| CR01 | Review code and prior four security fixes; record new findings | CODEBASE_WALKTHROUGH §9 | Code Reviewer | P0 | DONE |
| BE01 | Password hashing, revocable sessions, expiry, login/logout/password change | missing auth; users | Backend Developer | P0 | DONE |
| BE02 | Role and relationship authorization; account provisioning/deactivation | traceability; identity models | Backend Developer | P0 | DONE |
| BE03 | Published lessons/activities, server-side answer scoring and input validation | curriculum; demo routes | Backend Developer | P0 | DONE |
| BE04 | Atomic authenticated attempt, progress and on-demand recommendation | workflow; Process 8 | Backend Developer | P0 | DONE |
| BE05 | Guardian/teacher dashboards, class management and enrollments | traceability; identity models | Backend Developer | P1 | DONE |
| BE06 | Admin curriculum management, validated skill weights/status transitions | traceability; curriculum | Backend Developer | P1 | DONE |
| BE07 | Auth migration upgrade/downgrade and metadata consistency | Process 3 | Backend Developer | P0 | DONE |
| BE08 | Demo isolation, safe DB errors, XSS and answer-key protection | review findings | Backend Developer | P0 | DONE |
| BE09 | Deterministic tie/lock order, rollback, concurrent attempts and constraints | Processes 4, 6–8 | Backend Developer | P0 | DONE |
| BE10 | Safe opt-in demo login and low/improving/inconsistent/mastered/overdue histories | Process 5 | Backend Developer | P1 | DONE |
| FE01 | React login, logout, password change and role views | frontend; Process 9 | Frontend Developer | P0 | DONE |
| FE02 | Child activity answers, progress, recommendations, accessible loading/errors/empty states | team checklist | Frontend Developer | P0 | DONE |
| FE03 | Parent child creation/class join, teacher classes and admin user/content management | traceability | Frontend Developer | P1 | DONE |
| DO01 | Repeatable dependencies, frontend build/tests and supported Compose startup | Dockerfiles; Makefile | DevOps Engineer | P0 | DONE |
| DO02 | Production config without hardcoded secrets; migration readiness and same-origin frontend | compose.production; deployment | DevOps Engineer | P0 | DONE |
| DO03 | CI backend/frontend/integration/build/security/smoke gates | Process 10 | DevOps Engineer | P1 | DONE |
| DO04 | Document bridge limitations and resolve PVC TODO | bridge/base/PVC | DevOps Engineer | P1 | DONE |
| DO05 | Live hosted deployment, release publication and rollback rehearsal | Process 11 | DevOps Engineer | P1 | BLOCKED — no provider, production credentials/TLS origin or release tag; hosted rollback cannot be rehearsed |
| DO06 | Enable hosted branch protections/required checks | Process 10 | DevOps Engineer | P1 | BLOCKED — GitHub API Forbidden; hosted protections, CI execution and merge to main unverified |
| QA01 | Full unit/integration/frontend/smoke tests and adaptive CLI | required QA workflow | QA Engineer | P0 | DONE |
| QA02 | Complete review checklist, distinguish local/hosted results | TEAM_REVIEW_CHECKLIST | QA Engineer | P1 | DONE |
| PM02 | Final evidence, changes, limitations and demo walkthrough | user request | Project Manager | P1 | DONE |

## Final evidence and findings

25 DONE; 2 BLOCKED. Every tracker row has a terminal status. All design/sign-off gates were approved for this test run; hosted activation is separate.

Prior findings (DB guard, hidden production docs, configured logging, least-privilege CI) are reviewed/regression-tested. New resolved findings: READQUEST_ENV alias mismatch; missing auth/role/relationship checks; forged correctness and answer-key exposure; production demo exposure; unsafe dynamic demo HTML; ambiguous guardian joins; unstable multi-skill lock/tie order; missing SQL error translation/input/publication validation; unusable-hash timing fallback; password-rotation session revocation; archived/disabled roster leakage; vulnerable test worker; non-root image file permissions; IPv6 localhost health probe. See the walkthrough for fixes/evidence.

The sole original TODO was the generated bridge PVC ownership comment; it is resolved and documented. bridge's generated probe/migration/public-database limitations are recorded in bridge/README.md: Kubernetes activation is not part of the supported Compose workflow and was not run. Provider selection/real-child retention policy are release requirements, not missing course-demo code.

Validation: 41 unit tests + 19 PostgreSQL integration tests, 92.86% combined coverage; 10 frontend tests + 7 browser workflows; migration consistency, pure adaptive CLI, frozen install/build, dependency audits, configured Compose startup/seed, isolated empty-volume smoke, retained demo assets and mobile child accessibility scan all pass. No required tests were skipped; complementary marker deselections are intentional. Hosted Actions/publication/new-task restoration remain unrun.

Initial cloud build DNS/read-only configuration issues were corrected with the generated override and COMPOSE_FILE/DOCKER_CONFIG initialization. Docker VFS cache exhaustion was corrected by pruning disposable build artifacts; development data was preserved. Overlapping test runs were discarded and replaced by one clean sequential run. No TLS/checksum verification was bypassed.
