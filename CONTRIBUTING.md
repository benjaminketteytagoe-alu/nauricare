# Contributing to NauriCare

## Setup

```bash
nvm use                 # Node 24 (see .nvmrc)
npm ci                  # installs workspaces and git hooks (husky)
docker-compose up -d    # Postgres on port 5433
cp apps/web/.env.example apps/web/.env.local   # then fill in values
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma
npm run dev
```

## Branches and releases

- `develop` deploys to **staging**; `main` deploys to **production**.
- Branch from `develop`: `feat/…`, `fix/…`, `chore/…`, `docs/…`. Keep PRs small and focused.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org) (`feat(cycle): …`), enforced by commitlint.
- `develop` → `main` is merged as a release once staging is verified.

Recommended branch protection for `main` and `develop`: require the CI checks, one approving review
(CODEOWNERS), an up-to-date branch, and a linear history; disallow force-pushes.

## Before you push

```bash
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

The pre-commit hook formats staged files; CI runs everything above.

## Code conventions

- Routes stay thin. Data access and side effects live in `apps/web/src/server/<domain>/` (marked
  `import "server-only"`); reusable pure helpers live in `apps/web/src/lib/`.
- Route handlers use `parseJson`, `apiSuccess` and `apiError` from `src/lib/api.ts` and the guards in
  `src/lib/auth-guards.ts`.
- Validate input with Zod v4 (`error.issues[0]`), sanitise free text with `sanitizePlainText`, and
  audit-log admin and provider actions with `logAdministrativeAction`.
- Schema changes need a migration. CI fails if `schema.prisma` and the migrations drift.
- Significant decisions get an ADR in `docs/adr/`.

## Clinical safety

Anything a patient reads that touches symptoms, risk or AI output must be framed as **educational decision
support, not a diagnosis**, and must offer a route to a qualified clinician. Changes to triage or insight
logic need a test case and a second reviewer.
