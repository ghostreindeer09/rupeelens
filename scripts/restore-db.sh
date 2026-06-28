cd ~/Downloads/rupeelens-backup-scripts
mkdir -p ~/Downloads/rupeelens/scripts
cp backup-db.sh ~/Downloads/rupeelens/scripts/
cp restore-db.sh ~/Downloads/rupeelens/scripts/
chmod +x ~/Downloads/rupeelens/scripts/backup-db.sh ~/Downloads/rupeelens/scripts/restore-db.sh
cp package.json ~/Downloads/rupeelens/
cp gitignore-updated ~/Downloads/rupeelens/.gitignore
cp README.md ~/Downloads/rupeelens/#!/bin/bash
#
# scripts/restore-db.sh
#
# Restores the RupeeLens database from a backup created by
# backup-db.sh. Lists available backups and asks you to pick one —
# never restores silently, since this overwrites current data.
#
# Usage:
#   ./scripts/restore-db.sh

set -euo pipefail

PG_BIN="/opt/homebrew/opt/postgresql@15/bin"
DB_NAME="rupeelens"
BACKUP_DIR="$(dirname "$0")/../backups"

if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
  echo "No backups found in $BACKUP_DIR. Run backup-db.sh first."
  exit 1
fi

echo "Available backups:"
ls -1t "$BACKUP_DIR"/${DB_NAME}_*.sql.gz | nl -w2 -s'. '

echo ""
read -p "Enter the number of the backup to restore: " CHOICE

SELECTED_FILE=$(ls -1t "$BACKUP_DIR"/${DB_NAME}_*.sql.gz | sed -n "${CHOICE}p")

if [ -z "$SELECTED_FILE" ]; then
  echo "Invalid selection."
  exit 1
fi

echo ""
echo "WARNING: This will overwrite the current '$DB_NAME' database with:"
echo "    $SELECTED_FILE"
read -p "Type YES to confirm: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
  echo "Cancelled."
  exit 0
fi

echo "Restoring..."
gunzip -c "$SELECTED_FILE" | "$PG_BIN/psql" "$DB_NAME"
echo "Restore complete."
