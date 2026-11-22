FROM node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev

COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM deps AS build

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_APP_NAME=ReadQuest
ARG VITE_ENABLE_CSRF_HEADER=true
ARG VITE_CSRF_COOKIE_NAME=rq_csrf_token
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_ENABLE_CSRF_HEADER=$VITE_ENABLE_CSRF_HEADER \
    VITE_CSRF_COOKIE_NAME=$VITE_CSRF_COOKIE_NAME
COPY . .
RUN npm run build

FROM deps AS check

COPY . .
CMD ["sh", "-c", "npm run lint && npx tsx --test src/services/authAndSecurity.test.ts && npm run build && npm audit --audit-level=high"]

FROM nginx:1.29-alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
