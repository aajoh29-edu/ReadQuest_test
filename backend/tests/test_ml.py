import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.ml import model as model_module
from app.ml.lm import NgramLanguageModel
from app.ml.model import ReadQuestModel, train_model
from app.ml.success import MIN_TRAINING_ATTEMPTS, Sample, SuccessModel, feature_vector
from app.models import Base, ReadingText
from app.models.curriculum import Learner
from app.seeds.demo import seed_demo
from app.services.voice import align_words, score_alignment
from app.utils.tokenizer import tokenize_text

SENTENCES = [["the", "cat", "sat"], ["the", "dog", "sat"], ["a", "cat", "ran"]]


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    with sessionmaker(engine, expire_on_commit=False)() as session:
        seed_demo(session)
        yield session


def test_language_model_is_a_distribution_and_remove_undoes_add() -> None:
    lm = NgramLanguageModel().fit(SENTENCES)
    history = ["the"]
    total = sum(lm.probability(word, history) for word in lm.vocabulary)
    assert 0.9 <= total <= 1.0
    assert lm.probability("cat", history) > lm.probability("ran", history)

    before = lm.perplexity(SENTENCES)
    lm.add([["the", "bird", "flew"]])
    lm.remove([["the", "bird", "flew"]])
    assert lm.perplexity(SENTENCES) == pytest.approx(before)
    clone = NgramLanguageModel.from_dict(lm.to_dict())
    assert clone.perplexity(SENTENCES) == pytest.approx(before)


def test_success_model_uses_prior_until_enough_attempts() -> None:
    few = [Sample(feature_vector(0.5, 3, 0.3, 0.5), 1)] * (MIN_TRAINING_ATTEMPTS - 1)
    assert SuccessModel().fit(few).trained_on == 0
    strong = feature_vector(0.95, 10, 0.3, 0.3)
    weak = feature_vector(0.1, 10, 0.3, 0.3)
    prior = SuccessModel()
    assert prior.predict(strong) > prior.predict(weak)

    samples = [Sample(strong, 1)] * 40 + [Sample(weak, 0)] * 40
    fitted = SuccessModel().fit(samples)
    assert fitted.trained_on == 80
    assert fitted.log_loss(samples) < prior.log_loss(samples)


def test_train_save_load_roundtrip_and_stale_artifact(db, tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("READQUEST_MODEL_DIR", str(tmp_path))
    monkeypatch.setattr(model_module, "_cached", None)
    trained = train_model(db)
    trained.save()
    loaded = ReadQuestModel.load()
    assert loaded.metadata["version"] == trained.metadata["version"]

    first = model_module.current_model(db)
    assert first.metadata["fingerprint"] == trained.metadata["fingerprint"]

    # A changed corpus must not be served by the stale artifact.
    text = db.scalars(select(ReadingText)).first()
    text.text = text.text + " extraordinary velociraptor"
    db.commit()
    monkeypatch.setattr(model_module, "_cached", None)
    refreshed = model_module.current_model(db)
    assert refreshed.metadata["fingerprint"] != trained.metadata["fingerprint"]


def test_tailored_lesson_is_deterministic(db, tmp_path, monkeypatch) -> None:
    from datetime import UTC, datetime

    from app.ml.tailor import tailored_lesson

    monkeypatch.setenv("READQUEST_MODEL_DIR", str(tmp_path))
    learner = Learner(id="child-ml", reading_level_id="level-1")
    db.add(learner)
    db.commit()
    now = datetime(2025, 1, 1, tzinfo=UTC)
    one = tailored_lesson(db, learner, size=5, now=now)
    two = tailored_lesson(db, learner, size=5, now=now)
    assert one["items"] == two["items"]
    assert 1 <= len(one["items"]) <= 5


def test_read_aloud_aligns_every_seeded_text(db) -> None:
    """Empirical evidence that read-aloud scoring works on all seeded passages."""
    texts = list(db.scalars(select(ReadingText)))
    assert texts
    for item in texts:
        words = tokenize_text(item.text)
        perfect = score_alignment(words, align_words(words, item.text), 10)
        assert perfect[0] == pytest.approx(1.0), item.id
        if len(words) > 1:
            garbled = " ".join(["zzz", *words[1:]])
            assert score_alignment(words, align_words(words, garbled), 10)[0] < 1.0, item.id
