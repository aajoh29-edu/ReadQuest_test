# MVP requirements-to-entity traceability

This matrix proves that the proposed schema supports the MVP described in the ReadQuest proposal.

| Requirement / workflow | Primary entities | Important fields | Collaborator validation |
|---|---|---|---|
| Secure login and four roles | users, auth_sessions, login_throttles | email, password_hash, role, status, expiry | Approved; auth/RBAC integration tests pass. |
| Child profile | users, child_profiles | user_id, display_name, grade_level, current_level | Members 1 and 2 confirm profile/API/UI fields. |
| Parent views permitted children | guardian_children | guardian_id, child_id | Member 1 validates authorization query. |
| Teacher manages a class | classes, enrollments | teacher_id, class_id, child_id, status | Members 1 and 2 validate class workflows. |
| Admin manages curriculum | skills, lessons, activities, activity_skills | status, ordering, difficulty, mappings | Full team confirms MVP content scope. |
| Child completes an activity | activities, attempts | child_id, activity_id, correctness, timing | Members 1 and 3 co-own transaction. |
| Mastery changes after an attempt | attempts, activity_skills, skill_mastery | score, band, confidence, algorithm_version | Full team validates examples and thresholds. |
| System recommends next activity | skills, activities, activity_skills, skill_mastery, recommendations | priority, reason, version, status | Members 1, 2, and 3 approve contract/explanation. |
| Parent dashboard shows progress | skill_mastery, attempts, recommendations | band, confidence, last practice, reason | Member 2 confirms presentation needs. |
| Teacher identifies support needs | enrollments, skill_mastery, attempts | class, skill, score, last practice | Members 1 and 2 validate query and UI. |
| Audit recommendation behavior | recommendations | reason_details, algorithm_version, created_at | Member 3 owns; full team reviews demo evidence. |
| Reproducible demo data | all reference/learning entities | stable IDs and timestamps | Full team approves scenarios in Process 5. |

## Coverage conclusion

Every MVP workflow maps to at least one entity. No stretch-goal schema has been added for speech recognition, text-to-speech, generative AI, offline sync, multiplayer challenges, or a content marketplace. This protects semester scope.


| Revocable authentication and brute-force guard | auth_sessions, login_throttles, users | token_hash, expires_at, failures, window_start | Auth integration tests |
