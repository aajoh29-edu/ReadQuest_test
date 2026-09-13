# ADR-0002: Logical data model

**Status:** Proposed

## Context

ReadQuest must persist role-based relationships, curriculum, learning attempts, current mastery, and explainable recommendations. The schema must support a semester MVP while preserving a path to recalculate adaptive state.

## Proposed decision

- Use UUID primary keys and UTC `timestamptz` values.
- Separate authentication identity (`users`) from child learning profile (`child_profiles`).
- Resolve guardian-child, class-child, and activity-skill many-to-many relationships with join entities.
- Treat attempts as append-only learning evidence.
- Store current child-skill mastery separately as derived state.
- Store served recommendations with reason details and algorithm version.
- Prefer status/deactivation over routine deletion for users and published content.
- Add no tables solely for stretch goals.

## Collaboration gate

- Member 1 must approve API read/write mapping, transaction boundaries, roles, and deletion behavior.
- Member 2 must approve dashboard and activity fields needed by the UI.
- All three members must approve privacy, scoring inputs, and the open-question decisions.

After approval, change this ADR to **Accepted**, note the review date, and begin Build Process 3.

## Consequences

- The schema remains small enough for a three-person semester team.
- Mastery can be recalculated from attempts, while dashboards read a fast summary.
- Recommendation records provide explainability and demonstration evidence.
- Cross-table role correctness (for example, only a teacher owns a class) must be enforced in service logic because a foreign key alone cannot inspect a user's role.

