# ReadQuest logical ERD — v1

GitHub renders this Mermaid diagram directly. The detailed field rules are in `DATA_DICTIONARY.md`.

```mermaid
erDiagram
    USERS ||--o| CHILD_PROFILES : "has child profile"
    USERS ||--o{ GUARDIAN_CHILDREN : "guardian links"
    CHILD_PROFILES ||--o{ GUARDIAN_CHILDREN : "is linked"
    USERS ||--o{ CLASSES : "teacher owns"
    CLASSES ||--o{ ENROLLMENTS : contains
    CHILD_PROFILES ||--o{ ENROLLMENTS : joins
    LESSONS ||--o{ ACTIVITIES : contains
    ACTIVITIES ||--|{ ACTIVITY_SKILLS : assesses
    SKILLS ||--o{ ACTIVITY_SKILLS : mapped_by
    CHILD_PROFILES ||--o{ ATTEMPTS : completes
    ACTIVITIES ||--o{ ATTEMPTS : receives
    CHILD_PROFILES ||--o{ SKILL_MASTERY : develops
    SKILLS ||--o{ SKILL_MASTERY : measured_for
    CHILD_PROFILES ||--o{ RECOMMENDATIONS : receives
    ACTIVITIES ||--o{ RECOMMENDATIONS : selected_as
    ATTEMPTS o|--o{ RECOMMENDATIONS : triggers

    USERS {
        uuid id PK
        citext email UK
        varchar password_hash
        user_role role
        user_status status
        timestamptz created_at
        timestamptz updated_at
    }
    CHILD_PROFILES {
        uuid id PK
        uuid user_id FK,UK
        varchar display_name
        smallint grade_level
        smallint current_level
    }
    GUARDIAN_CHILDREN {
        uuid guardian_id PK,FK
        uuid child_id PK,FK
        varchar relationship_label
        timestamptz created_at
    }
    CLASSES {
        uuid id PK
        uuid teacher_id FK
        varchar name
        varchar join_code UK
        class_status status
    }
    ENROLLMENTS {
        uuid class_id PK,FK
        uuid child_id PK,FK
        enrollment_status status
        timestamptz enrolled_at
    }
    SKILLS {
        uuid id PK
        varchar code UK
        varchar name
        varchar category
        smallint level
        content_status status
    }
    LESSONS {
        uuid id PK
        varchar title
        text description
        integer sequence
        content_status status
    }
    ACTIVITIES {
        uuid id PK
        uuid lesson_id FK
        varchar title
        activity_type activity_type
        text prompt
        jsonb content
        smallint difficulty
        integer sequence
        content_status status
    }
    ACTIVITY_SKILLS {
        uuid activity_id PK,FK
        uuid skill_id PK,FK
        numeric weight
    }
    ATTEMPTS {
        uuid id PK
        uuid child_id FK
        uuid activity_id FK
        boolean is_correct
        integer response_ms
        jsonb answer
        timestamptz occurred_at
        timestamptz created_at
    }
    SKILL_MASTERY {
        uuid child_id PK,FK
        uuid skill_id PK,FK
        numeric score
        mastery_band band
        mastery_confidence confidence
        integer attempt_count
        timestamptz last_practiced_at
        varchar algorithm_version
        integer version
        timestamptz updated_at
    }
    RECOMMENDATIONS {
        uuid id PK
        uuid child_id FK
        uuid activity_id FK
        uuid triggering_attempt_id FK
        numeric priority_score
        varchar reason_code
        jsonb reason_details
        varchar algorithm_version
        recommendation_status status
        timestamptz created_at
    }
```

## Main adaptive path

`child_profiles → attempts → activity_skills → skills → skill_mastery → recommendations → activities`

This path is the central technical contribution: a completed activity becomes durable evidence, updates per-skill mastery, and produces an explainable next activity.

