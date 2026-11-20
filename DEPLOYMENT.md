# ReadQuest — Production Deployment Guide

## 1. Build & Runtime Overview

ReadQuest's frontend is a static React 19 + TypeScript + Vite 8 Single-Page Application (SPA) designed to be served over HTTPS behind a reverse proxy or CDN that routes `/api/v1/*` traffic to the ReadQuest backend API.

- **Build Tool:** Vite 8 (`npm run build` outputs static assets to `dist/`)
- **Type Check:** `npm run lint` (`tsc --noEmit`)
- **Automated Tests:** `npx tsx --test src/services/authAndSecurity.test.ts`

---

## 2. Environment Variables (`.env.example`)

All frontend `VITE_*` variables are compiled into static browser JavaScript and are **publicly readable**. Never place database credentials, session signing secrets, SMTP keys, or third-party private API keys in `VITE_*` variables.

| Variable | Default | Production Recommendation |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | Keep `/api/v1` when frontend and backend share the same HTTPS domain via reverse proxy (best for `SameSite=Lax` cookies). If hosted separately, use an `https://` origin (e.g., `https://api.readquest.org/api/v1`). Non-local `http://` URLs are rejected at runtime. |
| `VITE_APP_NAME` | `ReadQuest` | Public product display name |
| `VITE_ENABLE_CSRF_HEADER` | `true` | Keep `true` so `apiFetch()` attaches `X-CSRF-Token` on mutations |
| `VITE_CSRF_COOKIE_NAME` | `rq_csrf_token` | Must match the CSRF cookie name issued by the backend |

---

## 3. Reverse Proxy & Origin Topology (Recommended)

Serving both the static SPA and the backend API under one HTTPS origin simplifies cookie security and avoids third-party cookie blocking in modern browsers:

- `https://app.readquest.org/*` -> Static `dist/` assets (fallback to `/index.html` **only** for non-`/api/` routes!)
- `https://app.readquest.org/api/v1/*` -> Proxied to ReadQuest Backend API (`https` / internal TLS)

**Important:** Never let SPA fallback rules (`try_files $uri /index.html`) intercept `/api/v1/*`. If the backend returns HTML instead of JSON, the frontend's `apiFetch()` deliberately fails closed with `SERVICE_UNAVAILABLE`.

### Example Nginx Reverse Proxy Snippet

```nginx
server {
    listen 443 ssl http2;
    server_name app.readquest.org;

    # TLS 1.2+ certificates omitted for brevity
    root /var/www/readquest/dist;
    index index.html;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;

    # Backend API proxy (must come before SPA fallback)
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Immutable hashed Vite assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

If hosting the backend on a separate subdomain (`https://api.readquest.org`), update `connect-src 'self' https://api.readquest.org`, configure strict CORS (`Access-Control-Allow-Origin: https://app.readquest.org`, `Access-Control-Allow-Credentials: true`), and set cookies with appropriate `SameSite` and domain attributes.

---

## 4. Build & Deployment Steps

1. Install dependencies using the lockfile:
   ```bash
   bun install --frozen-lockfile
   ```
2. Run verification checks before building:
   ```bash
   npm run lint
   npx tsx --test src/services/authAndSecurity.test.ts
   bun audit
   ```
3. Set production environment variables (e.g., `VITE_API_BASE_URL="/api/v1"`) and build:
   ```bash
   npm run build
   ```
4. Deploy `dist/` to your static host/CDN or Nginx origin, and verify `/api/v1/*` proxy connectivity to the backend team's API server.

---

## 5. Post-Deployment Smoke Verification Checklist

- [ ] Visiting `/` loads the ReadQuest public landing page without console errors or `aistudio` / demo references.
- [ ] Visiting `/dashboard`, `/parent`, `/teacher`, or `/account` while logged out redirects cleanly to `/login?returnTo=...`.
- [ ] Attempting `/login?returnTo=https://evil.example` redirects to `/dashboard` after login (open-redirect guard active).
- [ ] Registering a parent account sends verification email and sets no tokens in `localStorage` or `sessionStorage`.
- [ ] Creating, switching, and deleting a child profile updates `/account`, `/dashboard`, and `/parent` with database persistence across browser reloads.
- [ ] Completing a quest posts attempts to `/api/v1/sessions/:id/attempts` and curriculum catalog responses contain zero `isCorrect` flags.
- [ ] Security headers (`CSP`, `HSTS`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) verified via `curl -I https://app.readquest.org`.
