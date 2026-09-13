# ReadQuest

ReadQuest is an adaptive children's reading platform for Morgan State University's COSC 512 Software Engineering course.

This repository begins with the shared architecture foundation. It intentionally keeps domain features small until the team approves the database ERD and API contracts.

## Architecture

```text
React frontend (Member 2)
        |
        | REST/JSON contracts (Members 1, 2, and 3)
        v
FastAPI application (Member 1)
        |
        | services/repositories (Members 1 and 3)
        v
PostgreSQL + adaptive engine (Member 3)
        |
        v
Docker, CI/CD, deployment (Member 3; team verifies)
```

## Start the foundation

1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. Open `http://localhost:8000/health`.
4. Open API documentation at `http://localhost:8000/docs`.

Load deterministic demonstration data:

```bash
docker compose --profile seed run --rm seed
```

Run the algorithms without the database:

```bash
cd backend
python -m app.cli.adaptive_demo
```

## Run backend tests

```bash
cd backend
python -m pip install -e ".[dev]"
pytest
```

## Team ownership

| Area | Driver | Required collaboration |
|---|---|---|
| API routes, authentication, RBAC | Member 1 | Member 3 reviews transaction and data implications; Member 2 reviews response usability. |
| React user experience | Member 2 | Member 1 agrees API contract; Member 3 agrees progress/recommendation fields. |
| PostgreSQL, models, migrations | Member 3 | Member 1 approves route/service requirements before schema freeze. |
| Adaptive engine | Member 3 | Full team approves thresholds, examples, and explainable reason codes. |
| Docker, CI/CD, deployment | Member 3 | Each teammate must reproduce the setup; Member 1 supplies API health/readiness behavior; Member 2 supplies frontend build requirements. |

See [`docs/BUILD_PROCESS.md`](docs/BUILD_PROCESS.md) for the complete sequence and collaboration gates.

For a code-learning walkthrough, read [`docs/learning/REMAINING_BUILD_PROCESSES.md`](docs/learning/REMAINING_BUILD_PROCESSES.md). Complete [`docs/learning/TEAM_REVIEW_CHECKLIST.md`](docs/learning/TEAM_REVIEW_CHECKLIST.md) before merging or releasing.
