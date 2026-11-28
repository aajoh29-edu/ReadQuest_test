"""Model bundle: training, persistence and cached loading."""

import hashlib
import json
import logging
import os
import threading
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ml.corpus import Document, build_documents, normalised_level
from app.ml.difficulty import FEATURES, DifficultyEstimator
from app.ml.lm import NgramLanguageModel
from app.ml.success import SuccessModel, auc, build_samples, split_by_learner
from app.models.curriculum import Activity
from app.models.progress import Attempt

logger = logging.getLogger(__name__)
MODEL_FILE = "readquest_model.json"
SCHEMA_VERSION = 1


class NoTrainingContentError(ValueError):
    """The configured database has no published, trainable curriculum."""


def model_dir() -> Path:
    return Path(os.getenv("READQUEST_MODEL_DIR", "model_artifacts"))


def attempt_marker(db: Session) -> str:
    interval = max(1, int(os.getenv("READQUEST_RETRAIN_EVERY_ATTEMPTS", "25")))
    count = db.scalar(select(func.count()).select_from(Attempt))
    return f"attempts:{count // interval}"


def fingerprint(documents: list[Document], attempts: str = "") -> str:
    digest = hashlib.sha256()
    for document in sorted(documents, key=lambda item: item.id):
        digest.update(document.id.encode())
        digest.update(b"\x00")
        digest.update(" ".join(document.tokens).encode())
        digest.update(b"\x01")
    digest.update(attempts.encode())
    return digest.hexdigest()


