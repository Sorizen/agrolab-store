# Monitoring and analytics

Two small pieces, nothing heavy:

- **Uptime Kuma** watches that everything is alive and sends a Telegram message when something isn't.
- **Google Analytics 4** shows who visits the site and what they do (views, add to cart, checkout, purchase).

## Uptime Kuma (alerts)

```bash
cd deploy/monitoring
docker compose up -d          # Kuma listens on 127.0.0.1:3001
```

Put it behind Nginx on a subdomain (for example `status.your-domain`) with HTTPS and open it once to create the admin user.

**Alert channel:** Settings → Notifications → Setup Notification → Telegram. Use the **alerts bot** (the one in `TELEGRAM_ALERTS_BOT_TOKEN` / `TELEGRAM_ALERTS_CHAT_ID`), not the orders bot. Tick "Default enabled" so every monitor uses it.

Monitors to add (Add New Monitor, type HTTP(s)):

| Name | URL | Expect |
|---|---|---|
| Store | `https://your-domain/` | 200 |
| Store health | `https://your-domain/api/health` | 200 (503 = database down or supplier sync older than `HEALTH_SYNC_MAX_AGE_HOURS`, default 6) |
| Catalogue | `https://your-domain/catalogue` | 200 |
| Parser | `http://127.0.0.1:8001/health` | 200 (add a keyword check for `"ok"`) |

Interval 60 s, retries 2, so a single blip doesn't wake anyone.

## Google Analytics 4

Set `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX` in `.env.local` and rebuild (`npm run build`, it is baked in at build time). Without it nothing loads. The admin pages are never tracked.

Events sent from the browser (`lib/analytics.js`): `view_item`, `add_to_cart`, `begin_checkout`, `purchase` (value in UAH). Card payments report `purchase` when the shopper returns from Monobank with a successful payment. Page views, scrolling, outbound clicks and site search come from GA's "enhanced measurement".

Check it in GA → Reports → Realtime while you click through the site. Mark `purchase` as a key event (Admin → Events) to see it in the funnel.

Ad blockers hide part of the visitors from GA, so treat the numbers as a trend, not an exact count.
