#!/bin/bash
# Exit immediately if any command fails
set -e

echo "Running Alembic database migrations..."
alembic upgrade head

echo "Starting FastAPI server..."
# 'exec' replaces the shell process with uvicorn, ensuring it handles stop signals correctly
exec uvicorn main:app --host 0.0.0.0 --port 8000