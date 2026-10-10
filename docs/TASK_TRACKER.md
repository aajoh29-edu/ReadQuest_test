# ReadQuest full-run task tracker

All design/team review gates are approved for this test run. DONE requires passing checks; BLOCKED requires a concrete external prerequisite. Deployment publication is separate from local validation.

| ID | Task | Source (file/doc) | Role | Priority | Status |
|---|---|---|---|---|---|
| PM01 | Inventory requirements, findings, dependencies and TODOs | BUILD_PROCESS; learning guides; source scan | Project Manager | P0 | DONE |
| SA01 | Actors, use cases, exact ERD, sequences and mastery states | models; migrations; data dictionary | Systems Analyst | P1 | IN PROGRESS |
| AR01 | Components, bridge purpose, API/auth design and demo migration | README; OPEN_QUESTIONS | Software Architect | P0 | IN PROGRESS |
| AR02 | Resolve ERD questions and approve algorithm thresholds/reasons | ADR-0002; adaptive services | Software Architect | P1 | IN PROGRESS |
| CR01 | Review code and prior four security fixes; record new findings | CODEBASE_WALKTHROUGH §9 | Code Reviewer | P0 | IN PROGRESS |
| BE01 | Password hashing, revocable sessions, expiry, login/logout/password change | missing auth; users | Backend Developer | P0 | OPEN |
| BE02 | Role and relationship authorization; account provisioning/deactivation | traceability; identity models | Backend Developer | P0 | OPEN |
| BE03 | Published lessons/activities, server-side answer scoring and input validation | curriculum; demo routes | Backend Developer | P0 | OPEN |
| BE04 | Atomic authenticated attempt, progress and on-demand recommendation | workflow; Process 8 | Backend Developer | P0 | OPEN |
| BE05 | Guardian/teacher dashboards, class management and enrollments | traceability; identity models | Backend Developer | P1 | OPEN |
| BE06 | Admin curriculum management, validated skill weights/status transitions | traceability; curriculum | Backend Developer | P1 | OPEN |
| BE07 | Auth migration upgrade/downgrade and metadata consistency | Process 3 | Backend Developer | P0 | OPEN |
| BE08 | Demo isolation, safe DB errors, XSS and answer-key protection | review findings | Backend Developer | P0 | OPEN |
| BE09 | Deterministic tie/lock order, rollback, concurrent attempts and constraints | Processes 4, 6–8 | Backend Developer | P0 | OPEN |
| BE10 | Safe opt-in demo login and low/improving/inconsistent/mastered/overdue histories | Process 5 | Backend Developer | P1 | OPEN |
| FE01 | React login, logout, password change and role views | frontend; Process 9 | Frontend Developer | P0 | OPEN |
| FE02 | Child activity answers, progress, recommendations, accessible loading/errors/empty states | team checklist | Frontend Developer | P0 | OPEN |
| FE03 | Parent child creation/class join, teacher classes and admin user/content management | traceability | Frontend Developer | P1 | OPEN |
| DO01 | Repeatable dependencies, frontend build/tests and supported Compose startup | Dockerfiles; Makefile | DevOps Engineer | P0 | OPEN |
| DO02 | Production config without hardcoded secrets; migration readiness and same-origin frontend | compose.production; deployment | DevOps Engineer | P0 | OPEN |
| DO03 | CI backend/frontend/integration/build/security/smoke gates | Process 10 | DevOps Engineer | P1 | OPEN |
| DO04 | Document bridge limitations and resolve PVC TODO | bridge/base/PVC | DevOps Engineer | P1 | OPEN |
| DO05 | Live hosted deployment, release publication and rollback rehearsal | Process 11 | DevOps Engineer | P1 | OPEN |
| DO06 | Enable hosted branch protections/required checks | Process 10 | DevOps Engineer | P1 | OPEN |
| QA01 | Full unit/integration/frontend/smoke tests and adaptive CLI | required QA workflow | QA Engineer | P0 | OPEN |
| QA02 | Complete review checklist, distinguish local/hosted results | TEAM_REVIEW_CHECKLIST | QA Engineer | P1 | OPEN |
| PM02 | Final evidence, changes, limitations and demo walkthrough | user request | Project Manager | P1 | OPEN |

Prior security fixes: production DB guard, production schema/docs hiding, log-level initialization, and least-privilege CI permissions require regression validation (CR01/QA01). No other source TODO/FIXME was found beyond the generated bridge PVC comment (DO04).
