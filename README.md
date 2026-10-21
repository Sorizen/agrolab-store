# Agrolab store

A Ukrainian online store for tractor and farm-machinery parts. The catalogue is not typed in by hand: it is fed by [`agrolosk-price-service`](https://github.com/Sorizen/agrolosk-price-service), a separate service that scrapes the supplier (agrolosk.com.ua).

- Catalogue built for **20,000+ products**: server-side search by name or part number, category tree, manufacturer filter, paging
- **Price = the supplier's price + a markup** (5% by default, changed in the admin, rounded up to a whole hryvnia). A price check after every sync alerts Telegram if the store ever disagrees with the supplier
- Cart and checkout with **Monobank** card payments or cash on delivery, **Nova Poshta** branch picker
- Customer accounts, contact form, admin panel for products, orders and sync
- **Telegram** alerts for new orders (with the supplier link for each item) and for price mismatches

**Stack:** Next.js 16 (App Router), React 19, PostgreSQL 14+ (`pg`), plain CSS. Plain JavaScript: no TypeScript, no tests, no linter. Login, sessions and photo uploads are built in; no external backend service.

## How the data flows

```
agrolosk.com.ua  ──►  agrolosk-price-service  ──►  this store (Postgres)  ──►  customers
 (supplier prices)     (scrapes, keeps its own      (pull: GET /products          (site, search, cart)
                        DB, photos in Cloudflare R2)  ?updated_since=...)
```

- The parser is the single source of truth for supplier data. The store never edits it.
- The store pulls changes on a cron (`npm run sync:supplier -- --refresh`), applies the publish rules and checks prices.
- Prom (marketplace) will be fed **from this store**, never the other way round.

Details: [`docs/SUPPLIER-SYNC.md`](docs/SUPPLIER-SYNC.md).

## Price rules

1. A supplier product's `price` is the supplier's price plus the admin's markup percent, rounded up to a whole hryvnia (100 ₴ at 5% becomes 105 ₴).
2. A product with **"Ручне керування"** (`sync_locked`) keeps its own price, title, photos, description, category and visibility. Use it when you need to raise or lower a price. Its supplier price is still tracked.
3. After every pull `npm run check:prices` logic runs automatically: it compares every visible supplier product with the parser's current price and sends one Telegram message if
   - a non-locked product differs from the supplier (drift),
   - the store's copy of the supplier price is behind the parser (stale),
   - a manually priced product's supplier price just changed (so you can decide whether to follow it).

## Publish rules

Supplier products that fail a rule are hidden (never deleted), and come back when the supplier fixes the data:

| Rule | Default | Setting |
|---|---|---|
| Has a title | always | |
| Price above the minimum (1 ₴ is a placeholder at the supplier) | `> 1` | `PUBLISH_MIN_PRICE` |
| Has at least one photo | on | `PUBLISH_REQUIRE_IMAGE=false` to turn off |
| Supplier status is `active` | always | |

Products with "Ручне керування" keep the visibility the admin chose.

## Quick start

Need Node.js 20.9+ (22 recommended), git and PostgreSQL 14+.

**Look around with nothing installed:** `npm install && npm run local`, then open http://localhost:3000. It starts an embedded Postgres with 10 demo products, an admin (`admin@agrolab.local` / `admin12345`) and sample orders. Data lives in `.dev-db/`; delete it to start over.

**Real setup:**

```bash
npm install
cp .env.local.example .env.local      # set DATABASE_URL, AUTH_SECRET, SUPPLIER_API_URL
npm run db:setup                       # creates the tables (safe to re-run)
npm run create-admin -- you@example.com 'a-long-password'
npm run sync:supplier -- --full        # first import from the parser
npm run dev                            # http://localhost:3000, admin at /admin
```

## Commands

```bash
npm run dev | build | start            # Next.js
npm run db:setup                       # apply db/schema.sql (idempotent; also how schema changes ship)
npm run create-admin -- <email> [password]
npm run set-password -- <email> <password>
npm run sync:supplier                  # changes since the last run
npm run sync:supplier -- --refresh     # ask the parser to re-check prices first (the hourly cron)
npm run sync:supplier -- --refresh=full --full   # weekly: re-scrape, upload new photos, pull everything
npm run check:prices [-- --quiet]      # compare store prices with the parser now
npm run local | seed:demo              # demo mode
```

## Repo map

```
app/            pages (server components) + app/api/* route handlers
components/     interactive UI (client components)
contexts/       CartContext (cart state, localStorage "agrolab_cart")
db/schema.sql   the whole database; safe to re-run
lib/
  data.js         all product/category queries (search, filters, paging)
  supplier-sync.js   parser items -> products (normalise, publish rules, upsert)
  supplier-api.js    the one module that knows the parser's HTTP API
  publish-rules.js   which supplier products are visible
  price-check.js     store vs parser price comparison
  site.js            shop name, contacts, legal entity, domain, minimum order
  db.js, auth.js, session.js, users.js, password.js, storage.js, telegram.js
proxy.js        middleware: the admin security gate
scripts/        db:setup, create-admin, set-password, sync:supplier, check:prices, local
docs/           SUPPLIER-SYNC.md, ORDERS.md, DEPLOY.md
```

## The rules that matter

1. **Never load "all products".** Every list query in `lib/data.js` is filtered, sorted and paged in Postgres.
2. **`lib/data.js` owns the products/categories tables.** `fromDB()` / `toDB()` convert `snake_case` <-> `camelCase`. A new product field goes into `db/schema.sql` **and** both functions. `fromDB()` hides supplier fields unless `{ admin: true }`, because public objects end up in page HTML.
3. **Search reads `search_text`**, built by `lib/search.js` and rebuilt on every save and sync. A new searchable field goes into `buildSearchText()`.
4. **No variants or discounts.** Every product is a supplier product at the supplier's price; the admin edits only price (with "Ручне керування"), visibility and "На головній".
5. **Availability** is one column: `in_stock` / `on_order` / `out_of_stock`. `active = false` hides a product.
6. **`proxy.js` is the only admin gate.** A new admin route must be added to its `matcher`. `/api/supplier/*` checks its own Bearer secret.
7. **Shop details live in `lib/site.js`.** Never hardcode name, phone, email or domain in pages.
8. **The UI is Ukrainian**, including order statuses stored in the DB (`'Нове'`, `'Сплачено'`).

## Deploying

Step by step: [`docs/DEPLOY.md`](docs/DEPLOY.md) (Postgres, systemd, Nginx + HTTPS, cron, backups). Order flow with real payloads: [`docs/ORDERS.md`](docs/ORDERS.md).

### Go-live checklist

- [ ] Real phone number and Telegram link in `lib/site.js`
- [ ] Domain confirmed and `SITE_URL` set
- [ ] `SUPPLIER_API_URL` / `SUPPLIER_REFRESH_URL` point at the parser; first `--full` sync done
- [ ] Telegram bot sends a test order alert (price alerts use the same bot)
- [ ] Nova Poshta key set (the city/branch picker needs it)
- [ ] Monobank token (optional: without it card payment is hidden and cash on delivery works)
- [ ] Hourly sync cron and weekly full cron running; nightly backup running
- [ ] Public offer (`/terms`) reviewed by the owner

## Known issues

- No password reset or email confirmation (no mail service). For a forgotten password run `npm run set-password -- customer@email 'new-password'` on the server.
- Supplier photos are served from the parser's Cloudflare R2 bucket. If `R2_PUBLIC_URL` of the parser changes, the stored photo links in this database change too: run a `--full` pull after rewriting the parser's links.
- Supplier stock is only "available / not available", there are no quantities. Orders to the supplier are placed manually from the Telegram alert.
