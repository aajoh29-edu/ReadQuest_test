"""Functional smoke check through the same-origin frontend proxy."""
import http.cookiejar
import json
import os
import urllib.request


def main():
    base = os.environ.get("READQUEST_SMOKE_URL", "http://127.0.0.1:8080")
    password = os.environ.get("READQUEST_DEMO_PASSWORD")
    if not password:
        raise RuntimeError("explicit development seed password is required")
    client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def call(path, payload=None):
        request = urllib.request.Request(base + "/api" + path,
            data=json.dumps(payload).encode() if payload is not None else None,
            headers={"Content-Type": "application/json", "Origin": base})
        with client.open(request, timeout=10) as response:
            assert response.status in {200, 201}
            return json.load(response)
    assert call("/ready")["status"] == "ok"
    assert call("/auth/login", {"email": "child@readquest.example.org", "password": password})["role"] == "child"
    activities = call("/activities")
    assert len(activities) == 16 and all("correct_index" not in a["content"] for a in activities)
    result = call("/attempts", {"activity_id": activities[0]["id"], "selected_index": 0, "response_ms": 2400})
    assert result["attempt_id"] and result["mastery"] and result["recommendation"]
    with client.open(base, timeout=10) as response:
        assert b"ReadQuest" in response.read()
    print("Smoke passed: authenticated answer, mastery, recommendation and frontend proxy.")


if __name__ == "__main__":
    main()
