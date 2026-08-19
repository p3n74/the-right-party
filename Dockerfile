# syntax=docker/dockerfile:1.7
#
# Production image for the Vite web app + Hono API in this Bun + Turborepo
# monorepo. Optimised for Coolify on a self-hosted VPS.
#
# Why this image ships the whole repo (not just the Vite dist):
#
#   The DB is externally hosted and we administer it by `docker exec`-ing into
#   the Coolify container and running `bun run db:push DATABASE_URL=...` etc.
#   That requires the repo's package.json scripts, the scripts/ directory,
#   the Prisma schema and Prisma CLI to be present at runtime. The db-cli
#   wrapper (scripts/db-cli.ts) refuses to run unless DATABASE_URL is passed
#   on each invocation, so keeping these files in the production image is
#   safe — there is no "default" database it could accidentally target.
#
# Build:
#   docker build --build-arg VITE_SERVER_URL=https://your.domain -t the-right-party .
#
# Run (Coolify injects env vars itself):
#   docker run --rm -p 3000:3000 \
#     -e DATABASE_URL=... \
#     -e BETTER_AUTH_SECRET=... \
#     -e BETTER_AUTH_URL=https://your.domain \
#     -e CORS_ORIGIN=https://your.domain \
#     -e GOOGLE_CLIENT_ID=... -e GOOGLE_CLIENT_SECRET=... \
#     -v afterparty-data:/app/var \
#     the-right-party
#
# Admin commands inside the running container (Coolify -> terminal):
#   bun run db:push DATABASE_URL=postgresql://...
#   bun run db:seed DATABASE_URL=postgresql://...

ARG BUN_VERSION=1.3.2

############################
# 1. Base image
############################
FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app
# Prisma needs these on Alpine
RUN apk add --no-cache libc6-compat openssl

############################
# 2. Builder: install deps and build the web app
############################
FROM base AS builder

# Copy the whole repo. .dockerignore keeps node_modules / dist / .env out.
COPY . .

# bun install runs packages/db postinstall (`prisma generate`).
# prisma.config.ts has a dummy DATABASE_URL fallback, so generation works at
# build time without secrets.
RUN bun install --frozen-lockfile

# Public API origin, baked into the Vite client. Same URL as BETTER_AUTH_URL.
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=${VITE_SERVER_URL}
ENV NODE_ENV=production
RUN test -n "$VITE_SERVER_URL" || (echo "Build arg VITE_SERVER_URL is required, e.g. https://your.domain" && exit 1)

# Build the web app (and the server bundle, via turbo).
RUN bunx turbo build --filter=web --filter=server

############################
# 3. Runner: full repo + node_modules so admin scripts work in-container
############################
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV RECEIPT_STORAGE_DIR=/app/var/receipts

RUN addgroup -S nodejs && adduser -S app -G nodejs \
  && mkdir -p /app/var/receipts /app/var/payment

# Bring the entire built repo over. This is intentionally not minimal: it
# preserves the workspace layout so that:
#   - `bun run --cwd apps/server start` works (apps/web/dist + apps/server/dist)
#   - `bun run db:push DATABASE_URL=...` works (scripts/, packages/db/,
#     Prisma CLI in node_modules are all available)
COPY --from=builder --chown=app:nodejs /app /app
RUN chown -R app:nodejs /app/var

USER app

EXPOSE 3000

# Same pattern as Precisione: `bun run --cwd` avoids `bun --filter`, which can
# error with "no packages matched the filter" depending on workspace naming.
# The Hono server honours PORT=3000 / HOSTNAME=0.0.0.0 set above, and serves
# the Vite dist from the same origin.
CMD ["bun", "run", "--cwd", "apps/server", "start"]
