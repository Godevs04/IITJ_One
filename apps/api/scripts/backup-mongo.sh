#!/usr/bin/env bash
# Automated MongoDB backup with retention — Phase 6.
#
# Usage:
#   MONGODB_URI="mongodb+srv://..." ./backup-mongo.sh
#
# Env vars:
#   MONGODB_URI        required — same connection string the API uses
#   BACKUP_DIR         default: ./backups
#   BACKUP_RETENTION_DAYS  default: 14 — backups older than this are deleted
#   BACKUP_TIMESTAMP_FILE  default: $BACKUP_DIR/.last-success — read by the
#                          API's backup_age_seconds Prometheus gauge; point
#                          the API's BACKUP_TIMESTAMP_FILE env var at the
#                          same path if it runs on a different host/volume
#                          than this script (a shared read-only mount, or
#                          sync the file another way).
#
# Requires the `mongodump` CLI (part of the MongoDB Database Tools —
# https://www.mongodb.com/docs/database-tools/installation/).

set -euo pipefail

MONGODB_URI="${MONGODB_URI:?MONGODB_URI is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP_FILE="${BACKUP_TIMESTAMP_FILE:-$BACKUP_DIR/.last-success}"

mkdir -p "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$BACKUP_DIR/iitj1-$STAMP"

echo "[backup] Starting mongodump → $DEST"
mongodump --uri="$MONGODB_URI" --gzip --out="$DEST"

echo "[backup] Compressing archive"
tar -C "$BACKUP_DIR" -czf "$DEST.tar.gz" "iitj1-$STAMP"
rm -rf "$DEST"

echo "[backup] Success — $DEST.tar.gz"
date -u +%s > "$TIMESTAMP_FILE"

echo "[backup] Applying retention (>${RETENTION_DAYS}d)"
find "$BACKUP_DIR" -maxdepth 1 -name 'iitj1-*.tar.gz' -mtime "+$RETENTION_DAYS" -print -delete

echo "[backup] Current backups:"
ls -lh "$BACKUP_DIR"/iitj1-*.tar.gz 2>/dev/null || echo "  (none)"
