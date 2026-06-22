# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About This Codebase

NauriCare is a women's health platform (PCOS, fibroids, related conditions) built as a Turborepo monorepo. The main application is a Next.js 16 app at `apps/web`. The database schema lives in a shared `packages/database` package.

> **Important**: This is Next.js 16, which has breaking changes from earlier versions. Before writing Next.js-specific code, consult `node_modules/next/dist/docs/` inside `apps/web` — APIs, conventions, and file structure may differ from training data.

## Commands

All commands run from the monorepo root unless noted.

```bash
# Development
npm run dev                                          # start all apps via Turbo
npx turbo dev --filter=web                           # start only the web app

# Build & lint
npm run build                                        # build all packages via Turbo
cd apps/web && npm run lint                          # lint the web app

# Database (always pass --schema explicitly)
npx prisma generate --schema=packages/database/prisma/schema.prisma
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
npx prisma studio --schema=packages/database/prisma/schema.prisma

# Local Postgres (runs on port 5433, not the default 5432)
docker-compose up -d
```

Required environment variables (`apps/web/.env.local`):
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — JWT signing secret
- `NEXTAUTH_URL` — e.g. `http://localhost:3000`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — for OAuth
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile public key (baked into bundle at build time)
- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile server-side secret (runtime only, never in image)
- `RESEND_API_KEY` — Resend email API key (runtime only; falls back to dummy string at build time)
- `EMAIL_FROM` — sender address e.g. `appointments@nauricare.com`; use `onboarding@resend.dev` until domain is verified

## Architecture

### Monorepo layout

```
apps/web/          — Next.js 16 application
packages/
  database/        — Prisma schema + client (@nauricare/database)
  ui/              — Shared React component library
  eslint-config/   — Shared ESLint config
  typescript-config/
  validation/
```

### Route groups (Next.js App Router)

The app uses route groups to scope layouts per role:

| Group | Path prefix | Role required |
|---|---|---|
| `(public)` | `/` | None |
| `(patient)` | `/dashboard` | `PATIENT` |
| `(provider)` | `/provider` | `PROVIDER` |
| `(admin)` | `/admin` | `ADMIN` |

Middleware at `apps/web/src/middleware.ts` enforces role boundaries: unauthenticated requests are rejected; authenticated users hitting `/dashboard` are redirected to their role-specific root. Each layout file adds a second layer of server-side role verification and redirects.

### Authentication

NextAuth v4 with JWT strategy. Two auth providers: Google OAuth and email/password (bcrypt).

- **Canonical `authOptions`**: `src/app/api/auth/[...nextauth]/route.ts` — this is the active config. Import from here in layouts and server components.
- `src/lib/auth.ts` also exists but is a secondary definition; the route handler version is preferred.
- JWT callback re-queries the DB on every token refresh to keep `role` and `id` in sync.
- Session type extensions are in `src/types/next-auth.d.ts`.
- Google sign-in auto-provisions a `PATIENT` user if the email doesn't exist.

### Database

PostgreSQL via Prisma. Schema: `packages/database/prisma/schema.prisma`.

Core models:
- `User` — base identity with `role: PATIENT | PROVIDER | ADMIN`; has `isEmailVerified Boolean` flag
- `PatientProfile` — one-to-one with User for patients; holds health data
- `PractitionerProfile` — one-to-one with User for providers; includes `verificationStatus`
- `ProviderProfile` — separate verification/license record
- `Appointment` — links `PatientProfile` ↔ `PractitionerProfile`; includes `meetingLink` (Jitsi)
- `ResetToken` — password-reset tokens; stores SHA-256 hash only (never raw token), 1-hour TTL
- `AuditLog` — typed audit trail using the `AuditAction` enum (for compliance)
- `AuditEvent` — free-form event log (used for analytics aggregation)
- `CycleLog` / `HabitLog` — patient health tracking

### Prisma client singleton

`src/lib/prisma.ts` exports a singleton `prisma` client. Always import from there.

### Audit logging

All admin and provider operations must be logged via `logAdministrativeAction()` from `src/lib/audit.ts`. It writes to the `AuditLog` table with a typed `AuditAction` enum. Errors are caught silently so logging failures never block the main operation.

### API routes

REST-style route handlers in `src/app/api/`. Each handler calls `getServerSession(authOptions)` directly for auth. Appointments GET handler acts as a smart router, returning different data shapes depending on the user's role.

### Server Actions

Admin mutations use Next.js Server Actions (e.g., `(admin)/admin/actions.ts`). They call `revalidatePath()` after writes to bust the router cache.

### Security utilities (`src/lib/`)

- `turnstile.ts` — `verifyTurnstileToken(token, ip?)`: calls Cloudflare siteverify; returns `boolean`. Call this **before** any DB query in all auth routes.
- `getClientIp.ts` — extracts real client IP from Cloudflare headers (`cf-connecting-ip` → `x-forwarded-for` → `x-real-ip`).
- `email.ts` — `sendPatientConfirmationEmail` / `sendProviderAlertEmail` via Resend. Templates live in `src/emails/`. Constructor falls back to a dummy key at build time so `next build` never fails on a missing secret.

### Cloudflare Turnstile enforcement

All credential-auth flows verify the widget token server-side:
- **Login**: token passed as `turnstileToken` credential to NextAuth's `CredentialsProvider`, verified in `authorize()`.
- **Register** (`api/auth/register`): verified before Zod schema parsing.
- **Forgot-password** (`api/auth/forgot-password`): verified before DB lookup.

### Password reset

`ResetToken` table stores a SHA-256 hash of the raw 32-byte random token. Raw token is only ever in the reset-link URL. On use, the token is deleted atomically in the same transaction as the password update (`api/auth/reset-password`).

### Dynamic rendering (cache-leak prevention)

All protected layouts call `await cookies()` before any DB query and export `export const dynamic = "force-dynamic"`. This prevents Next.js from caching user-specific Server Component output across requests.

### Zod validation (Zod v4)

Use `error.issues[0]` not `error.errors[0]` — the property was renamed in v4. Custom error messages use `.refine()` instead of the `errorMap` param (also renamed in v4).

### Email templates

`src/emails/PatientBookingConfirmation.tsx` and `ProviderNewAppointmentAlert.tsx` use `@react-email/components` with the `<Tailwind>` wrapper (compiles classes to inline styles for email client compatibility). Pass the component directly to Resend's `react:` option — no manual `render()` call needed.

## CI/CD

GitHub Actions pipeline (`.github/workflows/ci.yml`) has four stages:
1. **Build & typecheck** — runs on all pushes and PRs
2. **Docker image** — built and pushed to GHCR on every push
3. **Staging** — deploys from the `develop` branch to staging server (port 3001)
4. **Production** — deploys from the `main` branch (port 3000)

Prisma migrations run inside the container post-deploy using `prisma@6.19.3` (pinned explicitly to avoid version drift).

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` is passed as a Docker `--build-arg` (baked into the bundle). All other secrets (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`) are injected at runtime via `-e` flags on `docker run`.
