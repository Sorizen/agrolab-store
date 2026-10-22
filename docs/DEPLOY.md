# Deploying the store (Docker, one server)

Everything runs on one VPS with Docker Compose: the store (Next.js), the parser, Postgres, Caddy (HTTPS), Uptime Kuma and the nightly backup. DNS, the CDN, photos (R2) and mail forwarding live in Cloudflare; outgoing mail goes through Resend.

Target: a fresh **Ubuntu 24.04** VPS (2 vCPU, 4 GB RAM, backups on) with your SSH key. About 40 minutes. The commands use `agrolab.com.ua`; change it if the domain differs.

## 1. Prepare the server

From your computer, copy the script and run it as root:

```bash
scp deploy/bootstrap.sh root@<server-ip>:/root/
ssh root@<server-ip> "bash /root/bootstrap.sh"
```

It installs Docker, creates the `deploy` user (with your SSH key), turns off root login and password login, opens only ports 22, 80 and 443, adds 2 GB swap (the site build needs it), and enables automatic security updates. Log in afterwards as `ssh deploy@<server-ip>`.

## 2. Get the code

Both repositories sit side by side, because the compose file builds the parser from `../../agrolosk-parser`:

```bash
cd /srv/agrolab
git clone <store-repo-url> agrolab-store
git clone <parser-repo-url> agrolosk-parser
cd agrolab-store/deploy
```

## 3. Configure

```bash
cp .env.example .env
cp store.env.example store.env
nano .env store.env
```

`.env` is read by Compose: domain, database passwords (`openssl rand -base64 24` for each), the R2 keys, the GA4 id. `store.env` is read by the store: `AUTH_SECRET`, `SUPPLIER_SYNC_SECRET`, Monobank, Telegram, Resend. Both files never go to Git and are not shared in chat.

Values that must be right:

| File | Key | Value |
|---|---|---|
| `.env` | `DOMAIN` | `agrolab.com.ua` |
| `.env` | `R2_PUBLIC_URL` | `https://img.agrolab.com.ua` |
| `.env` | `R2_BUCKET` | the photo bucket (`agrolosk-images`) |
| `.env` | `R2_BACKUP_BUCKET` and `R2_BACKUP_*` keys | the private backup bucket and its own key |
| `store.env` | `MAIL_FROM` | `Agrolab <noreply@agrolab.com.ua>` |
| `store.env` | `MONOBANK_API_TOKEN` | empty hides card payment; cash on delivery still works |

## 4. DNS

In Cloudflare, DNS: set the `A` records for `agrolab.com.ua`, `www` and `status` to the server IP. Keep them **DNS only** (grey cloud) until the site opens over HTTPS, then you can switch the site and `img` to proxied. Caddy gets the certificate by itself on the first request.

## 5. Start

```bash
docker compose up -d --build
docker compose ps
```

The first build takes a few minutes. The store creates its tables on start; the parser runs its migrations on start.

## 6. Load the parser database from the dump

Do not wait for a full scrape: restore the finished database. The dump lives in the parser repo (`agrolosk.dump`).

```bash
docker compose stop parser
docker compose exec -T postgres psql -U postgres -c "drop database agrolosk" -c "create database agrolosk owner parser"
docker compose exec -T postgres pg_restore -U postgres -d agrolosk --no-owner --role=parser < ../../agrolosk-parser/agrolosk.dump
docker compose start parser
docker compose exec -T postgres psql -U postgres -d agrolosk -At -c "select count(*) from products"
```

The count must be about 6455. Then the first import into the store:

```bash
docker compose exec store node scripts/sync-supplier.mjs --full
```

## 7. Create the admin

```bash
docker compose exec store npm run create-admin -- you@agrolab.com.ua 'a-long-password'
```

Log in at `https://agrolab.com.ua/profile/login`, then open `/admin`. Do not use `admin12345`.

## 8. Schedule the sync

```bash
crontab -e
```

Paste the two lines from `deploy/crontab.example` (hourly price check, Sunday full re-scrape). The path in the file is `/srv/agrolab/agrolab-store/deploy`; change it if you cloned elsewhere. The log is `/var/log/agrolab-sync.log`.

## 9. Monitoring

Open `https://status.agrolab.com.ua`, create the Uptime Kuma admin, then add monitors: the site (`https://agrolab.com.ua`), `https://agrolab.com.ua/api/health`, and the parser (`http://parser:8000/health`, Kuma reaches it inside the compose network). Point notifications at the alerts Telegram bot. Details: [`MONITORING.md`](MONITORING.md).

