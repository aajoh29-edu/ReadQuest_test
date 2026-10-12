# ReadQuest ERD review guide

**Status:** Accepted for the authorized test run. Models/migrations are implemented and locally verified; hosted release requirements remain in the tracker.

## 1. How to read the diagram

- **Blue entities** define curriculum: skills, lessons, activities, and activity-to-skill mappings.
- **Dark navy entities** define identity and classroom relationships.
- **Gold entities** contain learner evidence or state: attempts, mastery, and recommendations.
- `PK` means primary key, `FK` means foreign key, and `UQ` means unique.
- `1 to many` means one parent record can connect to several child records.
- Join entities (`guardian_children`, `enrollments`, and `activity_skills`) resolve many-to-many relationships.

## 2. Design decisions

### Attempts are immutable evidence

An attempt records what happened at a point in time. The application should insert attempts, not edit their correctness later. If administrative correction becomes necessary, use an auditable correction policy rather than silently changing history.

### Mastery is derived state

`skill_mastery` is a fast current summary. It can be recalculated from attempts and configuration. This table uses `(child_id, skill_id)` as its key because a child has only one current mastery record per skill.

### Recommendations are auditable

The application stores the selected activity, priority score, reason code, and algorithm/configuration version. This allows the team to explain why an activity appeared and reproduce final-project demonstrations.

### API schemas are not database models

The production API defines separate request/response schemas for each endpoint. The frontend should not receive password hashes, internal version counters, deleted timestamps, or every database column.

## 3. Relationship walkthrough

1. A `users` row supplies authentication identity and one role.
2. A child-role user has one `child_profiles` row.
3. Parent users connect to children through `guardian_children`.
4. Teacher users own `classes`; children join through `enrollments`.
5. A `lesson` contains ordered `activities`.
6. An activity exercises one or more `skills` through `activity_skills`.
7. A child completes an activity, creating an `attempt`.
8. The adaptive service updates the child's `skill_mastery` for every linked skill.
9. The recommendation service selects an eligible activity and stores a `recommendations` audit row.

## 4. Implemented deletion policy

| Parent | Child data | Behavior | Reason |
|---|---|---|---|
| user | child profile | Restrict normal delete; deactivate user | Preserve learning history. |
| child profile | attempts/mastery/recommendations | Restrict; privacy erasure uses a controlled service | Avoid accidental loss and support explicit privacy handling. |
| lesson | activities | Restrict whenever activities reference the lesson | Historical attempts must continue to reference meaningful content. |
| activity | activity_skills | Cascade | Join rows have no meaning without the activity. |
| skill | activity_skills | Restrict when used | Prevent orphaned curriculum mappings. |
| class | enrollments | Cascade | Enrollment is scoped to a class. |

Soft-deactivation is preferred for users and published curriculum. A later privacy requirement may add anonymization; the team must not invent that policy inside a route.

## 5. Required team review

### Member 1 — Backend and architecture lead

- Map every MVP endpoint to its database reads and writes.
- Confirm authentication identities and roles are sufficient.
- Approve the attempt transaction: insert attempt, update mastery, store recommendation.
- Identify response fields that should not mirror ORM objects.
- Confirm deletion and authorization behaviors.

### Member 2 — Frontend and UX lead

- Confirm the child activity screen has all necessary activity fields.
- Confirm parent/teacher dashboards can display mastery, band, confidence, last practice, and recommendation explanation.
- Identify presentation-only labels that belong in the API response rather than the database.
- Verify no frontend workflow requires direct database access or client-side score calculation.

### Full team

- Confirm the MVP user stories trace to entities.
- Approve age-appropriate data collection and minimum personally identifiable information.
- Resolve every item in `OPEN_QUESTIONS.md`.
- Record approval in the pull request before Member 3 creates SQLAlchemy models.

## 6. Exit checklist

- [x] Diagram cardinalities reviewed by Member 1.
- [x] Dashboard fields reviewed by Member 2.
- [x] Role and child-privacy choices approved by all three members.
- [x] Data dictionary contains every proposed field, constraint, and index.
- [x] Requirement traceability has no unmapped MVP requirement.
- [x] Open questions have decisions or assigned owners and due dates.
- [x] ADR-0002 status changed from Proposed to Accepted.


Auth sessions reference users with CASCADE; all remaining FK deletion rules and exact fields are in docs/models/ERD.md. Mermaid is the canonical current diagram; the Graphviz source also reflects all fourteen tables.
