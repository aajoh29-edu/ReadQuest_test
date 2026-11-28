"""Full learner journey: sign-up -> practice -> mastery -> tailored lesson -> read aloud."""

import pytest

from .conftest import Api


def graded_attempt(api: Api, session_id: str, activity: dict, option_index: int, key: str) -> dict:
    response = api.post(
        f"/api/v1/sessions/{session_id}/attempts",
        json={
            "activityId": activity["id"],
            "selectedOptionId": activity["options"][option_index]["id"],
            "idempotencyKey": key,
            "activeDurationSeconds": 8,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["gradedAnswer"]


def test_health_and_read_aloud_capabilities(new_api) -> None:
    api = new_api()
    assert api.get("/health").json() == {"status": "ok"}
    capabilities = api.get("/api/v1/read-aloud/capabilities").json()
    assert capabilities["readAloud"]["supported"] is True
    assert capabilities["readAloud"]["textsByType"]["word"] > 0
    assert capabilities["speechRecognition"]["location"] == "browser"
    assert capabilities["serverScoring"]["audioStored"] is False


def test_learner_journey_with_tailoring_and_read_aloud(new_api) -> None:
    api = new_api()
    api.register()
    learner = api.create_learner()
    learner_id = learner["id"]

    lesson = api.get("/api/v1/curriculum/lessons?readingLevelId=level-1").json()[0]
    assert all("isCorrect" not in o for a in lesson["activities"] for o in a["options"])

    # Cold start: nothing is assessed yet, but a lesson is still produced.
    cold = api.get(f"/api/v1/learners/{learner_id}/tailored-lesson?size=4")
    assert cold.status_code == 200, cold.text
    cold_body = cold.json()
    assert len(cold_body["items"]) == 4
    assert {item["band"] for item in cold_body["items"]} == {"unknown"}
    assert cold_body["modelVersion"].startswith("ngram3-lr1-")

    session = api.post(
        "/api/v1/sessions", json={"lessonId": lesson["id"], "learnerId": learner_id}
    ).json()
    activity = session["activities"][0]
    skill_id = activity["primarySkillId"]

    # Find one wrong and one right option through server grading.
    wrong = None
    for index in range(len(activity["options"])):
        graded = graded_attempt(api, session["id"], activity, index, f"probe-{index}")
        if not graded["isCorrect"]:
            wrong = graded
            break
    assert wrong is not None, "expected at least one incorrect option"

    # Retrying the same key never creates a second attempt (UR-17).
    before = len(api.get(f"/api/v1/learners/{learner_id}/attempts").json())
    replay = graded_attempt(api, session["id"], activity, 0, wrong["idempotencyKey"])
    assert replay["idempotencyKey"] == wrong["idempotencyKey"]
    assert replay["isCorrect"] is False
    assert len(api.get(f"/api/v1/learners/{learner_id}/attempts").json()) == before

    mastery = {m["skillId"]: m for m in api.get(f"/api/v1/learners/{learner_id}/mastery").json()}
    assert mastery[skill_id]["totalAttemptCount"] == before
    assert mastery[skill_id]["band"] in {"needs_focus", "developing", "proficient"}

    # The tailored lesson reacts to the evidence and explains itself (UR-15).
    warm = api.get(f"/api/v1/learners/{learner_id}/tailored-lesson?size=10").json()
    assert 1 <= len(warm["items"]) <= 10
    for item in warm["items"]:
        assert item["reason"] and 0 < item["predictedSuccess"] < 1
        if item["skillId"] in mastery:
            assert item["band"] == mastery[item["skillId"]]["band"]
    assert [item["order"] for item in warm["items"]] == list(range(1, len(warm["items"]) + 1))
    assert 1 <= len(warm["books"]) <= 3

    # Read aloud requires guardian consent, then misread words steer the lesson.
    text = api.get("/api/v1/read-aloud-activities/act-letter_sounds-sentence-01").json()
    submission = {
        "activity_id": text["activity_id"],
        "transcript": text["text"],
        "duration_seconds": 10,
    }
    denied = api.post(f"/api/v1/children/{learner_id}/read-aloud", json=submission)
    assert denied.status_code == 403
    granted = api.post(
        f"/api/v1/children/{learner_id}/voice-consent", json={"granted": True}
    )
    assert granted.status_code == 200, granted.text

    perfect = api.post(f"/api/v1/children/{learner_id}/read-aloud", json=submission)
    assert perfect.status_code == 201, perfect.text
    assert perfect.json()["accuracy"] == pytest.approx(1.0)

    words = text["text"].split()
    misread = {**submission, "transcript": " ".join(["zebra", *words[1:]])}
    flawed = api.post(f"/api/v1/children/{learner_id}/read-aloud", json=misread)
    assert flawed.status_code == 201, flawed.text
    assert flawed.json()["accuracy"] < 1.0

    steered = api.get(f"/api/v1/learners/{learner_id}/tailored-lesson").json()
    expected_word = words[0].strip(".,!?").lower()
    assert expected_word in steered["practiceWords"]


def test_authorization_boundaries(new_api) -> None:
    owner = new_api()
    owner.register("Owner Parent")
    learner_id = owner.create_learner()["id"]

    stranger = new_api()
    stranger.register("Other Parent")
    for path in (
        f"/api/v1/learners/{learner_id}",
        f"/api/v1/learners/{learner_id}/mastery",
        f"/api/v1/learners/{learner_id}/tailored-lesson",
    ):
        assert stranger.get(path).status_code == 403, path
    consent = stranger.post(
        f"/api/v1/children/{learner_id}/voice-consent", json={"granted": True}
    )
    assert consent.status_code == 403

    anonymous = new_api()
    assert anonymous.get(f"/api/v1/learners/{learner_id}/tailored-lesson").status_code == 401
    assert anonymous.get("/api/v1/ml/model").status_code == 401

    # State-changing calls without the CSRF token are rejected.
    missing_csrf = owner.client.post(
        "/api/v1/learners",
        json={"name": "X", "avatar": "fox", "avatarName": "F", "readingLevelId": "level-1", "gradeLevel": "1"},
    )
    assert missing_csrf.status_code == 403

    assert owner.post("/api/v1/auth/logout").status_code == 204
    assert owner.get("/api/v1/auth/me").status_code == 401
