# 🏥 NauriCare Platform

**A modern women's health platform combining EHR-lite patient records, real-time telemedicine, and predictive menstrual cycle tracking — built as a Next.js 16 / Turborepo monorepo.**

---

## Table of Contents

- [Overview & Key Features](#overview--key-features)
- [Quick Links](#quick-links)
- [Tech Stack & Architecture](#tech-stack--architecture)
- [Prerequisites](#prerequisites)
- [Step-by-Step Local Setup Guide](#step-by-step-local-setup-guide)
- [Project Directory Structure](#project-directory-structure)
- [AWS S3 CORS Configuration](#aws-s3-cors-configuration)
- [Essential Terminal Commands](#essential-terminal-commands)
- [Deployment & Git Workflow](#deployment--git-workflow)

---

## Overview & Key Features

### 🧑‍⚕️ Patient Portal
- Unified health dashboard with symptom logging and provider consultations
- Interactive **cycle & body tracking calendar** — log period start/end dates and view predicted next-cycle and ovulation windows
- Appointment booking with Jitsi-powered video consultations
- Prescription tracking with pharmacy routing
- Community feed (posts, comments, follows, stories) and appointment-gated direct messaging

### 🩺 Provider Portal
- Patient roster and health record (EHR) management
- Digital prescription issuing, tied to specific consultations
- Availability scheduling and appointment lifecycle management
- Direct messaging with patients

### 🔐 Security & Auth
- **NextAuth v4** (JWT strategy) with Google OAuth and email/password (bcrypt) credential login
- **Resend**-powered transactional email verification with resend/enumeration protection
- **Cloudflare Turnstile** bot mitigation on all credential-auth flows (login, register, forgot-password)
- Strict **Role-Based Access Control (RBAC)** — middleware + per-layout enforcement isolating Patient, Provider, and Admin route groups
- Typed audit logging (`AuditLog`) for compliance-sensitive admin/provider actions

### ☁️ Cloud Storage
- **AWS S3** direct-to-cloud uploads via short-lived presigned URLs (client uploads directly to S3, bypassing the app server)

---

## Quick Links

| Resource | URL |
|---|---|
| **Production** | [https://nauricare.org](https://nauricare.org) |
| **Repository** | [https://github.com/benjaminketteytagoe-alu/nauricare](https://github.com/benjaminketteytagoe-alu/nauricare) |
| **AWS S3 Console** | [https://console.aws.amazon.com/s3/](https://console.aws.amazon.com/s3/) |
| **Resend Dashboard** | [https://resend.com/emails](https://resend.com/emails) |

---

## Tech Stack & Architecture

NauriCare is a **Turborepo** monorepo (`npm` workspaces) separating the application from shared, versioned packages.

| Layer | Technology |
|---|---|
| Monorepo tooling | Turborepo, npm workspaces |
| Framework | Next.js 16 (App Router, React Server Components, Server Actions) |
| UI | React 19, Tailwind CSS v4, `shadcn`, Framer Motion |
| Database | PostgreSQL (Neon-hosted), Prisma ORM v6 |
| Auth | NextAuth v4 (JWT), bcrypt, Cloudflare Turnstile |
| Object Storage | AWS S3 (`@aws-sdk/client-s3`, presigned uploads) |
| Transactional Email | Resend + `@react-email/components` |
| Video | Jitsi Meet |
| Language | TypeScript (strict mode) |

**Monorepo layout:**
- `apps/web` — the Next.js 16 application (all product surface area)
- `packages/database` — Prisma schema, migrations, seed script (`@nauricare/database`)
- `packages/ui` — shared React component library
- `packages/validation` — shared Zod schemas
- `packages/eslint-config`, `packages/typescript-config` — shared lint/TS configs

---

## Prerequisites

- **Node.js** v20+ (CI runs on Node 24; v20 LTS is the local minimum)
- **npm** v11+ (this repo pins `packageManager: npm@11.14.1`)
- **PostgreSQL** 15+ (via the bundled `docker-compose.yml`, or a hosted instance such as Neon)
- **Git**

---

## Step-by-Step Local Setup Guide

### Step 1 — Clone the Repository

```bash
git clone https://github.com/benjaminketteytagoe-alu/nauricare.git
cd nauricare
```

### Step 2 — Install Dependencies

```bash
npm install
```

This installs dependencies for every workspace (`apps/web` and all `packages/*`) in one pass.

### Step 3 — Configure Environment Variables

Create `apps/web/.env.local` with the following:

```bash
# --- Database (Prisma / PostgreSQL) ---
# Point at the local docker-compose Postgres, or a hosted instance (e.g. Neon)
DATABASE_URL="postgresql://nauricare_admin:securepassword@localhost:5433/nauricare"

# --- NextAuth ---
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# --- Google OAuth ---
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# --- Cloudflare Turnstile (bot mitigation) ---
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your-turnstile-site-key"
TURNSTILE_SECRET_KEY="your-turnstile-secret-key"

# --- Resend (transactional email) ---
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="onboarding@resend.dev"   # use a verified nauricare.com sender in production

# --- AWS S3 (direct-to-cloud uploads) ---
AWS_REGION="your-bucket-region"
AWS_S3_BUCKET_NAME="your-bucket-name"
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"

# --- AI agent features (optional) ---
GEMINI_API_KEY="your-gemini-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

> `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is baked into the client bundle at build time. All other secrets above are read at runtime only.

### Step 4 — Database Setup & Prisma Migrations

Start local Postgres (skip if pointing `DATABASE_URL` at a hosted instance):

```bash
docker-compose up -d
```

Generate the Prisma client and apply migrations — always pass `--schema` explicitly, since the schema lives inside `packages/database`:

```bash
npx prisma generate --schema=packages/database/prisma/schema.prisma
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
```

Optionally, browse the database with Prisma Studio:

```bash
npx prisma studio --schema=packages/database/prisma/schema.prisma
```

### Step 5 — Start the Development Server

```bash
npm run dev
```

This runs `turbo run dev` across the workspace. The web app is available at **http://localhost:3000**.

To run only the web app:

```bash
npx turbo dev --filter=web
```

---

## Project Directory Structure

```text
nauricare/
├── apps/
│   └── web/                         # Next.js 16 application
│       ├── src/
│       │   ├── app/                 # App Router — route groups & API routes
│       │   │   ├── (public)/        # Marketing / unauthenticated pages
│       │   │   ├── (patient)/       # Patient dashboard (role: PATIENT)
│       │   │   ├── (provider)/      # Provider workspace (role: PROVIDER)
│       │   │   ├── (admin)/         # Admin console (role: ADMIN)
│       │   │   └── api/             # Route handlers (REST-style)
│       │   ├── actions/             # Cross-cutting Server Actions
│       │   ├── agents/              # AI agent integration
│       │   ├── components/          # Shared React components
│       │   ├── emails/              # React Email templates
│       │   ├── lib/                 # Server utilities (prisma, auth, s3, email, turnstile...)
│       │   ├── types/               # Shared/ambient TypeScript types
│       │   └── middleware.ts        # Role-boundary enforcement
│       └── package.json
├── packages/
│   ├── database/                    # @nauricare/database
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       ├── migrations/
│   │       └── seed.ts
│   ├── ui/                          # Shared component library
│   ├── validation/                  # Shared Zod schemas
│   ├── eslint-config/
│   └── typescript-config/
├── docker-compose.yml                # Local PostgreSQL (port 5433)
├── turbo.json
├── package.json                      # npm workspaces root
└── README.md
```

---

## AWS S3 CORS Configuration

The upload flow issues short-lived presigned `PUT` URLs directly to the client, so the target bucket must allow cross-origin `PUT` requests from both production and local dev origins. Apply this via the S3 Console → your bucket → **Permissions → CORS**:

```json
[
  {
    "AllowedOrigins": [
      "https://nauricare.org",
      "https://www.nauricare.org",
      "http://localhost:3000",
      "http://localhost:3001"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## Essential Terminal Commands

| Command | Description |
|---|---|
| `npm run dev` | Start all apps in dev mode (Turbo) |
| `npx turbo dev --filter=web` | Start only the web app |
| `npm run build` | Build all packages/apps via Turbo |
| `cd apps/web && npm run lint` | Lint the web app (ESLint) |
| `cd apps/web && npx tsc --noEmit` | Type-check the web app with zero emitted output |
| `npx prisma generate --schema=packages/database/prisma/schema.prisma` | Regenerate the Prisma client |
| `npx prisma migrate dev --schema=packages/database/prisma/schema.prisma` | Create & apply a new migration (local dev) |
| `npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma` | Apply pending migrations (CI / production) |
| `npx prisma studio --schema=packages/database/prisma/schema.prisma` | Open the Prisma Studio DB browser |
| `docker-compose up -d` | Start local PostgreSQL on port 5433 |

---

## Deployment & Git Workflow

**Branching strategy:**

```
feature/*  →  develop  →  main
```

- Feature work branches off `develop` as `feature/<short-description>`.
- Merging into **`develop`** triggers CI and deploys to **staging** (container `nauricare-staging`, port **3001**).
- Merging `develop` into **`main`** triggers CI and deploys to **production** (container `nauricare-prod`, port **3000**).

**CI/CD pipeline** (`.github/workflows/ci.yml`) runs on every push/PR to `main` and `develop`:

1. **Build & Typecheck** — `npm install`, `prisma generate`, `npm run build`
2. **Docker Image** — built and pushed to GHCR (`ghcr.io/<repo>:latest` and `:<sha>`); `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is injected as a build arg
3. **Staging Deploy** — from `develop`; pulls the image and runs `prisma migrate deploy` inside the container (Prisma pinned to `6.19.3`)
4. **Production Deploy** — from `main`; same flow, targeting the production container

All runtime secrets (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, database credentials, etc.) are injected via `-e` flags / `--env-file` on `docker run` — never baked into the image.
