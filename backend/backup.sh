#!/bin/bash
# ============================================================
# Database Backup Script
# Run manually or add to cron for automated daily backups
#
# SETUP:
# 1. Make executable: chmod +x backup.sh
# 2. Add to crontab for daily 2 AM backup:
#    crontab -e
#    0 2 * * * /path/to/backend/backup.sh >> /var/log/backup.log 2>&1
#
# RESTORE:
#    gunzip backup_YYYYMMDD_HHMMSS.sql.gz
#    mysql -u root -p backend < backup_YYYYMMDD_HHMMSS.sql
# ============================================================

# Load .env values
if [ -f "$(dirname "$0")/.env" ]; then
    export $(grep -v '^#' "$(dirname "$0")/.env" | grep -E '^DB_' | xargs)
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_DATABASE="${DB_DATABASE:-backend}"
DB_USERNAME="${DB_USERNAME:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Backup directory — change this to wherever you want backups stored
BACKUP_DIR="$(dirname "$0")/storage/backups"
mkdir -p "$BACKUP_DIR"

# Filename with timestamp
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="backup_${DATE}.sql"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo "[$(date)] Starting backup of database: $DB_DATABASE"

# Run mysqldump
if [ -z "$DB_PASSWORD" ]; then
    mysqldump \
        -h "$DB_HOST" \
        -P "$DB_PORT" \
        -u "$DB_USERNAME" \
        --single-transaction \
        --routines \
        --triggers \
        "$DB_DATABASE" > "$FILEPATH"
else
    mysqldump \
        -h "$DB_HOST" \
        -P "$DB_PORT" \
        -u "$DB_USERNAME" \
        -p"$DB_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        "$DB_DATABASE" > "$FILEPATH"
fi

if [ $? -eq 0 ]; then
    # Compress the backup
    gzip "$FILEPATH"
    echo "[$(date)] Backup successful: ${FILENAME}.gz"

    # Delete backups older than 30 days
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete
    echo "[$(date)] Old backups cleaned up (kept last 30 days)"
else
    echo "[$(date)] ERROR: Backup failed!"
    rm -f "$FILEPATH"
    exit 1
fi
