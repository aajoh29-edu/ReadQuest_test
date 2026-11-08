#!/bin/bash
# Exit immediately if any command fails
set -e

echo "Running Alembic database migrations..."
alembic upgrade head

echo "Seeding deterministic demo data..."
python seed.py

echo "Starting FastAPI server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000