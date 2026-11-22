FROM node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev

COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM deps AS build

COPY . .
RUN npm run build

FROM deps AS check

COPY . .
RUN npm run lint \
    && npx tsx --test src/services/authAndSecurity.test.ts \
    && npm run build \
    && npm audit --audit-level=high

FROM nginx:1.29-alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
