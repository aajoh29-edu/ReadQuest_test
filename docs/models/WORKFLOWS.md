# System models

## Actors and use cases

```mermaid
flowchart LR
  Child[Child reader] --> Login[Log in / log out / change password]
  Parent[Parent or guardian] --> Login
  Teacher[Teacher] --> Login
  Admin[Admin] --> Login
  Child --> Practice[Read published activities and submit an answer]
  Practice --> Adaptive[Update mastery and choose next practice]
  Child --> Progress[View own progress]
  Parent --> Family[Create child accounts; view linked children; join a class]
  Teacher --> Classroom[Create/archive classes; view enrolled learner progress]
  Admin --> Accounts[Provision/deactivate accounts]
  Admin --> Curriculum[Manage skills, lessons and activity mappings]
```

## Login

```mermaid
sequenceDiagram
  actor User
  participant UI as React
  participant API as Auth API
  participant DB as PostgreSQL
  User->>UI: Email and password
  UI->>API: POST /auth/login
  API->>DB: Load active user; serialize login throttling
  API->>API: Verify Argon2id hash
  alt valid credentials
    API->>DB: Store SHA-256 digest of random session token, expiry
    API-->>UI: HttpOnly session cookie; safe user profile
  else invalid or throttled
    API-->>UI: Generic 401 or 429
  end
```

## Start and submit activity

```mermaid
sequenceDiagram
  actor Child
  participant UI as React
  participant API as Production API
  participant Service as Adaptive workflow
  participant DB as PostgreSQL
  Child->>UI: Choose an activity
  UI->>API: GET /activities/{id} with session cookie
  API->>DB: Require published lesson, activity and skills
  API-->>UI: Prompt and choices, without answer key
  Child->>UI: Select answer
  UI->>API: POST /attempts with activity_id and selected_index
  API->>DB: Validate session; derive child and learner level
  API->>API: Score answer using stored correct_index
  API->>Service: Submit server-authored command
  Service->>DB: Lock child and sorted skills; insert attempt
  Service->>DB: Read evidence; upsert mastery; rank eligible activities
  Service->>DB: Persist recommendation; commit one transaction
  API-->>UI: Correctness, mastery and explained recommendation
  Note over API,DB: Any error rolls back the entire transaction
```

## Mastery progression

Bands are recalculated from the last ten attempts and may move in either direction. Cold-start evidence is not failure. Confidence is independent: low for 0–2, medium for 3–6, high for 7–10 samples.

```mermaid
stateDiagram-v2
  [*] --> Unassessed
  Unassessed --> HighPriority: first score below 0.60
  Unassessed --> Mastered: first score at least 0.90, low confidence
  HighPriority --> AdditionalPractice: score in [0.60, 0.75)
  AdditionalPractice --> NormalReview: score in [0.75, 0.90)
  NormalReview --> Mastered: score at least 0.90
  Mastered --> NormalReview: score drops below 0.90
  NormalReview --> AdditionalPractice: score drops below 0.75
  AdditionalPractice --> HighPriority: score drops below 0.60
```
