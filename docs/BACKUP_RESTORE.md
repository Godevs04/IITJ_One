# Backup & Restore — IITJ One Live Transport (Phase 6)

MongoDB is the only durable state in this system (Redis, when used, is
entirely a cache/adapter — every Redis-backed feature is safe to lose and
automatically falls back to in-memory behavior; nothing needs to be backed
up there). This document covers backing up and restoring that Mongo data.

## Automated backups

`apps/api/scripts/backup-mongo.sh` — wraps `mongodump`, compresses the
result, applies a retention policy, and records a success timestamp.

```bash
MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/iitj1" \
  BACKUP_DIR="/var/backups/iitj1" \
  BACKUP_RETENTION_DAYS=14 \
  ./apps/api/scripts/backup-mongo.sh
```

Requires the [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/installation/)
(`mongodump`/`mongorestore`/`mongosh`) on the machine running the script —
these are separate from the `mongodb` npm driver the API itself uses.

### Scheduling

Run this on a cron (or a scheduled GitHub Actions workflow, or your host's
scheduled-job feature) — not included as a GitHub Actions workflow here
since backup frequency/timing is environment-specific (e.g. Atlas's own
managed backups may already cover this — check before running a duplicate
backup pipeline against the same cluster). A daily cron entry:

```cron
0 3 * * * MONGODB_URI="..." BACKUP_DIR="/var/backups/iitj1" /path/to/apps/api/scripts/backup-mongo.sh >> /var/log/iitj1-backup.log 2>&1
```

### Retention

`BACKUP_RETENTION_DAYS` (default 14) — the script deletes any
`iitj1-*.tar.gz` archive in `BACKUP_DIR` older than this on every run.
Increase it if you need a longer retention window; storage cost scales
roughly linearly with the number of archives kept.

### Backup health

Every successful run writes the current Unix timestamp to
`BACKUP_TIMESTAMP_FILE` (default `$BACKUP_DIR/.last-success`). Point the
API's own `BACKUP_TIMESTAMP_FILE` environment variable at the same path
(directly, or via a shared/synced volume if the backup script runs on a
different host) to expose it as the `backup_age_seconds` Prometheus gauge
— see [MONITORING.md](./MONITORING.md). A gauge that keeps climbing past
your backup interval means the cron job stopped running or is failing
silently; check `/var/log/iitj1-backup.log` (or wherever you redirected
the cron job's output).

## Restore verification

**Restoring a backup you've never tested restoring is not a backup
strategy.** `apps/api/scripts/restore-mongo-verify.sh` restores the most
recent (or a specified) archive into a **separate scratch database** —
never the production one — and prints a per-collection document count so
you can sanity-check the restore actually contains real data.

```bash
MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/iitj1" \
  ./apps/api/scripts/restore-mongo-verify.sh
# or restore a specific archive:
MONGODB_URI="..." ./apps/api/scripts/restore-mongo-verify.sh /var/backups/iitj1/iitj1-20260115T030000Z.tar.gz
```

Run this **on a schedule too** (monthly, at minimum) — a backup pipeline
that silently stopped producing usable archives is worse than having no
backups, because it creates false confidence. The scratch database
(`iitj1_restore_verify` by default) is left in place after the script runs
for manual inspection — drop it once you're satisfied:

```bash
mongosh "<scratch-uri>" --eval 'db.dropDatabase()'
```

## Actually restoring production (disaster scenario)

1. **Stop writes** — put the API in a maintenance state (scale to zero, or
   rely on the mobile app's `maintenance_mode` Remote Config flag) so
   nothing writes to Mongo while you're restoring over it.
2. Pick the archive to restore from (`ls -t $BACKUP_DIR/iitj1-*.tar.gz`).
3. Extract and restore **into the real database**, this time (note: no
   `--drop` unless you specifically want to wipe existing data first —
   consider whether a partial/corrupted current state should be preserved
   for forensics before overwriting it):
   ```bash
   tar -xzf iitj1-<timestamp>.tar.gz -C /tmp/restore
   mongorestore --uri="$MONGODB_URI" --gzip /tmp/restore/iitj1-<timestamp>
   ```
4. Verify with a few spot-checks (`GET /api/v1/health` → `storage: "mongodb"`,
   log into the admin panel, confirm recent-looking data).
5. Resume writes (undo step 1).
6. Write down what happened and when in your incident record — see
   [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) for the fuller disaster
   recovery workflow this backup step fits into.

## What is NOT covered by this backup strategy

- **Redis** — deliberately not backed up. It's a cache/adapter for
  ephemeral live-tracking state (contributor pool, BusState cache, rate
  limits, replay ring buffer); losing it just means those features
  fall back to in-memory/recompute-from-Mongo, not data loss.
- **Uploaded files** (`apps/api/uploads/` — Cloudinary-hosted images have
  their own durability via Cloudinary; anything stored locally on the API
  host's disk instead is not covered here — back up that directory
  separately if you rely on local file storage).
- **Environment variables / secrets** — back these up via your secret
  manager's own mechanism (see DEPLOYMENT.md's environment variable
  tables), not this script.
