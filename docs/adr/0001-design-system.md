# 0001: Unified "Warm editorial" design system

Date: 2026-11-19 · Status: Accepted

## Context

The product uses two competing palettes. The patient portal uses rose utilities. Legal, triage and referral pages use cobalt "Material 3" tokens (`nc-*`). Components hard-code Tailwind colours, so the product looks inconsistent.

## Decision

We will use one token set (Tailwind v4 `@theme`), shared through `packages/ui`:

- **Colour:** plum ink, a muted-rose primary, a warm ivory canvas, and sage, apricot and lavender for health states. Cobalt is used only for focus rings and info.
- **Type:** Fraunces for display and Inter for UI, both self-hosted via `next/font`.
- **Components** use semantic tokens only.
- **Themes and contrast:** light and dark themes, meeting WCAG 2.2 AA contrast.
- **Motion** is subtle and respects `prefers-reduced-motion`.
- **Pixel Perfect blocks:** animated blocks adapted from Pixel Perfect are limited to buttons, text reveals and backgrounds. They are adopted only after their licence is confirmed, and credited in `THIRD_PARTY_NOTICES.md`.

## Consequences

Every surface is migrated in one pass: landing, then auth, then the portals, then emails. New code may not use raw colour utilities.
