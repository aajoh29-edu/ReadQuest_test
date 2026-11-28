"""Train the ReadQuest language and learner models from the configured database.

Usage:  python -m app.ml.train [--output DIR] [--report] [--dry-run]
Reads DATABASE_URL; writes readquest_model.json to READQUEST_MODEL_DIR (or --output).
"""

import argparse
import json
import logging
import subprocess
from pathlib import Path

from app.db import SessionLocal
from app.ml.model import NoTrainingContentError, model_dir, train_model

logger = logging.getLogger(__name__)


def git_commit() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=Path(__file__).resolve().parent,
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip() or "unknown"
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=None, help="artifact directory")
    parser.add_argument("--report", action="store_true", help="print training metadata")
    parser.add_argument("--dry-run", action="store_true", help="train without saving an artifact")
    args = parser.parse_args(argv)
    try:
        with SessionLocal() as db:
            model = train_model(db)
    except NoTrainingContentError as error:
        parser.exit(
            1,
            f"{error} Load published curriculum and retry. "
            "For the Docker development stack, run `make seed` first.\n",
        )
    model.metadata.setdefault("gitCommit", git_commit())
    logger.info(
        "Trained %s with fingerprint %s",
        model.metadata["version"],
        model.metadata["fingerprint"],
    )
    logger.info("Language model: %s", model.metadata["languageModel"])
    logger.info("Success model: %s", model.metadata["successModel"])
    if args.dry_run:
        logger.info("Dry run finished without saving an artifact.")
    else:
        path = model.save(args.output or model_dir())
        logger.info("Saved %s to %s", model.metadata["version"], path)
    if args.report:
        print(json.dumps(model.metadata, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
