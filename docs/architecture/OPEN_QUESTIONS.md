# ERD open questions and decision owners

These questions must be resolved at the Build Process 2 review. Record decisions in ADR-0002 and update the data dictionary before coding models.

| # | Question | Recommended default | Decision participants |
|---:|---|---|---|
| 1 | Can one login have multiple roles? | One role per MVP user; revisit after release. | Member 1 + full team |
| 2 | Who creates a child account: parent, teacher, or admin? | Parent/admin creation; teacher links by invitation. | Members 1 and 2 |
| 3 | May one child belong to multiple classes? | Yes, through enrollments. | Members 1 and 2 |
| 4 | Should a lesson belong to a grade/level collection? | Use skill/activity level for MVP; defer curriculum collections. | Full team |
| 5 | Can an activity assess multiple skills? | Yes; weights must total 1. | Full team |
| 6 | Is response time used in mastery? | Store it, but exclude it from mastery-v1. | Full team |
| 7 | Are attempts editable? | No; treat them as append-only evidence. | Members 1 and 3 |
| 8 | How long are attempts retained? | Retain for the course demo; document future privacy policy as a limitation. | Full team |
| 9 | Do we store every ranked candidate? | Store only the served recommendation plus component details. | Member 3 + Member 1 |
| 10 | What production provider will host PostgreSQL? | Defer provider choice to Process 11; preserve standard PostgreSQL compatibility. | Full team |

