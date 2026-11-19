# Security policy

NauriCare stores sensitive reproductive-health data. We take every report seriously.

## Reporting a vulnerability

- **Preferred:** open a private advisory at
  [Security → Report a vulnerability](https://github.com/benjaminketteytagoe-alu/nauricare/security/advisories/new).
- **Alternatively:** email nauricare@gmail.com with the subject `SECURITY`.

Please do **not** open a public issue, and do not access, modify or retain other users' data while testing.
Include steps to reproduce and the impact you observed. We aim to acknowledge within 2 business days and to
ship a fix for critical issues within 7 days.

## Scope

In scope: `nauricare.org` and its subdomains, and this repository. Out of scope: denial-of-service, social
engineering, and findings that need a compromised device.

## Handling secrets

Secrets live only in AWS SSM Parameter Store (production) and untracked `.env.local` files (development).
Never commit them, paste them into issues, or log them. If a secret is exposed, rotate it first and then
follow `docs/runbooks/` to clean up.
