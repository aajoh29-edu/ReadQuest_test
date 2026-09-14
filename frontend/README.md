# Frontend workspace

This directory contains the ReadQuest demo frontend used for local end-to-end
testing. It intentionally calls only the demo API routes; production
authentication and role-based flows still belong in the backend before release.

Run it with the full stack:

```bash
docker compose up --build
docker compose --profile seed run --rm seed
```

Open `http://localhost:8080`.

The browser displays the API's mastery score, band, recommendation, and
explanation fields. It does not duplicate the adaptive rules.
