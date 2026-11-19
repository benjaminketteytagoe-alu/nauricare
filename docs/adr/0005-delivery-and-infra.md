# 0005: Delivery pipeline and infrastructure as code

Date: 2026-11-19 · Status: Accepted

## Context

CI could build and deploy, but it had real gaps:

- staging was a placeholder
- AWS access used static keys
- nothing was scanned
- the infrastructure existed only as manual console changes

## Decision

- **CI checks:**
  - format
  - type-aware lint
  - typecheck
  - unit tests
  - migration drift
  - build
  - e2e tests with accessibility checks
- **Security scanning:**
  - CodeQL
  - dependency review
  - `npm audit`
  - secret scanning
  - image scanning
  - an SBOM
  - Dependabot
- **AWS access:** CI authenticates to AWS through GitHub OIDC, with no long-lived keys.
- **One image per commit:** the image is built once and never rebuilt. It's promoted by digest from staging to production, behind a manual approval.
- **Terraform:** it manages ECR, ECS, RDS, SSM and EventBridge, with separate staging and production environments. Existing resources are imported, not recreated.
- **Operations:**
  - structured logging with PHI redaction
  - error tracking with PII scrubbing
  - alarms
  - runbooks

## Consequences

Deploys become reproducible and reviewable. Switching over needs a one-off IAM/OIDC bootstrap first.
