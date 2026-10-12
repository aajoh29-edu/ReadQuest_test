#!/usr/bin/env bash
set -euo pipefail
repo="${1:-aajoh29-edu/ReadQuest_test}"
# Run deliberately after authenticating an account with repository admin access.
# Applies the complete desired protection policy; inspect existing policy first.
gh api --method PUT "repos/$repo/branches/main/protection" --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["backend-quality", "postgres-integration", "frontend-quality", "python-security", "compose-smoke"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
