#!/bin/bash
# Nightly dump of both databases: kept for a week on the server's volume and uploaded to R2
# (BACKUP_KEEP_DAYS days). Restore: see docs/DEPLOY.md.
set -uo pipefail

STAMP=$(date +%Y%m%d-%H%M)
DIR=/backups
mkdir -p "$DIR"
export PGPASSWORD="$POSTGRES_PASSWORD"

alert() {
  echo "BACKUP FAILED: $1"
  if [ -n "${TELEGRAM_ALERTS_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_ALERTS_CHAT_ID:-}" ]; then
    curl -s -m 10 "https://api.telegram.org/bot${TELEGRAM_ALERTS_BOT_TOKEN}/sendMessage" \
      -d chat_id="$TELEGRAM_ALERTS_CHAT_ID" -d text="Backup failed: $1" >/dev/null || true
  fi
}

status=0
for db in agrolab_store agrolosk; do
  file="$DIR/$db-$STAMP.dump"
  if pg_dump -h postgres -U postgres -Fc "$db" -f "$file"; then
    echo "dumped $db: $(du -h "$file" | cut -f1)"
    if [ -n "${R2_BACKUP_BUCKET:-}" ] && [ -n "${R2_ACCOUNT_ID:-}" ]; then
      AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" AWS_DEFAULT_REGION=auto \
        aws s3 cp "$file" "s3://$R2_BACKUP_BUCKET/backups/$(basename "$file")" \
        --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com" --only-show-errors \
        || { alert "upload of $db to R2"; status=1; }
    fi
  else
    alert "pg_dump of $db"
    status=1
  fi
done

find "$DIR" -name '*.dump' -mtime +7 -delete

if [ -n "${R2_BACKUP_BUCKET:-}" ] && [ -n "${R2_ACCOUNT_ID:-}" ]; then
  cutoff=$(date -d "@$(( $(date +%s) - ${BACKUP_KEEP_DAYS:-30} * 86400 ))" +%Y%m%d)
  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" AWS_DEFAULT_REGION=auto \
    aws s3 ls "s3://$R2_BACKUP_BUCKET/backups/" --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com" 2>/dev/null \
    | awk '{print $4}' | while read -r name; do
      day=$(echo "$name" | grep -oE '[0-9]{8}-[0-9]{4}' | cut -c1-8)
      if [ -n "$day" ] && [ "$day" -lt "$cutoff" ]; then
        AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" AWS_DEFAULT_REGION=auto \
          aws s3 rm "s3://$R2_BACKUP_BUCKET/backups/$name" --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com" --only-show-errors
      fi
    done
fi
exit $status
