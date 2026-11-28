"""Train the ReadQuest language and learner models from the configured database.

Usage:  python -m app.ml.train [--output DIR] [--report]
Reads DATABASE_URL; writes readquest_model.json to READQUEST_MODEL_DIR (or --output).
"""

import argparse
import json
from pathlib import Path

from app.database import SessionLocal
from app.ml.model import NoTrainingContentError, model_dir, train_model


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=None, help="artifact directory")
    parser.add_argument("--report", action="store_true", help="print training metadata")
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
    path = model.save(args.output or model_dir())
    print(f"Saved {model.metadata['version']} to {path}")
    if args.report:
        print(json.dumps(model.metadata, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
