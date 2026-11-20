# 0006: Observability without shipping health data to third parties

- Status: Accepted
- Date: 2026-11-19

## Context

We need to know when NauriCare is down, slow or erroring, and to debug individual failures. The app handles reproductive-health data covered by Rwanda's Law N° 058/2021 on personal data protection. Error trackers such as Sentry capture request context, breadcrumbs and local variables by default, and send them to another processor in another jurisdiction.

## Decision

1. **Logs:** structured JSON through `pino` (`src/lib/logger.ts`), written to stdout and shipped by ECS to CloudWatch Logs in our AWS account.
   - Redaction runs on every log line, covering credentials, identifiers and health fields. Email addresses are scrubbed from error messages.
   - The rule is to **log ids and outcomes, never content.**
2. **Errors:** Next.js `onRequestError` (`src/instrumentation.ts`) logs every uncaught server error with the route _pattern_, never the concrete path or query.
3. **Metrics and alerts:** CloudWatch alarms send to SNS (`infra/terraform/modules/observability`). They cover:
   - error rate, from log metric filters
   - ECS health
   - Route 53 uptime and latency checks against `/api/health/ready`
   - reminder schedule failures and stalls
   - cost
4. **Tracing:** OpenTelemetry through `@vercel/otel`. It is off unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set, for example an ADOT collector sidecar exporting to X-Ray in the same account.
5. **No third-party error SaaS by default.** Sentry or a similar tool may be added later only with a data-processing agreement, `sendDefaultPii: false`, request bodies and breadcrumbs stripped, and a privacy-policy update.

## Consequences

- Telemetry stays in one AWS account and region, and sits behind the same IAM controls as the data itself.
- There is no session replay or client-side error tracking. Client errors only show up if they reach a server route.
- Without an ALB, there are no per-request 5xx or latency metrics. Uptime and latency come from synthetic checks, and errors from logs. An ALB or Cloudflare Tunnel (follow-up) would add those metrics.
