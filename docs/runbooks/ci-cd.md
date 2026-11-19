# CI/CD runbook

## Pipeline at a glance

| Workflow                  | Trigger                                                | What it does                                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ci.yml`                  | PRs and pushes to `main`/`develop`                     | Checks: `quality`, `database` and `e2e` run in parallel. On push it then builds the image: scan, SBOM, sign, push. Finally it deploys `develop` to staging and `main` to production.                                                             |
| `deploy-ecs.yml`          | Called by `ci.yml`                                     | Registers the task definition (image pinned by digest), runs migrations as a one-off task, then a rolling deploy with automatic rollback. It then syncs DNS, verifies the version and smoke-tests key pages.                                     |
| `security.yml`            | PRs, pushes and weekly (Mon 04:17 UTC)                 | CodeQL, dependency review, `npm audit` (with an allowlist), gitleaks, hadolint, actionlint.                                                                                                                                                      |
| `release.yml`             | Push to `main`                                         | release-please keeps a release PR open. Merging it tags `vX.Y.Z` and updates `CHANGELOG.md`.                                                                                                                                                     |
| `infra.yml`               | PRs/pushes touching `infra/terraform/**`; manual apply | fmt, validate, tflint and Trivy on every change. Read-only `terraform plan` per root on PRs once `TF_PLAN_ROLE_ARN` is set. Apply only by manual dispatch from `main`, behind the `infrastructure` environment. See `infra/terraform/README.md`. |
| `cloudflare-dns-sync.yml` | Every 5 minutes (opt-in)                               | Points DNS back at healthy tasks if ECS replaces one between deploys.                                                                                                                                                                            |

**Every check runs before any image is built.** Each commit gets one image, and both staging and production deploy that image **by digest**. No deploy depends on a mutable tag.

Every third-party action is pinned to a full commit SHA, with the version as a trailing comment. Dependabot proposes updates weekly.

## One-off setup checklist

### 1. GitHub OIDC role (replaces the long-lived AWS keys)

**Preferred:** apply `infra/terraform/envs/shared`, which creates the provider and the least-privilege deploy and plan roles. Then set `AWS_ROLE_ARN` from its `deploy_role_arn` output. The manual steps below are the equivalent.

Create an IAM OIDC identity provider for `token.actions.githubusercontent.com` (audience `sts.amazonaws.com`). Then create a role with this trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:benjaminketteytagoe-alu/nauricare:ref:refs/heads/main",
            "repo:benjaminketteytagoe-alu/nauricare:ref:refs/heads/develop",
            "repo:benjaminketteytagoe-alu/nauricare:environment:staging",
            "repo:benjaminketteytagoe-alu/nauricare:environment:production"
          ]
        }
      }
    }
  ]
}
```

Give the role the same permissions the current IAM user has:

- ECR push for `nauricare-api`
- ECS describe, register-task-definition, run-task and update-service
- `iam:PassRole` for the task roles
- `ssm:GetParameters` on `/nauricare/*`
- EC2 `DescribeNetworkInterfaces`

Then:

1. Set the repository variable `AWS_ROLE_ARN` to the role ARN. All workflows switch to OIDC automatically.
2. Run one deploy with OIDC.
3. Once it succeeds, **delete** the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets, and deactivate that IAM user's keys.

### 2. Environments

Settings → Environments:

- **production:** add yourself (or a release manager) as a _required reviewer_, and restrict deployments to `main`.
- **staging:** restrict deployments to `develop`.

### 3. Variables and secrets

| Name                                                       | Kind     | Purpose                                                                                    |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `AWS_REGION`                                               | variable | Defaults to `us-east-1`                                                                    |
| `AWS_ROLE_ARN`                                             | variable | Turns on OIDC (step 1)                                                                     |
| `APP_SSM_SECRETS`                                          | variable | Comma-separated secret names under the environment's SSM prefix                            |
| `STAGING_ECS_SERVICE`                                      | variable | **Turns on staging deploys** (they are skipped while it's empty)                           |
| `STAGING_ECS_CLUSTER`, `STAGING_DNS_NAMES`, `STAGING_URL`  | variable | Staging service, its Cloudflare hostnames (e.g. `staging.nauricare.org`), and its base URL |
| `ECS_DNS_SYNC_ENABLED`                                     | variable | `true` enables the scheduled DNS repair                                                    |
| `GHAS_ENABLED`                                             | variable | `true` runs CodeQL and dependency review on a _private_ repo with Advanced Security        |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                           | secret   | Baked into the image at build                                                              |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`               | secret   | DNS sync                                                                                   |
| `GITLEAKS_LICENSE`                                         | secret   | Only needed if the repo moves to an organization                                           |
| `TF_PLAN_ROLE_ARN`, `TF_STATE_BUCKET`, `TF_APPLY_ROLE_ARN` | variable | Terraform plan/apply in `infra.yml` (see `infra/terraform/README.md`)                      |

Staging app secrets live under `/nauricare/staging/` in SSM. Use a separate database: **never point staging at production data**.

### 4. Repository settings

- Actions → General → "Allow GitHub Actions to create and approve pull requests" (needed by release-please).
- Branch protection on `main` and `develop`:
  - require these checks: _Format, Lint, Typecheck, Unit Tests_; _Migrations Apply Cleanly & Match Schema_; _Build, E2E & Accessibility_; _Secret Scan_; _npm audit_
  - require one review and a linear history
  - block force-pushes
- Enable Dependabot alerts and security updates, private vulnerability reporting, and secret scanning with **push protection**.

## Day-to-day

**A deploy failed.** Open the run summary.

- If the failure is in the migration step, the service was **not** touched. Fix forward with a new migration.
- If it fails after rollout, ECS has already rolled back, and the last step re-pointed DNS at the healthy tasks.

**Roll back.** Re-run the `deploy-production` job of the last good `main` run. It redeploys that run's image digest. Never re-tag images to roll back.

**Verify an image signature.**

```bash
cosign verify <registry>/nauricare-api@sha256:<digest> \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp '^https://github.com/benjaminketteytagoe-alu/nauricare/\.github/workflows/ci\.yml@refs/heads/(main|develop)$'
```

**`npm audit` fails.** Upgrade the dependency. If no fix exists yet and the vulnerable code path can't be reached, add an entry to `.github/audit-allowlist.json` with a reason and an expiry date no more than 3 months out. CI fails again once the expiry passes.

**Accessibility.** `e2e/smoke.spec.ts` currently _reports_ axe violations as annotations. Every public page has colour-contrast issues, which the design-system PR fixes. After that PR, set `AXE_ENFORCE=1` in the e2e job so violations fail the build.

## Known follow-ups

- Prisma 7 upgrade. This removes the allowlisted `deepmerge-ts` advisory (expires 2027-02-28).
- Replace per-task public IPs and DNS sync with an ALB or a Cloudflare Tunnel.
