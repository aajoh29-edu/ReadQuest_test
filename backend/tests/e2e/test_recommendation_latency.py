"""Check steady-state recommendation latency against SR-N04."""

from math import ceil
from time import perf_counter

import pytest


@pytest.mark.parametrize(
    ("endpoint", "result_key"),
    [
        ("adaptive-recommendation", "lessonId"),
        ("tailored-lesson?size=10", "items"),
    ],
)
def test_recommendation_p95_under_one_second(new_api, endpoint, result_key) -> None:
    api = new_api()
    api.register()
    learner_id = api.create_learner()["id"]
    path = f"/api/v1/learners/{learner_id}/{endpoint}"

    # Warm the model and HTTP connection before measuring steady-state requests.
    warmup = api.get(path)
    assert warmup.status_code == 200, warmup.text
    assert warmup.json()[result_key]

    sample_count = 40
    durations = []
    for _ in range(sample_count):
        started = perf_counter()
        response = api.get(path)
        durations.append(perf_counter() - started)
        assert response.status_code == 200, response.text
        assert response.json()[result_key]

    p95 = sorted(durations)[ceil(0.95 * sample_count) - 1]
    assert p95 < 1.0, f"{endpoint} p95 was {p95:.3f}s over {sample_count} requests, expected < 1s"
