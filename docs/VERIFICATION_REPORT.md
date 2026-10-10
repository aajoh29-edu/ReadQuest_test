# ReadQuest local verification report

Branch: `test/codex-full-run`. All application changes are local commits; no push, hosted merge, tag, registry publication or provider deployment is claimed.

| Check | Executed outcome |
|---|---|
| Frozen host setup | Python 3.12 virtual environment synchronized to 46 hash-pinned dev packages; Node 24 `npm ci` and Vite build pass |
| Backend unit suite | 41 passed, 19 integration cases deselected |
| PostgreSQL suite | 19 passed, 41 unit cases deselected; no required skips |
| Combined coverage | 92.86%, above the 75% gate; measured across the sequential suites in one Docker test container |
| Ruff | Backend and scripts pass |
| Frontend component/API suite | 10 passed under patched Vitest 5 |
| Browser suite | 7 passed using installed Chromium through Nginx: all roles, child answer/next activity/logout, guardian enrollment, admin draft authoring/editing, mobile layout and automated WCAG A/AA child scan |
| Migrations | Clean 0001→0002 upgrade, disposable full downgrade/upgrade and `alembic check` pass; all fourteen ORM tables match migration metadata |
| Seed | Repeated counts/evidence are stable; five named cases; default hashes unusable; opt-in rotation revokes sessions; production seed refused |
| Adaptive transaction | Server scoring, SQL constraints, cooldown boundary, rollback and concurrent evidence/audit persistence pass |
| Algorithms | Exact band/confidence boundaries, all 1,024 ten-answer windows, deterministic ranking/reason codes and no-candidate behavior pass |
| Adaptive CLI | Executed in API image: score 0.54, high_priority/high confidence; weak-skill then spaced-review recommendations |
| Docker images | API, migration, seed, test and React/Nginx images build with verified hashes/TLS and readable non-root runtime files |
| Compose startup | `docker compose up --build -d --wait db api frontend` passes after cloud DOCKER_CONFIG/COMPOSE_FILE initialization; DB/API/frontend healthy; migration exits 0 |
| Functional smoke | Authenticated answer persists and returns mastery/recommendation through the frontend `/api` proxy; readiness and frontend assets pass |
| Empty-volume instance | Separate `readquest_fresh_validation` project, fresh DB volume, reused verified images: migrations 0001/0002, seed and authenticated smoke pass |
| Legacy demo | Development API contract retained; `/demo.html`, `/app.js` and `/styles.css` readable; production routes absent |
| Production configuration | Compose override validates with non-secret fixture values; no fixed production password; explicit HTTPS origins/database/images required |
| Dependency audits | Runtime Python lock: no known vulnerabilities; complete frontend npm tree: no known vulnerabilities |
| Models/contracts | ERD/dictionary/traceability validation passes for fourteen tables; generated Mermaid, Graphviz and OpenAPI are current |
| GitHub access | Existing proxy-backed Git read succeeds; branch-protection API read returns Forbidden |

The marker deselections are complementary suite selection, not skipped coverage. The repository suppresses warning details; each backend invocation reports one third-party warning. No passing result is inferred from an exit-zero run with zero tests.

## Diagnosed setup failures

The default cloud Docker build could not resolve package destinations or the platform proxy and lacked the platform CA. `scripts/cloud_compose_override.py` provides host build networking, current proxy hostname/IP mappings and a public CA secret mount; initialize COMPOSE_FILE before ordinary Compose commands. No verification was disabled. Ordinary developer/GitHub networks were not simulated; hosted jobs remain unrun.

Source file modes from the checkout initially prevented the non-root migration/static servers from reading files; image-local read permissions fix this. Nginx's localhost probe preferred IPv6 while its listener used IPv4; the probe now uses IPv4 loopback. The cloud's Docker VFS backend consumed the 32 GB filesystem through repeated intermediate copies; disposable image/build cache pruning freed 20 GB, preserving development data. An accidentally overlapping pair of DB test runs was rejected as evidence; the reported result comes from one clean sequential run.

Chromium download was denied by CDN policy; the already-installed system Chromium supported real browser tests. Automated accessibility scanning covered the child screen and does not establish complete human accessibility certification.

## External / unrun gates

DO05: no configured production provider, secure database credentials, TLS origin or release tag. Hosted image/traffic/database rollback, publication and real-child retention/consent approval remain outside local validation.

DO06: GitHub API Forbidden; hosted branch protection, required checks, Actions execution and merge to main are unverified. Local workflow commands pass; YAML alone does not enforce repository merge policy.

No live Kubernetes cluster was used. bridge is an archived generated development reference with explicit limitations. A published environment snapshot and restoration in a new Codex task have not been verified. Updated install_script/start_skill were saved as a draft; the user must review/save/publish in environment settings to activate the reusable environment configuration.
