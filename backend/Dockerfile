FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY pyproject.toml ./
COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic

# Test stage: adds dev dependencies (pytest, ruff, ...) and the test suite.
# Never reachable from the runtime stage below, so it never ships to prod.
FROM base AS test
COPY tests ./tests
RUN pip install --no-cache-dir -e '.[dev]'
CMD ["pytest", "-v"]

# Runtime stage: the default build target (last stage wins when --target is
# omitted), so `docker build ./backend` and `docker compose build api` are
# unaffected. Only the paths listed above are ever copied in - no tests.
FROM base AS runtime
RUN addgroup --system readquest && adduser --system --ingroup readquest readquest
RUN pip install --no-cache-dir .

USER readquest
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
