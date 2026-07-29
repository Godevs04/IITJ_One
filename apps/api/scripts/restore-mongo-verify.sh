#!/usr/bin/env bash
# Restore verification — Phase 6. Restores the most recent (or a given)
# backup archive into a SEPARATE scratch database (never the production
# one) and runs a basic sanity check, so "the backup works" is something
# you've actually tested, not assumed.
#
# Usage:
#   MONGODB_URI="mongodb+srv://cluster/..." ./restore-mongo-verify.sh [path/to/backup.tar.gz]
#   (omit the path to restore the newest archive in BACKUP_DIR)
#
# Env vars:
#   MONGODB_URI        required — base connection string (database name is
#                      replaced with a scratch DB, see below)
#   BACKUP_DIR         default: ./backups
#   RESTORE_SCRATCH_DB default: iitj1_restore_verify

set -euo pipefail

MONGODB_URI="${MONGODB_URI:?MONGODB_URI is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
SCRATCH_DB="${RESTORE_SCRATCH_DB:-iitj1_restore_verify}"

ARCHIVE="${1:-}"
if [ -z "$ARCHIVE" ]; then
  ARCHIVE="$(ls -t "$BACKUP_DIR"/iitj1-*.tar.gz 2>/dev/null | head -n1 || true)"
fi
if [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ]; then
  echo "[restore-verify] No backup archive found (looked in $BACKUP_DIR)" >&2
  exit 1
fi

echo "[restore-verify] Using archive: $ARCHIVE"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

tar -xzf "$ARCHIVE" -C "$WORKDIR"
DUMP_DIR="$(find "$WORKDIR" -mindepth 1 -maxdepth 1 -type d | head -n1)"

# Swap the URI's database name for the scratch DB — never restore over the
# real database as part of a "verify the backup" run.
SCRATCH_URI="$(echo "$MONGODB_URI" | sed -E "s#(mongodb(\+srv)?://[^/]+)(/[^?]*)?#\1/$SCRATCH_DB#")"

echo "[restore-verify] Restoring into scratch database: $SCRATCH_DB"
mongorestore --uri="$SCRATCH_URI" --gzip --drop "$DUMP_DIR"

echo "[restore-verify] Sanity check — collection document counts:"
mongosh "$SCRATCH_URI" --quiet --eval '
  db.getCollectionNames().forEach(function (name) {
    print(name + ": " + db.getCollection(name).countDocuments());
  });
'

echo "[restore-verify] Done. Scratch database left in place for inspection —"
echo "drop it manually when finished: mongosh \"$SCRATCH_URI\" --eval 'db.dropDatabase()'"
