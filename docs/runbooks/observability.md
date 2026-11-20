# Observability and alert response

Alerts go by email from the SNS topic `nauricare-<env>-alerts`. They carry counts and resource names, never patient data. The dashboard is CloudWatch → Dashboards → `nauricare-<env>`. Design: [ADR 0006](../adr/0006-observability.md).

## Logs

The app writes one JSON object per line (`src/lib/logger.ts`) to CloudWatch log group `/ecs/<service>`.

| Field                                      | Meaning                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `level` / `severity`                       | 30 = info, 40 = warn, 50 = error, 60 = fatal                           |
| `event`                                    | Stable machine name, e.g. `request.error`, `cron.reminders_run`        |
| `requestId`                                | `x-request-id`, else Cloudflare `cf-ray` (search it in Cloudflare too) |
| `route`, `routeType`                       | Route **pattern** and kind (render/route/action/proxy) for errors      |
| `err.type`, `err.message`, `err.errorCode` | Error details (emails scrubbed; Prisma codes like `P2002`)             |
| `version`                                  | Commit SHA of the running image                                        |

Logs Insights starter queries:

```
fields @timestamp, event, route, err.type, err.message, requestId
| filter level >= 50
| sort @timestamp desc | limit 100
```

```
filter event = "request.error" | stats count() by route, err.type | sort count() desc
```

```
filter requestId = "<cf-ray or x-request-id>" | sort @timestamp asc
```

**Privacy rule:** log ids and outcomes, never content. Never log request bodies, notes, symptoms, lab values, emails or names. Redaction is only a safety net. If a log line ever contains health data, treat it as an incident (see [data-breach.md](data-breach.md)) and shorten retention or delete the affected log streams.

## Alarms

| Alarm                           | Meaning                                      | First steps                                                                                                                                                                                          |
| ------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `…-down`                        | `/api/health/ready` failing from Route 53    | Run `curl -s https://nauricare.org/api/health/ready`. If it returns 503 with `database: error`, check the DB status (Neon or RDS). If there's no response, check ECS tasks, DNS sync and Cloudflare. |
| `…-slow`                        | Time to first byte above 1.5 s               | Check CPU/memory on the dashboard and DB latency. Consider scaling `desired_count` or `cpu`.                                                                                                         |
| `…-server-errors`               | More than 5 errors in 5 minutes              | Run the first Logs Insights query and group by route. If the errors started at a deploy, roll back (see [ci-cd.md](ci-cd.md)).                                                                       |
| `…-tasks-below-desired`         | Fewer tasks running than desired             | Look at the ECS service events. Common causes: a missing SSM parameter, an image pull failure, failing health checks.                                                                                |
| task-crashed (event)            | A task exited or failed to start             | The alert includes the stop reason. Check the task logs for the crash.                                                                                                                               |
| `…-cpu-high` / `…-memory-high`  | Sustained over 80% / 85%                     | Look for a hot route in the logs. Raise task size in Terraform if the load is legitimate.                                                                                                            |
| `…-reminders-invocation-failed` | EventBridge could not call the cron endpoint | See the troubleshooting table in [reminder-scheduler.md](reminder-scheduler.md) (401, 403 and 404 causes).                                                                                           |
| `…-reminders-dead-letters`      | Calls exhausted their retries                | Inspect messages in `…-reminders-dlq`, fix the cause, then purge the queue.                                                                                                                          |
| `…-reminders-stalled`           | No successful sweep in an hour               | Check whether the rule is disabled, the endpoint is failing, or the sweep is erroring (`event = "cron.reminders_run"`, `ok = false`).                                                                |
| budget                          | Spend above 80%, or forecast above 100%      | Cost Explorer by service. Container Insights and log volume are the usual growth.                                                                                                                    |

## Tracing (optional)

Set `OTEL_EXPORTER_OTLP_ENDPOINT` (and optionally `OTEL_SERVICE_NAME`) in the task definition to export Next.js spans over OTLP. For AWS X-Ray, add an ADOT collector sidecar listening on `localhost:4318`. It is off by default.
