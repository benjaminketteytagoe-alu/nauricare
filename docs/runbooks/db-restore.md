# Database backup and restore

Production uses **Neon** Postgres today. `infra/terraform/modules/rds` is ready for a move to RDS. Both support point-in-time recovery (PITR).

**Restore into a new database, never over the live one.** Verify the restored copy first, then switch `DATABASE_URL`. That keeps the damaged state available for investigation and lets you roll back the restore itself.

## Neon (current)

- **Retention:** PITR history depends on the plan (Neon calls it "history retention"). Confirm it is **at least 7 days** in Project settings → Storage.
- **Restore to a point in time:**
  1. Create a branch from `main` at the timestamp just before the incident (Console → Branches → Create → "Point in time"). Or use `neon branches create --parent main --name restore-<date> --parent-timestamp <ISO-8601>`.
  2. Verify it: connect read-only and check row counts and the latest `"AuditLog"."createdAt"`, then spot-check the affected tables.
  3. Cut over. Either promote the branch ("Set as primary"), or store its connection string as the SSM `/nauricare/production/DATABASE_URL` (hidden input, as in credential-rotation.md) and redeploy.
  4. Run `prisma migrate status` against it. Apply pending migrations with `prisma migrate deploy` if the restore point predates a migration.
- **Logical backup (weekly, kept outside Neon):** `pg_dump --format=custom --no-owner "$DATABASE_URL" > nauricare-$(date +%F).dump`. Store the dump encrypted (S3 with SSE-KMS and a 35-day lifecycle) and never on a laptop.

## RDS (when adopted)

- Automated backups are kept 14 days with PITR, encrypted with the module's KMS key. Deletion protection is on, and a final snapshot is taken on delete.
- **Restore to a point in time:**
  ```bash
  aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier nauricare-production \
    --target-db-instance-identifier nauricare-restore-$(date +%Y%m%d%H%M) \
    --restore-time 2026-01-01T10:00:00Z \
    --db-subnet-group-name nauricare-production --vpc-security-group-ids <db-sg> --no-publicly-accessible
  ```
  Then verify the copy and cut over exactly as for Neon. Afterwards, import the new instance into Terraform, or rename it into place.

## Restore drill (every quarter)

1. Restore production to a timestamp one hour ago, as a branch or instance named `drill-<date>`.
2. Point a **staging** task at it, or run `prisma migrate status` plus row-count checks against it.
3. Record in the table below how long it took (your recovery time) and how much data the restore point would have lost (your recovery point).
4. Delete the drill copy. It contains production data, so it must not live on.

| Date | Engine | Restore point | Time to usable | Issues |
| ---- | ------ | ------------- | -------------- | ------ |
|      |        |               |                |        |

Targets: a recovery point of 15 minutes or less (PITR), and a recovery time of 2 hours or less.
