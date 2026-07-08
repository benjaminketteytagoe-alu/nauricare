# NauriCare

NauriCare is a full-stack healthtech platform designed to connect women with compassionate, evidence-based care for reproductive health. It bridges the gap between digital consultations and physical care delivery through secure video conferencing, community engagement, and end-to-end prescription routing.

## Table of Contents
- [Features](#features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Infrastructure & DevOps](#infrastructure--devops)

## Features

### For Patients
*   **Secure Authentication:** Passwordless login via Magic Links and Google OAuth, protected by Cloudflare Turnstile bot mitigation.
*   **Telehealth Consultations:** Real-time booking engine integrated with automated transactional emails (Resend) and dynamic, secure Jitsi video conferencing rooms.
*   **Prescription Routing:** A complete e-prescribing pipeline. Patients can view prescriptions issued during consultations and dynamically route them to local partner pharmacies (e.g., Kigali-based pharmacies).
*   **Community Hub:** An interactive, X/Instagram-style social feed. Features include direct-to-cloud AWS S3 media uploads (images and video), a follower graph, optimistic UI comment threading, and custom user avatars.
*   **Health Tracking:** Interactive menstrual cycle logs and predictive health analytics.

### For Providers
*   **Provider Dashboard:** Dedicated workspaces for verified medical professionals.
*   **Roster & Records Management:** Access to patient health records and consultation history.
*   **E-Prescribing:** Ability to instantly issue digital prescriptions tied to specific patient consultations.

### For Administrators
*   **Role-Based Access Control (RBAC):** Strict middleware enforcement isolating Patient, Provider, and Admin routes.
*   **Pharmacy Analytics:** Dashboard tracking prescription routing volume, utilizing optimized Prisma aggregations to identify high-traffic pharmacy partners.
*   **Audit Logging:** System-wide tracking of critical mutations and access logs.

## Architecture & Tech Stack

NauriCare is built as a highly scalable, serverless monorepo.

*   **Frontend:** Next.js (App Router), React, Tailwind CSS, TypeScript
*   **Backend:** Next.js API Routes / Server Actions, Node.js
*   **Database:** PostgreSQL (Neon), Prisma ORM
*   **Authentication:** NextAuth.js
*   **Cloud Storage:** AWS S3 (Direct-to-cloud payload architecture with cryptographic `Content-Length` validation)
*   **Video Conferencing:** Jitsi Meet API
*   **Transactional Email:** Resend

## Project Structure

The codebase is organized as a monorepo workspace to separate the web application from database schemas and internal packages.

```text
nauricare/
├── apps/
│   └── web/                   # Next.js application (App Router)
│       ├── src/app/           # Pages, Layouts, and API routes
│       ├── src/actions/       # Server Actions (e.g., prescriptions, community)
│       └── src/components/    # Reusable UI components
├── packages/
│   └── database/              # Prisma schema, migrations, and seed scripts
│       └── prisma/
│           └── schema.prisma
├── .env.local                 # Local environment variables (git-ignored)
└── README.md