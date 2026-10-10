# Deployment, release and rollback

Local Compose is verified; hosted deployment is BLOCKED until a provider, TLS origin, database, credentials and release tag are configured. No tag or image was published during this local run.

## Production configuration

Use Compose 2.24.4+ and combine `compose.yaml` with `compose.production.yaml`. Supply tagged `READQUEST_API_IMAGE` and `READQUEST_FRONTEND_IMAGE`, an external `READQUEST_DATABASE_URL` using unique credentials (with provider-required TLS options), and `READQUEST_ALLOWED_ORIGINS` as a JSON list of actual HTTPS frontend origins. Supply `POSTGRES_DB`, `POSTGRES_USER` and `POSTGRES_PASSWORD` securely if resolving the optional local-production-db service; it is excluded from normal production startup and has no published port. No credential values belong in Git. Do not use `.env.example`'s development database password in production.

Terminate HTTPS at the provider/reverse proxy. Session cookies are Secure+HttpOnly+SameSite in production; the frontend uses a same-origin `/api` proxy. The API binds its production published port to loopback. Configure private database networking, backups and provider `/ready` health verification before traffic.

## Release

1. Require CI jobs backend-quality, postgres-integration, frontend-quality, python-security and compose-smoke on pull requests. A repository admin must configure hosted branch protection; workflow YAML alone cannot prevent merges.
2. Complete the review checklist and choose an annotated release tag after CI succeeds.
3. `release.yml` publishes both API and frontend images with immutable version/SHA tags. A configured deployment hook is optional; no hook or provider was supplied for this run.
4. Back up PostgreSQL and run the release API image once with `alembic upgrade head`; migration must finish before the API starts.
5. Run `python -m app.cli.create_admin` explicitly for a new database. Read the bootstrap password interactively or from `READQUEST_BOOTSTRAP_PASSWORD` securely injected at runtime; never log/store it in scripts.
6. Start API/frontend, verify `/ready`, and smoke-test login, child submission, guardian/teacher scope and admin authoring using fictitious test accounts. Production demo endpoints and seed commands must be rejected.
7. Record image digests, revision, hosted CI run and provider results. Resolve the child-data retention/consent policy before enrolling real children.

## Rollback

Stop new traffic, restore the preceding API/frontend image tags, and check schema compatibility. Revision 0002's downgrade deletes sessions and throttles; users must log in again. Use downgrade only with an explicit backup and compatible evidence; otherwise restore the pre-migration backup. Verify readiness and authenticated workflows before restoring traffic. Migration downgrade/upgrade is tested locally, but a provider traffic/image/database rollback rehearsal remains BLOCKED without a deployment target.

`bridge/` is an archived generated Docker Desktop reference; do not use it as production manifests. Its limitations are documented in `bridge/README.md`.