@dataclass
class ReadQuestModel:
    lm: NgramLanguageModel
    estimator: DifficultyEstimator
    success: SuccessModel
    document_difficulty: dict[str, float]
    document_level: dict[str, float]
    metadata: dict = field(default_factory=dict)

    def difficulty_of(self, document: Document) -> float:
        known = self.document_difficulty.get(document.id)
        return known if known is not None else self.estimator.difficulty(document.sentences)

    def to_dict(self) -> dict:
        return {
            "schema": SCHEMA_VERSION,
            "metadata": self.metadata,
            "lm": self.lm.to_dict(),
            "scaler": self.estimator.scaler,
            "success": {
                "weights": self.success.weights,
                "trainedOn": self.success.trained_on,
            },
            "documentDifficulty": self.document_difficulty,
            "documentLevel": self.document_level,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ReadQuestModel":
        if data.get("schema") != SCHEMA_VERSION:
            raise ValueError("Unsupported model schema.")
        lm = NgramLanguageModel.from_dict(data["lm"])
        return cls(
            lm=lm,
            estimator=DifficultyEstimator(lm, data["scaler"]),
            success=SuccessModel(data["success"]["weights"], data["success"]["trainedOn"]),
            document_difficulty=data["documentDifficulty"],
            document_level=data["documentLevel"],
            metadata=data["metadata"],
        )

    def save(self, directory: Path | None = None) -> Path:
        target = (directory or model_dir()) / MODEL_FILE
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix(".tmp")
        temporary.write_text(json.dumps(self.to_dict(), separators=(",", ":")), encoding="utf-8")
        temporary.replace(target)
        return target

    @classmethod
    def load(cls, directory: Path | None = None) -> "ReadQuestModel":
        path = (directory or model_dir()) / MODEL_FILE
        return cls.from_dict(json.loads(path.read_text(encoding="utf-8")))


def train_model(
    db: Session, documents: list[Document] | None = None, attempts: str | None = None
) -> ReadQuestModel:
    documents = build_documents(db) if documents is None else documents
    if not documents:
        raise NoTrainingContentError("The database contains no published content to train on.")
    attempts = attempt_marker(db) if attempts is None else attempts
    corpus_fingerprint = fingerprint(documents, attempts)
    order = int(os.getenv("READQUEST_LM_ORDER", "3"))
    lm = NgramLanguageModel(order=order).fit(
        sentence for document in documents for sentence in document.sentences
    )
    estimator, features = DifficultyEstimator.fit(lm, documents)
    difficulty = {
        document_id: estimator.index(row) for document_id, row in features.items()
    }
    levels = {document.id: document.level for document in documents}

    activity_ids = {
        activity.id: normalised_level(activity) for activity in db.scalars(select(Activity))
    }
    samples = build_samples(
        db,
        {key.removeprefix("activity:"): value for key, value in difficulty.items() if key.startswith("activity:")},
        activity_ids,
    )
    success = SuccessModel()
    prior_loss = success.log_loss(samples)
    success.fit(samples)

    fraction = float(os.getenv("READQUEST_VALIDATION_FRACTION", "0.2"))
    split_seed = 42
    training, validation = split_by_learner(samples, fraction, split_seed)
    validation_model = SuccessModel().fit(training) if validation else SuccessModel()
    validation_prior_loss = SuccessModel().log_loss(validation) if validation else None
    validation_loss = validation_model.log_loss(validation) if validation else None
    validation_auc = auc(validation_model, validation)
    if validation_loss is not None and validation_loss >= validation_prior_loss:
        logger.warning(
            "Learner-held-out log loss (%.4f) did not improve on the prior (%.4f).",
            validation_loss,
            validation_prior_loss,
        )

    token_counts = {document.id: len(document.tokens) for document in documents}
    token_count = sum(token_counts.values())
    held_out_perplexity = 2 ** (
        sum(row[0] * token_counts[document_id] for document_id, row in features.items())
        / (token_count or 1)
    )
    metadata = {
        "version": f"ngram{order}-lr1-{corpus_fingerprint[:12]}",
        "fingerprint": corpus_fingerprint,
        "trainedAt": datetime.now(UTC).isoformat(),
        "corpus": {
            "documents": len(documents),
            "activities": sum(d.kind == "activity" for d in documents),
            "books": sum(d.kind == "book" for d in documents),
            "tokens": token_count,
            "vocabulary": len(lm.vocabulary),
        },
        "languageModel": {
            "type": f"interpolated {order}-gram, absolute discounting",
            "leaveOneDocumentOutPerplexity": round(held_out_perplexity, 2),
        },
        "successModel": {
            "features": ["bias", "priorAccuracy", "priorExperience", "activityLevel", "textDifficulty"],
            "attempts": len(samples),
            "trainedOnAttempts": success.trained_on,
            "priorLogLoss": round(prior_loss, 4),
            "logLoss": round(success.log_loss(samples), 4),
            "split": {"by": "learner", "fraction": fraction, "seed": split_seed},
            "validation": {
                "learnersHeldOut": len({sample.child_id for sample in validation}),
                "attempts": len(validation),
                "trainedOnAttempts": validation_model.trained_on,
                "priorLogLoss": round(validation_prior_loss, 4) if validation_prior_loss is not None else None,
                "logLoss": round(validation_loss, 4) if validation_loss is not None else None,
                "auc": round(validation_auc, 4) if validation_auc is not None else None,
            },
        },
        "difficultyFeatures": list(FEATURES),
    }
    return ReadQuestModel(lm, estimator, success, difficulty, levels, metadata)


_lock = threading.Lock()
_cached: ReadQuestModel | None = None


def current_model(db: Session, documents: list[Document] | None = None) -> ReadQuestModel:
    """Return a model matching the current corpus: cache, then artifact, then train."""
    global _cached
    documents = documents if documents is not None else build_documents(db)
    attempts = attempt_marker(db)
    wanted = fingerprint(documents, attempts)
    order = int(os.getenv("READQUEST_LM_ORDER", "3"))
    with _lock:
        if _cached is not None and _cached.metadata.get("fingerprint") == wanted and _cached.lm.order == order:
            return _cached
        try:
            loaded = ReadQuestModel.load()
            if loaded.metadata.get("fingerprint") == wanted and loaded.lm.order == order:
                _cached = loaded
                return loaded
            logger.warning("Model artifact is stale for this database; retraining in memory.")
        except FileNotFoundError:
            logger.info("Model artifact was not found; training in memory.")
        except (ValueError, KeyError) as error:
            logger.warning("Model artifact could not be loaded; training in memory: %s", error)
        _cached = train_model(db, documents=documents, attempts=attempts)
        return _cached
