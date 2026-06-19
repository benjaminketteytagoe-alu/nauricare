# ==========================================
# STAGE 1: PRUNE WORKSPACE
# ==========================================
FROM node:24-alpine AS builder
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app

# Install turbo globally
RUN npm install -g turbo

# Copy the entire monorepo into the builder
COPY . .

# Extract only the code needed for the 'web' app and its dependencies
RUN turbo prune web --docker

# ==========================================
# STAGE 2: INSTALL & BUILD
# ==========================================
FROM node:24-alpine AS installer
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app

# Copy the pruned package.json files
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/tsconfig.json /app/tsconfig.json

RUN rm -f package-lock.json && npm install

# Copy the actual pruned source code
COPY --from=builder /app/out/full/ .

# Generate the Prisma client using your specific monorepo path
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Cloudflare Turnstile public site key — must be baked in at build time
# so Next.js can embed it in the client bundle via process.env.NEXT_PUBLIC_*
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

# Build the Next.js application
RUN npx turbo run build --filter=web

# ==========================================
# STAGE 3: PRODUCTION RUNNER
# ==========================================
FROM node:24-alpine AS runner
WORKDIR /app

# Security: Do not run the application as the root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# FIX: Updated to the modern ENV syntax (=) to remove Docker warnings
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy only the necessary files for production (Next.js Standalone output)
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/next.config.* .
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/package.json .

# The standalone build automatically creates a minimal server
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=installer --chown=nextjs:nodejs /app/packages/database/prisma ./packages/database/prisma

EXPOSE 3000
ENV PORT=3000
# Required: standalone server must bind to 0.0.0.0, not 127.0.0.1, inside Docker
ENV HOSTNAME=0.0.0.0

# Start the standalone Node server
CMD ["node", "apps/web/server.js"]
