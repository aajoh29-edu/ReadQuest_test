# ReadQuest React frontend

Node 24; `npm ci`, `npm test`, `npm run build`, `npm run dev`. Vite proxies `/api` to port 8000 during development. The Docker image serves built assets with Nginx and proxies the same path to the API service. Session tokens remain in HttpOnly cookies, never browser storage.

Child readers select real answers, view server mastery and follow explained recommendations. Guardians create child accounts and join classes, teachers manage their own classes and enrolled readers, and admins manage accounts and curriculum. Loading, empty, no-candidate, expired-session and error states are explicit. Large targets, semantic labels, keyboard focus, skip navigation and responsive layout support accessibility.

`npm run test:e2e` requires an already-running disposable demo stack and `READQUEST_E2E_PASSWORD` matching the explicit seed password. Optional `READQUEST_E2E_URL` selects the frontend origin; `READQUEST_BROWSER_PATH` selects a preinstalled Chromium. Otherwise install Playwright Chromium. Browser checks cover roles, answers, enrollment, mobile width and an automated WCAG A/AA scan.

`public/demo.html` preserves the anonymous development sample. Production omits `/demo` API routes. The production React application never falls back to this sample when authentication fails.
