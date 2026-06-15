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
- `User` — base identity with `role: PATIENT | PROVIDER | ADMIN`
- `PatientProfile` — one-to-one with User for patients; holds health data
- `PractitionerProfile` — one-to-one with User for providers; includes `verificationStatus`
- `ProviderProfile` — separate verification/license record
- `Appointment` — links `PatientProfile` ↔ `PractitionerProfile`
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

## CI/CD

GitHub Actions pipeline (`.github/workflows/ci.yml`) has four stages:
1. **Build & typecheck** — runs on all pushes and PRs
2. **Docker image** — built and pushed to GHCR on every push
3. **Staging** — deploys from the `develop` branch to staging server (port 3001)
4. **Production** — deploys from the `main` branch (port 3000)

Prisma migrations run inside the container post-deploy using `prisma@6.19.3` (pinned explicitly to avoid version drift).
