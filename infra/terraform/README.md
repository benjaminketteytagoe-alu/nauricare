# Infrastructure (Terraform)

AWS infrastructure for NauriCare, as code. It **adopts** the existing hand-built production resources; it doesn't recreate them.

```
bootstrap/            one-off: encrypted, versioned S3 state bucket (S3-native locking)
envs/shared/          ECR repository + GitHub OIDC roles (deploy, plan, optional apply)
envs/staging/         staging app environment
envs/production/      production app environment (imports the existing resources)
modules/
  app-environment/    composes everything below for one environment
  network/            looks up the VPC; app security group (port 3000 from Cloudflare only)
  ecs-service/        cluster (Container Insights), roles, log group, bootstrap task def, service
  ssm-params/         secret names -> SSM ARNs; fails the plan if one is missing (never touches values)
  reminders-cron/     EventBridge schedule -> /api/cron/execute, retries + DLQ
  observability/      SNS alerts, alarms, uptime + latency checks, dashboard, budget
  github-oidc/        keyless CI access with least privilege
  rds/                optional managed Postgres (production uses Neon today)
```

## Who owns what

| Concern                                                          | Owner                                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| Cluster, roles, security group, log group, alarms, schedule, ECR | **Terraform**                                                      |
| Task definition revisions (image digest, secret list)            | **CI** (`deploy-ecs.yml`). Terraform ignores them                  |
| Secret values                                                    | **Humans**, via SSM, out-of-band. Never in Terraform, state or Git |
| DNS records pointing at task IPs                                 | `cloudflare-ecs-dns.sh` (until an ALB or Tunnel replaces it)       |

`terraform apply` never redeploys or rolls back the app.

## Rules

- **Never put secret values in `.tf` or `.tfvars` files, or in state.** Modules reference SSM ARNs only. The EventBridge connection is created with a placeholder, and `setup-reminder-scheduler.sh schedule` pushes the real `CRON_SECRET`.
- `terraform.tfvars` per root **is committed**. It holds non-secret configuration (account id, alert addresses, bucket names) so plans are reproducible.
- Every change goes through a PR. CI runs fmt, validate, tflint and Trivy, then a read-only plan per root. Apply is a manual, reviewed workflow run.

## First-time setup (AWS admin, once)

```bash
# 0. Terraform >= 1.10 (CI pins 1.17.2)
cd infra/terraform

# 1. State bucket
terraform -chdir=bootstrap init
terraform -chdir=bootstrap apply -var state_bucket_name=nauricare-tfstate-<account-id>

# 2. Shared: ECR (import the existing repo) + OIDC roles
cd envs/shared
cp backend.hcl.example backend.hcl            # fill in the bucket
cp terraform.tfvars.example terraform.tfvars  # fill in, commit
cp imports.tf.example imports.tf
terraform init -backend-config=backend.hcl
terraform plan    # expect: 1 import, OIDC provider + roles to add
terraform apply && rm imports.tf
terraform output  # deploy_role_arn -> GitHub var AWS_ROLE_ARN; plan_role_arn -> TF_PLAN_ROLE_ARN

# 3. Production: import, then apply
cd ../production
cp backend.hcl.example backend.hcl
cp terraform.tfvars.example terraform.tfvars  # set execution_role_name/task_role_name to the EXISTING roles
cp imports.tf.example imports.tf              # fill the <...> ids (aws ecs describe-services ...)
terraform init -backend-config=backend.hcl
terraform plan    # REVIEW: imports only. No destroy or replace of the service or cluster.
terraform apply && rm imports.tf
```

**Before the first production apply, read the plan line by line.** Expected changes:

- The new app security group, which allows only Cloudflare. The service moves to it. If anything other than Cloudflare reaches the origin directly, set `restrict_ingress_to_cloudflare = false` first.
- Container Insights is set to "enhanced". This adds a small CloudWatch cost.
- The circuit breaker and rollback are enabled.
- The reminder rule state comes from `reminders_enabled`. **Set it to `true` if the schedule is already on**, or apply will disable it.
- New alarms, the SNS topic and the dashboard. Each alert address gets a confirmation email.

**Staging** is created fresh with no imports.

1. Create its SSM secrets under `/nauricare/staging/`. Use its **own** database: a Neon branch or `modules/rds`, never production data.
2. Apply the staging root.
3. Point `staging.nauricare.org` at it through the DNS sync.
4. Set the GitHub variables `STAGING_ECS_CLUSTER=nauricare-staging`, `STAGING_ECS_SERVICE=nauricare-staging`, `STAGING_DNS_NAMES` and `STAGING_URL`.

## GitHub variables used by `infra.yml`

| Variable                               | Purpose                                                             |
| -------------------------------------- | ------------------------------------------------------------------- |
| `TF_PLAN_ROLE_ARN`                     | Turns on PR plans (`shared` output `plan_role_arn`)                 |
| `TF_STATE_BUCKET`                      | State bucket name                                                   |
| `TF_APPLY_ROLE_ARN`                    | Turns on manual apply (set `create_apply_role = true` in shared)    |
| `AWS_ACCOUNT_ID`, `TF_BOOTSTRAP_IMAGE` | Fallbacks used only when a root has no committed `terraform.tfvars` |

Create a GitHub environment **`infrastructure`** with required reviewers before you set `TF_APPLY_ROLE_ARN`.

## Moving the S3 uploads to the task role

`modules/ecs-service` grants the task role read and write on `uploads_bucket_name`, and `src/lib/s3.ts` uses the task role whenever no static keys are set. To switch:

1. Set `uploads_bucket_name` and apply.
2. Make sure the running task definition has the Terraform task role. CI copies `taskRoleArn` from the running revision, so update the service once with `aws ecs update-service --task-definition <family>` after registering a revision that uses it.
3. Remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from the task's secrets.
4. Deactivate those IAM keys.

## Follow-ups

- Replace task public IPs and DNS sync with an ALB, or a Cloudflare Tunnel (`cloudflared` sidecar). That also gives real 5xx and latency metrics per request.
- Move production from Neon to `modules/rds` if data residency or a BAA-style agreement calls for it. Restore drills: `docs/runbooks/db-restore.md`.
