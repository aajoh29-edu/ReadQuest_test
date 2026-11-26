"""Model bundle: training, persistence and cached loading."""

import hashlib
import json
import logging
import os
import threading
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml.corpus import Document, build_documents, normalised_level
from app.ml.difficulty import FEATURES, DifficultyEstimator
from app.ml.lm import NgramLanguageModel
from app.ml.success import SuccessModel, build_samples
from app.models.curriculum import Activity

logger = logging.getLogger(__name__)
MODEL_FILE = "readquest_model.json"
SCHEMA_VERSION = 1


def model_dir() -> Path:
    return Path(os.getenv("READQUEST_MODEL_DIR", "model_artifacts"))


def fingerprint(documents: list[Document]) -> str:
    digest = hashlib.sha256()
    for document in documents:
        digest.update(document.id.encode())
        digest.update(" ".join(document.tokens).encode())
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


def train_model(db: Session) -> ReadQuestModel:
    documents = build_documents(db)
    if not documents:
        raise ValueError("The database contains no published content to train on.")
    lm = NgramLanguageModel(order=3).fit(
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

    held_out_perplexity = 2 ** (
        sum(row[0] for row in features.values()) / len(features)
    )
    metadata = {
        "version": f"ngram3-lr1-{fingerprint(documents)[:12]}",
        "fingerprint": fingerprint(documents),
        "trainedAt": datetime.now(UTC).isoformat(),
        "corpus": {
            "documents": len(documents),
            "activities": sum(d.kind == "activity" for d in documents),
            "books": sum(d.kind == "book" for d in documents),
            "tokens": sum(len(d.tokens) for d in documents),
            "vocabulary": len(lm.vocabulary),
        },
        "languageModel": {
            "type": "interpolated trigram, absolute discounting",
            "leaveOneDocumentOutPerplexity": round(held_out_perplexity, 2),
        },
        "successModel": {
            "features": ["bias", "priorAccuracy", "priorExperience", "activityLevel", "textDifficulty"],
            "attempts": len(samples),
            "trainedOnAttempts": success.trained_on,
            "priorLogLoss": round(prior_loss, 4),
            "logLoss": round(success.log_loss(samples), 4),
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
    wanted = fingerprint(documents)
    with _lock:
        if _cached is not None and _cached.metadata.get("fingerprint") == wanted:
            return _cached
        try:
            loaded = ReadQuestModel.load()
            if loaded.metadata.get("fingerprint") == wanted:
                _cached = loaded
                return loaded
            logger.warning("Model artifact is stale for this database; retraining in memory.")
        except (FileNotFoundError, ValueError, KeyError, json.JSONDecodeError):
            pass
        _cached = train_model(db)
        return _cached
