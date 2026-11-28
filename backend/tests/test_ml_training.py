from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.ml.corpus import Document
from app.ml.model import fingerprint, train_model
from app.ml.success import Sample, SuccessModel, auc, feature_vector, split_by_learner
from app.models import Base
from app.seeds.demo import seed_demo


def test_fingerprint_is_order_independent_and_includes_attempts() -> None:
    first = Document("ab", "book", None, 0.5, [["c"]])
    second = Document("a", "book", None, 0.5, [["bc"]])
    assert fingerprint([first, second], "attempts:0") == fingerprint(
        [second, first], "attempts:0"
    )
    assert fingerprint([first], "attempts:0") != fingerprint([first], "attempts:1")
    assert fingerprint([first]) != fingerprint([second])


def test_split_holds_out_whole_learners_deterministically() -> None:
    samples = [Sample([], label, child_id) for child_id in "abcde" for label in (0, 1)]
    training, validation = split_by_learner(samples, seed=42)
    assert (training, validation) == split_by_learner(samples, seed=42)
    training_ids = {sample.child_id for sample in training}
    validation_ids = {sample.child_id for sample in validation}
    assert len(validation_ids) == 1
    assert training_ids.isdisjoint(validation_ids)
    assert len(training) + len(validation) == len(samples)
    assert split_by_learner(samples[:2]) == (samples[:2], [])


def test_auc_counts_correct_rankings_and_ties() -> None:
    model = SuccessModel()
    positive = Sample(feature_vector(0.9, 1, 0.5, 0.5), 1)
    negative = Sample(feature_vector(0.1, 1, 0.5, 0.5), 0)
    assert auc(model, [positive, negative]) == 1.0
    assert auc(model, [positive, Sample(positive.features, 0)]) == 0.5
    assert auc(model, [positive]) is None


def test_seeded_training_reports_validation_and_configured_order(monkeypatch) -> None:
    monkeypatch.setenv("READQUEST_LM_ORDER", "2")
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        seed_demo(db)
        metadata = train_model(db).metadata

    assert metadata["version"].startswith("ngram2-lr1-")
    assert "2-gram" in metadata["languageModel"]["type"]
    assert metadata["successModel"]["validation"] == {
        "learnersHeldOut": 0,
        "attempts": 0,
        "trainedOnAttempts": 0,
        "priorLogLoss": None,
        "logLoss": None,
        "auc": None,
    }
