# Runbook: app secrets and the reminder scheduler

Reminders (period, daily check-in, weekly summary, consultation) are sent by a
sweep that AWS EventBridge triggers every 15 minutes:

```
EventBridge rule (rate 15 min) ──► API destination ──► POST https://nauricare.org/api/cron/execute
   retries ×2, then SQS DLQ          Authorization: <CRON_SECRET>      202 Accepted (sweep runs after the response)
```

Web servers run no timers. Every reminder goes through the `ReminderDispatch`
ledger (claim → deliver → SENT, one row per reminder), so retried or
overlapping invocations never send twice, and failed sends retry on the next
run (up to 5 attempts). Emails also carry a Resend idempotency key.

## Secrets

| Name | Where it lives | Who can read it |
|---|---|---|
| `DATA_ENCRYPTION_KEY` | SSM `/nauricare/production/DATA_ENCRYPTION_KEY` (SecureString) | ECS task execution role, at task start |
| `CRON_SECRET` | SSM `/nauricare/production/CRON_SECRET` and the EventBridge connection (its own Secrets Manager secret) | ECS execution role; EventBridge |
| `CRON_SECRET_PREVIOUS` | SSM, only during a rotation | ECS execution role |

Rules:
- Never put these values in the repo, `.env` files, GitHub variables, chat, tickets or logs. The setup script reads them from hidden input or generates them, and passes them to AWS on stdin only.
- **Never change `DATA_ENCRYPTION_KEY`** once data exists: referral share links and claim tokens sealed with it become unreadable. Rotating it needs a re-encryption migration.
- Use a different key in development. Don't copy production values to a laptop.

## First-time setup (AWS admin)

```bash
export AWS_REGION=us-east-1
.github/scripts/setup-reminder-scheduler.sh secrets    # store secrets, grant the ECS execution role
# GitHub › Settings › Secrets and variables › Actions › Variables:
#   APP_SSM_SECRETS = DATA_ENCRYPTION_KEY,CRON_SECRET
# Deploy (push to main): the task definition now injects both from SSM.
.github/scripts/setup-reminder-scheduler.sh schedule   # EventBridge connection, destination, role, DLQ, rule (DISABLED)
.github/scripts/setup-reminder-scheduler.sh enable
```

Cloudflare: add a WAF custom rule that skips Bot Fight Mode and managed
challenges for `http.request.uri.path eq "/api/cron/execute"`. EventBridge is
not a browser and would otherwise be challenged. The endpoint is still
protected by the secret, a timing-safe comparison and failed-attempt rate limiting.

## Health

- `GET /api/admin/cron` (admin session): last runs, `healthy` (a run in the last 45 min), failed reminders with errors, stuck claims.
- Each run writes an `AuditEvent` with action `CRON_REMINDERS_RUN`.
- Alarm on: messages in the `nauricare-reminders-dlq` queue, and the EventBridge rule's `FailedInvocations` metric.
- On start-up in production the app logs a warning if `CRON_SECRET` or `DATA_ENCRYPTION_KEY` is missing.

Manual run (prints the summary):

```bash
curl -X POST "https://nauricare.org/api/cron/execute?wait=1" -H "Authorization: $(aws ssm get-parameter --name /nauricare/production/CRON_SECRET --with-decryption --query Parameter.Value --output text)"
```

## Rotating CRON_SECRET (no missed runs)

1. `setup-reminder-scheduler.sh rotate-cron` (old value kept as `CRON_SECRET_PREVIOUS`)
2. Set `APP_SSM_SECRETS=DATA_ENCRYPTION_KEY,CRON_SECRET,CRON_SECRET_PREVIOUS` and deploy (the app accepts both).
3. `setup-reminder-scheduler.sh schedule` (EventBridge switches to the new value).
4. After a healthy run: `setup-reminder-scheduler.sh drop-previous`, remove it from `APP_SSM_SECRETS`, deploy.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| 404 from the endpoint | `CRON_SECRET` not set in the running task (check `APP_SSM_SECRETS`, redeploy) |
| 401 | EventBridge connection holds an old secret: run `schedule` |
| 403 / challenge page in DLQ | Cloudflare WAF rule missing |
| Task fails to start after deploy | A name in `APP_SSM_SECRETS` has no SSM parameter, or the execution role lacks `ssm:GetParameters`: run `secrets` |
| Reminders `FAILED` with Resend errors | Daily quota or unverified sender domain; they retry automatically (5 attempts) |
