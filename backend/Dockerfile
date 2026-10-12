# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY pyproject.toml requirements.lock requirements-dev.lock ./

FROM base AS runtime-deps
RUN --mount=type=secret,id=cloud_ca,target=/tmp/cloud-ca.pem \
    if [ -s /tmp/cloud-ca.pem ]; then export PIP_CERT=/tmp/cloud-ca.pem; fi; \
    pip install --no-cache-dir --require-hashes -r requirements.lock

FROM base AS test-deps
RUN --mount=type=secret,id=cloud_ca,target=/tmp/cloud-ca.pem \
    if [ -s /tmp/cloud-ca.pem ]; then export PIP_CERT=/tmp/cloud-ca.pem; fi; \
    pip install --no-cache-dir --require-hashes -r requirements-dev.lock

FROM test-deps AS test
COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic
COPY tests ./tests
COPY tests_helper.py ./
RUN pip install --no-deps --no-build-isolation -e .
CMD ["python", "-m", "pytest", "-v"]

FROM runtime-deps AS runtime
RUN addgroup --system readquest && adduser --system --ingroup readquest readquest
COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic
RUN pip install --no-deps --no-build-isolation . && chmod -R a+rX /app
USER readquest
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
