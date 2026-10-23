# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv
# (The only flagged value is the NEXTAUTH_SECRET *placeholder* in the builder
# stage below. It is not a secret and never reaches the final image.)
# ============================================================================
# NauriCare web — multi-stage build (Turborepo prune → npm ci → Next standalone)
#
# Reproducibility rule: dependencies are installed ONLY from the pruned
# package-lock.json with `npm ci`. A lockfile-less `npm install` re-resolves
# every ^range on each build, which is how a new upstream minor release broke
# CI type-checking without any code change.
# ============================================================================

# Node 24 is the active LTS and matches the CI test job (Node 20 reached EOL
# in April 2026). openssl lets Prisma detect the OpenSSL 3 engine on Alpine.
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    TURBO_TELEMETRY_DISABLED=1

# ----------------------------------------------------------------------------
# 1. Pruner: extract only the `web` app and its internal dependencies
# ----------------------------------------------------------------------------
FROM base AS pruner
# Install the exact turbo version recorded in the lockfile (no "latest" drift).
# Copying only the lockfile first keeps this layer cached between builds.
COPY package-lock.json ./
RUN npm install -g "turbo@$(node -p "require('./package-lock.json').packages['node_modules/turbo'].version")"
COPY . .
RUN turbo prune web --docker

# ----------------------------------------------------------------------------
# 2. Builder: install from the lockfile, generate Prisma, build Next.js
# ----------------------------------------------------------------------------
FROM base AS builder

# Dependency manifests + pruned lockfile first, for layer caching.
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# Full pruned source. apps/web/tsconfig.json extends the root tsconfig, which
# `turbo prune` does not include, so copy it explicitly.
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.json ./tsconfig.json

RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Public build-time values are inlined into the client bundle, so the
# Turnstile site key must be supplied as a build arg (CI passes it).
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

# Placeholder server-side values so `next build` never depends on real
# secrets. They exist only in this builder stage (never in the final image);
# real values are injected at runtime with `docker run -e/--env-file`.
# turbo.json lists them under passThroughEnv so turbo's strict env mode
# forwards them to `next build`. Do NOT add NEXT_PUBLIC_* placeholders here:
# those would be baked into the shipped bundle.
ENV NODE_ENV=production \
    DATABASE_URL="postgresql://build_user:build_pass@localhost:5432/build_db?schema=public" \
    NEXTAUTH_SECRET="build_dummy_nextauth_secret_minimum_32_characters_long" \
    NEXTAUTH_URL="http://localhost:3000"

RUN npx turbo run build --filter=web

# ----------------------------------------------------------------------------
# 3. Runner: minimal image with the standalone server
# ----------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Never run as root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# Prisma CLI, pinned to the lockfile version, so migrations can run as a
# one-off task from this same image (ECS `run-task`, or `docker exec ... prisma
# migrate deploy`) with no package download at deploy time.
COPY --from=pruner /app/out/package-lock.json /tmp/package-lock.json
RUN npm install -g "prisma@$(node -p "require('/tmp/package-lock.json').packages['node_modules/prisma'].version")" \
 && rm /tmp/package-lock.json \
 && npm cache clean --force

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
# Prisma schema + migrations: the deploy job runs `prisma migrate deploy`
# inside this container after start-up.
COPY --from=builder --chown=nextjs:nodejs /app/packages/database/prisma ./packages/database/prisma

# Build identifier, surfaced by /api/health (CI passes the commit SHA).
ARG APP_VERSION=unknown
ENV APP_VERSION=$APP_VERSION

USER nextjs
EXPOSE 3000

# Liveness check used by `docker run` deployments (ECS uses its own config).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

# Standalone server; binds to 0.0.0.0 via HOSTNAME so Docker can route to it.
CMD ["node", "apps/web/server.js"]
