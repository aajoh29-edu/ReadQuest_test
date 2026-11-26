FROM python:3.13-slim@sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90 AS deps

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app
COPY pyproject.toml README.md ./
COPY app ./app
RUN python -m pip install --upgrade pip==26.2.2 \
    && python -m pip wheel --no-cache-dir --wheel-dir /wheels .

FROM deps AS dev

COPY . .
RUN python -m pip install --no-cache-dir -e ".[dev]"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM dev AS test

CMD ["python", "-m", "pytest", "-q"]

FROM deps AS audit

RUN python -m pip install --no-cache-dir pip-audit==2.10.0 \
    && python -m pip install --no-cache-dir /wheels/readquest_backend-*.whl \
    && python -m pip uninstall -y readquest-backend
CMD ["pip-audit", "--local"]

FROM python:3.13-slim@sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90 AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY --from=deps /wheels /wheels
COPY alembic ./alembic
COPY alembic.ini ./
RUN python -m pip install --no-cache-dir /wheels/readquest_backend-*.whl \
    && groupadd --gid 10001 readquest \
    && useradd --uid 10001 --gid readquest --create-home --shell /usr/sbin/nologin readquest \
    && mkdir -p /var/lib/readquest/models \
    && chown -R readquest:readquest /var/lib/readquest \
    && rm -rf /wheels

ENV READQUEST_MODEL_DIR=/var/lib/readquest/models
VOLUME ["/var/lib/readquest/models"]

USER readquest
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
