# Gap analysis: current system vs. COSC 512 requirements

Status key: **Met**, **Partial**, **Gap**, **Beyond MVP** (implemented although the
requirements document defers it). Evidence is from the repository code and tests.
Requirement IDs follow the document's UR-01..20, SR-F01..15 and SR-N01..10 scheme;
rows are grouped by theme and should be checked against the PDF wording before sign-off.

## Findings

| Area | Status | Evidence / gap | Suggested action |
| --- | --- | --- | --- |
| Roles (parent, teacher, admin) | Partial | `User.role` string; no admin endpoints; learners are parent-managed profiles with no child sign-in | Add admin routes and a child/PIN flow if the PDF's four roles are required |
| Curriculum authoring and versioning (draft / published / retired) | Gap | Curriculum is served from `curriculum_seed.json` and seeded DB rows; no state machine or versions | Add curriculum version table and lifecycle |
| Rule-version traceability (SR-F14) | Partial | Tailored lessons return `modelVersion`; rule-based recommendations carry no rule version | Stamp rule version on recommendations and attempts |
| Audit trail (SR-N03) | Gap | No audit log table | Add append-only audit events for consent, grade, role and curriculum changes |
| Idempotent attempt submission (UR-17, SR-F07/N05) | Partial | Unique `(session_id, idempotency_key)`; check is read-then-insert (race-prone); voice attempts have no key | Catch `IntegrityError` and return the stored row; add a key to voice submissions |
| Mastery and adaptive recommendation | Met | `services/learning.py` (window 10, accuracy/recency/consistency); `/adaptive-recommendation` | None |
| Explainable recommendations (UR-15) | Met | Tailored items carry `reason`, band and predicted success | None |
| Transport security (SR-N01) | Gap | `nginx.conf` has no TLS or HTTP redirect | Terminate TLS at the proxy or the platform load balancer |
| Recommendation latency (SR-N04, p95 < 1 s) | Gap | No performance test | Add a latency test for `/adaptive-recommendation` and `/tailored-lesson` |
| Accessibility (keyboard, layout) | Gap | No automated accessibility or keyboard tests | Add Playwright checks |
| End-to-end coverage | Met (new) | `backend/tests/e2e/` runs in-process, or over HTTP against a stack via `READQUEST_E2E_BASE_URL` (`make e2e`) | Add frontend browser journeys |
| Speech recognition, read-aloud (UR-20 / SR-F15 defer these) | Beyond MVP | `ReadAloudView.tsx`, `services/voice.py`, consent endpoints | Record a scope change in the requirements |
| Text-to-speech, pronunciation scoring, server ASR | Out of scope (deferred) | Provider enum is `web_speech` only | Keep deferred |
| Generative / ML lessons | Beyond MVP (new) | `app/ml/` tailoring layer, see below | Record a scope change; keep statistical and explainable |
| Containerisation | Met | Multi-stage `backend/Dockerfile`, dev/test/prod compose, non-root runtime | New `train` and `e2e` services and a model volume added |

## Is reading aloud capable?

**Yes, with limits.** The browser captures speech (Web Speech API in
`src/views/ReadAloudView.tsx`) and sends a transcript to
`POST /children/{id}/read-aloud`. The server aligns the transcript to the expected
words by edit distance (correct, substitution, omission, insertion, self-correction) and
computes accuracy and words-correct-per-minute. Guardian consent is required first,
and audio is never stored. `GET /api/v1/read-aloud/capabilities` reports this at runtime.
`tests/test_ml.py::test_read_aloud_aligns_every_seeded_text` scores every seeded passage:
a perfect read gives accuracy 1.0 and an injected misread lowers it.

Limits: recognition quality depends on the browser (unavailable in some, and often
cloud-based); there is no server-side ASR, TTS or pronunciation scoring; it is not a
validated fluency assessment.

## Machine-learning design

`backend/app/ml/` is pure Python, deterministic and JSON-serialised, so the image stays small.

* **Language model** (`lm.py`): interpolated trigram with absolute discounting, trained on
  published curriculum text only (activities, reading texts, book pages). Child
  transcripts are never used. It is a small n-gram model (about 6.7k tokens on the seed), **not** a neural or
  generative LLM; it is used to measure how predictable (hence easy) a text is.
* **Difficulty** (`difficulty.py`): surprisal, word length, sentence length and unseen-word
  rate combine into a 0..1 index, scored leave-one-document-out.
* **Success model** (`success.py`): L2-regularised logistic regression on the `Attempt`
  table. It uses an explicit prior until 30 or more attempts exist.
* **Tailoring** (`tailor.py`): ranks activities by need, zone-of-proximal-development fit
  (target success 0.75), missed words from read-aloud, and review due; caps items per
  skill, orders easiest first, and returns reasons plus a disclaimer.
* **Endpoints**: `GET /api/v1/learners/{id}/tailored-lesson?size=`, `GET /api/v1/ml/model`.
* **Lifecycle**: a stale artifact (fingerprint mismatch) is ignored and retrained in memory.

Limits: small corpus, outputs are practice suggestions rather than a validated assessment,
and the success model needs real attempt data to move beyond its prior.

## Running it

```sh
make train                # train inside the dev stack (profile "ml")
make e2e                  # migrated + seeded Postgres stack, tests over HTTP
cd backend && python -m app.ml.train --report   # train locally
cd backend && pytest -q                         # unit + in-process e2e
```

Production: `docker compose -f compose.production.yaml --profile ml run --rm train`
writes the artifact to the `readquest-models-production` volume, which the backend
mounts read-only. Without an artifact the backend trains in memory on first request.

Note: the compose files were checked for YAML validity only; `docker compose` was not
available in the authoring environment, so run `make build && make e2e` in CI.