## Running behind a Cloudflare Tunnel (no open ports, e.g. a Raspberry Pi at home)

Instead of Caddy and public ports, `cloudflared` connects out to Cloudflare. Used on the Raspberry Pi (Debian, arm64, 4 GB).

1. Install Docker (`curl -fsSL https://get.docker.com | sh`), add 2 GB swap, put both repositories in `/srv/agrolab`.
2. In Cloudflare: Networking, Tunnels, Create Tunnel (Docker). Copy the token into `deploy/.env` as `TUNNEL_TOKEN`.
3. In `deploy/.env` set `COMPOSE_FILE=docker-compose.yml:docker-compose.tunnel.yml`. The override turns Caddy off (profile `caddy`) and starts `cloudflared`.
4. In the tunnel's Routes add published applications: `agrolab.com.ua` and `www.agrolab.com.ua` to `http://store:3000`, `status.agrolab.com.ua` to `http://kuma:3001`. Delete old `A` records for the same names first; Cloudflare creates the `CNAME` records itself.
5. Continue from step 5 ("Start") above. HTTPS is Cloudflare's, so step 4 (DNS) is not needed.

HSTS, `nosniff` and the other security headers come from `next.config.mjs` in this mode, and `www` redirects to the bare domain there too.

## Backups

The `backup` service dumps both databases every night at 03:30 (Kyiv time), keeps 7 days on the server volume and uploads to the backup bucket in R2 for `BACKUP_KEEP_DAYS` days (30 by default). A failure sends a Telegram alert.

Run one by hand and look at the result:

```bash
docker compose exec backup /usr/local/bin/backup.sh
docker compose exec backup ls -lh /backups
```

Restore a dump into an empty database (example: the store; use `agrolosk` and role `parser` for the parser):

```bash
docker compose stop store
docker compose exec -T postgres psql -U postgres -c "drop database agrolab_store" -c "create database agrolab_store owner store"
docker compose exec -T postgres pg_restore -U postgres -d agrolab_store --no-owner --role=store < agrolab_store-YYYYMMDD-HHMM.dump
docker compose start store
```

To fetch a file from R2 first: `aws s3 cp s3://<backup-bucket>/backups/<file> . --endpoint-url https://<account-id>.r2.cloudflarestorage.com` (with the backup key in `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`).

Uploaded files (the admin's own product photos) are in the `store_uploads` volume and are not in the database dump.

## Updating to a new version

```bash
cd /srv/agrolab/agrolab-store && git pull
cd ../agrolosk-parser && git pull
cd ../agrolab-store/deploy && docker compose up -d --build
```

The store applies schema changes on start (`db/schema.sql` is idempotent).

## When something's wrong

| Symptom | Cause / fix |
|---|---|
| Site does not open, browser warns about the certificate | The `A` records do not point at the server yet, or they are proxied before Caddy got a certificate. Set them to DNS only, `docker compose logs caddy` |
| `502` from Caddy | The store is still starting or crashed: `docker compose logs store --tail 50` |
| Empty catalogue | The first sync has not run: step 6 |
| Login "works" but you are logged out straight away | You opened `http://`. In production the session cookie is HTTPS only |
| "Вхід тимчасово недоступний" | `AUTH_SECRET` is missing or shorter than 32 characters in `store.env` |
| `/admin` sends you to your profile | The account is not admin: run `create-admin` for that email, then log out and in |
| Password reset code never arrives | `RESEND_API_KEY` / `MAIL_FROM`; the domain must show "Verified" in Resend; `docker compose logs store` shows `Password reset email failed` |
| Card payment never marked as paid | Monobank must reach `https://<domain>/api/webhooks/monobank`, and `SITE_URL` must be that domain |
| No Telegram alerts | Check the tokens and chat ids in `store.env`, and send the bot one message first |
| Photos missing | `R2_PUBLIC_URL` and the `img` DNS record; open one photo URL directly |
| Sync fails with `Supplier API` / `fetch failed` | The parser is down: `docker compose ps`, `docker compose logs parser --tail 50` |
| Changed `store.env` but nothing happened | `docker compose up -d store` (env is read at start). Changing `.env` values that are baked in at build (`NEXT_PUBLIC_*`) needs `--build` |

Logs: `docker compose logs -f store`. Restart one service: `docker compose restart store`.
