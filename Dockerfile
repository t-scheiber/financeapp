# syntax=docker/dockerfile:1
#
# FinanceApp image. Replaces the Nixpacks build.
#
# Why a Dockerfile: the Nixpacks image ships Bun 1.3.0, which cannot read this
# repository's bun.lock, so it installs without the lockfile and without a
# compiler. Here Bun is pinned to the version in package.json ("packageManager")
# and the compiler toolchain for better-sqlite3 is installed explicitly.
#
# Build argument (the only one the build needs):
#   NEXT_PUBLIC_APP_URL  Public base URL, e.g. https://finance.example.com.
#                        Next.js inlines it into the client JavaScript, so it
#                        must be set at build time. The server also reads it at
#                        run time (see the run-time variables in the README).
#
# Database: the app opens the SQLite file at DATABASE_URL. The default in the
# code is the relative path file:./data/finance.db, which resolves against the
# working directory. The working directory is /app, so the file is
#   /app/data/finance.db
# and the directory /app/data is declared as a VOLUME. Without a volume mounted
# on /app/data the database is lost every time the container is replaced.

ARG NODE_TAG=22.23.5-bookworm-slim
ARG BUN_VERSION=1.4.0

# ---------------------------------------------------------------------------
# toolchain: Node.js, Bun and the compiler better-sqlite3 falls back to.
# ---------------------------------------------------------------------------
FROM node:${NODE_TAG} AS toolchain
ARG BUN_VERSION
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN npm install -g "bun@${BUN_VERSION}" \
 && test "$(bun --version)" = "${BUN_VERSION}"
WORKDIR /app

# ---------------------------------------------------------------------------
# prod-deps: node_modules without devDependencies, for the runtime image.
# ---------------------------------------------------------------------------
FROM toolchain AS prod-deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production \
 && node -e "new (require('better-sqlite3'))(':memory:').close()"

# ---------------------------------------------------------------------------
# build: full install, then prisma generate and next build (bun run build).
# ---------------------------------------------------------------------------
FROM toolchain AS build
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# Only this stage sees the build argument. It is not set in the runtime image.
ARG NEXT_PUBLIC_APP_URL
RUN test -n "$NEXT_PUBLIC_APP_URL" \
 || { echo "NEXT_PUBLIC_APP_URL build argument is required" >&2; exit 1; }
# "bun run build" is "bunx prisma generate && next build --turbopack".
# .next/cache is the build cache (about 120 MB). The runtime does not need it,
# and Next.js recreates it on demand.
RUN bun run build && rm -rf .next/cache

# ---------------------------------------------------------------------------
# runtime: no compiler, no Bun, non-root.
# ---------------------------------------------------------------------------
FROM node:${NODE_TAG} AS runtime
# prisma migrate deploy runs the Prisma schema engine, which needs OpenSSL.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=file:/app/data/finance.db

WORKDIR /app
# Create the data directory before VOLUME so a fresh volume inherits the owner.
RUN mkdir -p /app/data && chown node:node /app /app/data

COPY --chown=node:node package.json next.config.ts prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node scripts/ensure-data-dir.mjs ./scripts/ensure-data-dir.mjs
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/lib/generated ./lib/generated
COPY --from=build --chown=node:node /app/.next ./.next

USER node
VOLUME ["/app/data"]
EXPOSE 3000

# /auth/signin is a static page that needs no session. /api/health redirects to
# the sign-in page for anonymous requests, so it is not used here. The image has
# no curl, so the check uses Node's fetch.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/auth/signin').then(r=>process.exit(r.status===200?0:1),()=>process.exit(1))"]

# Same steps as "bun run start" (package.json): create the data directory, apply
# pending migrations, start Next.js. The Prisma CLI and Next.js run from
# node_modules because the image has no Bun. exec lets Next.js receive SIGTERM.
CMD ["sh", "-c", "node scripts/ensure-data-dir.mjs && node_modules/.bin/prisma migrate deploy && exec node_modules/.bin/next start"]
