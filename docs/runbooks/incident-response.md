# Incident response

An incident is anything that stops patients or providers using NauriCare, risks their data, or causes wrong clinical information to be shown. When unsure, declare one. Closing a false alarm costs little.

## Severity

| Level    | Examples                                                                                                | Response                                         |
| -------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **SEV1** | Site down; data exposed or suspected exposed; wrong patient's data shown; red-flag escalation not shown | Immediately, all hands; breach procedure if data |
| **SEV2** | Sign-in, booking, triage or reminders broken for many users; sustained errors                           | Within 1 hour                                    |
| **SEV3** | A single feature degraded; a workaround exists                                                          | Next working day                                 |

## Roles

For a small team, one person may hold several roles, but name each one explicitly:

- **Incident lead:** decides and coordinates. Doesn't debug.
- **Operator:** investigates and makes changes.
- **Communicator:** updates users and partners, and the regulator if needed.

## Steps

1. **Declare.** Open a private incident channel and note the start time, severity and lead.
2. **Stabilise before diagnosing.** Use the fastest safe lever:
   - Roll back to the last good image (see [ci-cd.md](ci-cd.md)).
   - Disable a feature: `INSIGHTS_AI=off`, `REMINDER_SCHEDULER`, or the EventBridge rule (`setup-reminder-scheduler.sh disable`).
   - Scale or restart the service: `aws ecs update-service --force-new-deployment`.
   - If credentials may be compromised, rotate them ([credential-rotation.md](credential-rotation.md)).
3. **Investigate** with the alarms and logs in [observability.md](observability.md), working from `requestId` and `route`.
4. **Communicate** at least hourly during SEV1/2. Tell users what is affected and when the next update comes. Never include patient details.
5. **Personal data involved?** Start [data-breach.md](data-breach.md) **now**. The 48-hour clock starts when you become aware.
6. **Resolve** once metrics are back to normal for 30 minutes. Note the end time.
7. **Review** within 5 working days, blameless. Write down the timeline, the root cause, what helped, what hurt, and the actions, each with an owner and a date. Store reviews privately, not in this repo if they hold personal data.

## Useful commands

```bash
aws ecs describe-services --cluster default --services nauricare-api-0acf \
  --query 'services[0].{running:runningCount,desired:desiredCount,events:events[:5].message}'
aws logs tail /ecs/nauricare-api-0acf --since 30m --filter-pattern '{ $.level >= 50 }'
curl -s https://nauricare.org/api/health/ready
```
