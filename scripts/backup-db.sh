#!/bin/bash
#
# scripts/backup-db.sh
#
# Dumps the RupeeLens Postgres database to a timestamped, compressed
# file. Run manually whenever you want a snapshot, or schedule it
# to run regularly without thinking about it.
#
# Usage:
#   ./scripts/backup-db.sh
#
# Restores from a backup with:
#   gunzip -c backups/rupeelens_2026-06-28_143000.sql.gz | psql rupeelens

set -euo pipefail

PG_BIN="/opt/homebrew/opt/postgresql@15/bin"
DB_NAME="rupeelens"
DB_USER="$(whoami)"
BACKUP_DIR="$(dirname "$0")/../backups"
KEEP_LAST_N=10

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "Backing up '$DB_NAME' to $BACKUP_FILE ..."

"$PG_BIN/pg_dump" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Done. Backup size: $SIZE"

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/${DB_NAME}_*.sql.gz 2>/dev/null | wc -l | tr -d ' ')

if [ "$BACKUP_COUNT" -gt "$KEEP_LAST_N" ]; then
  TO_DELETE=$((BACKUP_COUNT - KEEP_LAST_N))
  echo "Pruning $TO_DELETE old backup(s), keeping the most recent $KEEP_LAST_N ..."
  ls -1t "$BACKUP_DIR"/${DB_NAME}_*.sql.gz | tail -n "$TO_DELETE" | xargs rm -f
fi

echo "Current backups:"
ls -lh "$BACKUP_DIR"/${DB_NAME}_*.sql.gz 2>/dev/null || echo "  (none yet)"
