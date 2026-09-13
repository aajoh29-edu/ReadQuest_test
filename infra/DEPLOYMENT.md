# ReadQuest deployment and release process

The deployment design is container-provider-neutral. GitHub Actions publishes the API image to GitHub Container Registry (GHCR). A provider such as Render can pull the image and use a managed PostgreSQL database.

## Required production configuration

- `READQUEST_API_IMAGE`: tagged GHCR image, never an unpinned local build.
- `READQUEST_DATABASE_URL`: production PostgreSQL connection string.
- `READQUEST_ENV=production`: disables interactive API documentation.
- Provider health path: `/ready`.
- Database backups enabled before production migrations.

## Release sequence

1. All pull-request checks pass and the full team approves the release candidate.
2. Member 3 creates an annotated version tag such as `v0.1.0`.
3. `release.yml` builds and publishes immutable tag and commit-SHA images.
4. The deployment platform starts a one-time `alembic upgrade head` job.
5. The platform starts the API image and checks `/ready`.
6. The team performs the child attempt → mastery → recommendation smoke test.
7. Member 3 records the image tag, migration revision, test run, and known limitations.

## Rollback

1. Stop new deployment traffic if the provider supports it.
2. Restore the preceding image tag.
3. Downgrade the migration only if the revision explicitly supports safe downgrade and no new incompatible data must be preserved.
4. Otherwise restore the pre-migration database backup.
5. Run `/ready` and the adaptive smoke test.

## Collaboration gate

- **Member 1:** Reviews production authentication, CORS, logging, exception handling, and readiness behavior.
- **Member 2:** Verifies the production API base URL and complete learner/parent/teacher workflows.
- **Member 3:** Owns images, secrets wiring, migrations, deployment, health verification, and rollback documentation.
- **Full team:** Approves the release tag and completes a rehearsal before the final demonstration.

