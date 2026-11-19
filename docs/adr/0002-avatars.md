# 0002: Self-hosted DiceBear avatars alongside Signature presets

Date: 2026-11-19 · Status: Accepted

## Context

Users need recognisable avatars that aren't real photos, to protect privacy in Community. Calling `api.dicebear.com` would send a request to a third party on every page view, exposing the viewer's IP and the avatar seed.

## Decision

- Render DiceBear inside our own app with `@dicebear/core` and `@dicebear/collection`.
- Store an avatar _reference_ (`dicebear:<style>:<seed>`), validated against an allow-list of styles and options.
- The default seed is an HMAC of the user id, so ids are never exposed.
- The 12 hand-made cultural presets stay as the "Signature" set.
- Google photos are still never shown to other patients in Community.

## Consequences

The CSP needs no new external hosts. Existing avatar values keep working, so no migration is needed.
