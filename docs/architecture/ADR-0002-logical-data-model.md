# ADR-0002: Logical data model

**Status:** Accepted for this authorized test run

## Context

ReadQuest must persist role-based relationships, curriculum, learning attempts, current mastery, and explainable recommendations. The schema must support a semester MVP while preserving a path to recalculate adaptive state.

## Decision

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


## Resolved questions

One role per user. Guardians/admins provision child accounts; teachers enroll through guardian-supplied class codes. Children may join multiple classes. Skill/activity levels replace grade collections. Multi-skill weights sum to one but evidence is scored per skill. Response time is excluded from mastery-v1. Attempts are append-only, server-timestamped. Retention is limited to the course demo; real deployment requires a reviewed retention/consent policy. Only the served recommendation is audited. Provider selection remains external to this local test run. Auth sessions and login throttles are added by migration 0002. All team design gates are approved by the user.
