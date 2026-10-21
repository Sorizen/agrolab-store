# Supplier sync

How the scraper's items get into the store. Code: `lib/supplier-sync.js` (import), `lib/supplier-api.js` (the parser's HTTP API), `lib/publish-rules.js`, `lib/price-check.js`.

## Two ways in. Use one.

### A. Pull from agrolosk-price-service (recommended, built and tested)

The scraper is [`agrolosk-price-service`](https://github.com/Sorizen/agrolosk-price-service), a separate repo that runs as its own service. The store only talks to its HTTP API. Set on the store server:

```
SUPPLIER_API_URL=http://127.0.0.1:8001/products   # the service's product list
SUPPLIER_REFRESH_URL=http://127.0.0.1:8001/sync   # optional: lets the store start a price check
SUPPLIER_API_TOKEN=                               # optional, sent as "Authorization: Bearer ..."
```

What the store calls:

```
POST {SUPPLIER_REFRESH_URL} {"mode":"prices"}      only with --refresh: the service re-checks agrolosk.com.ua (~1 min)
GET  {SUPPLIER_REFRESH_URL}/{id}                  every 5 s until "done" or "failed" (gives up waiting after 30 min)
GET  {SUPPLIER_API_URL}?page=1&per_page=100[&updated_since=ISO]   then page 2, 3, ... until pages_count
```

The response is `{ "items": [...], "total": 6455, "pages_count": 65 }`, sorted by id. `updated_since` returns only products whose data really changed, including ones that became `removed`, so an incremental pull is the change feed. `fetchSupplierPage()` in `lib/supplier-sync.js` is the only function that knows this shape (it also sends `limit`/`offset` for services that page that way).

Runs:
- `npm run sync:supplier`: changes since the last successful pull (5-minute overlap).
- `npm run sync:supplier -- --refresh`: start a price check in the service, wait for it, then pull the changes. **This is the cron job.**
- `npm run sync:supplier -- --refresh=full --full`: full re-scrape (descriptions, categories for new products, ~12 min), then the parser uploads new photos to R2 (`POST /images/sync`), then pull everything and hide products the service no longer lists.
- The admin panel (Налаштування → Синхронізація) has pull buttons (no refresh).
- Over HTTP: `POST /api/supplier/sync?mode=updates|full` with `Authorization: Bearer $SUPPLIER_SYNC_SECRET` (returns `202`, runs in the background).

Cron on the store server (the service has no scheduler of its own; this is its "external cron"):

```cron
# prices every hour, then pull what changed and check the prices
0 * * * *  cd /srv/agrolab && npm run sync:supplier -- --refresh >> /srv/agrolab-sync.log 2>&1
# Sunday night: full re-scrape (new products get photos/descriptions), then a full pull
30 2 * * 0    cd /srv/agrolab && npm run sync:supplier -- --refresh=full --full >> /srv/agrolab-sync.log 2>&1
```

`--refresh=full` runs the service's `POST /images/sync` after the re-scrape and before the pull. If photos are uploaded separately, until it runs the API serves the agrolosk photo URL, which the store shows as-is.

#### Price rule and the price check

The store's price for a supplier product is the supplier's price plus the markup percent (admin → Налаштування, default 5%), rounded up to a whole hryvnia. After every pull `lib/price-check.js` reads the parser's whole product list (about 65 requests, 2 s) and compares it with every visible supplier product. One Telegram message is sent when:

- **drift:** a product without "Ручне керування" has a different price from the parser;
- **stale:** the store's copy of the supplier price is behind the parser;
- **manual:** a product with "Ручне керування" had its supplier data change in this run and its own price now differs from the supplier's. This is the signal to decide whether to follow the new supplier price.

Run it by hand: `npm run check:prices` (`-- --quiet` prints without Telegram). Exit code 2 means drift or stale. A drift is healed by the next `--full` pull.

#### Publish rules

A supplier product is visible only if it has a title, its price is above `PUBLISH_MIN_PRICE` (default 1: the supplier uses 1 ₴ as a placeholder) and it has at least one photo (`PUBLISH_REQUIRE_IMAGE=false` turns this off). Hidden products come back on their own once the supplier fixes the data. Products with "Ручне керування" keep the admin's choice. Rules live in `lib/publish-rules.js`; the SQL fast path for price-only updates repeats them (`PUBLISHABLE_SQL` in `lib/supplier-sync.js`).

#### Why there's no RabbitMQ between the two

The plan was "cron updates prices → event in RabbitMQ → product service updates itself". With one producer and one consumer running twice a day, `GET /products?updated_since=` already is that event stream:
- **No broker to run.** It's one less service to install, monitor and back up.
- **Self-healing.** If the store is down or a run fails, the next pull asks "since my last successful run" and catches up. Nothing gets lost in a queue.
- **Idempotent.** Re-pulling the same changes is harmless; unchanged rows aren't even rewritten.

If a queue is ever needed (several consumers, near-real-time), the store side stays the same: on any event, run `npm run sync:supplier`.

#### Tested against the real service (2026-10-12)

The service ran locally from the programmer's dump (6,455 products, 16,300 photos in R2). The store ran on a real Postgres 17.
- Full pull: 6,455 products, 238 categories, **2 s**. Unchanged re-pull: 0 items.
- A changed price and a `removed` product: the next incremental pull received exactly those 2 and applied them (price updated, product hidden).
- `--refresh` against the live agrolosk.com.ua: the service checked 6,466 listings in 66 s (16 new, 3 changed, 0 errors), and the store pulled the 21 changed items. 70 s end to end.
- Catalogue pages 0.08–0.14 s; search by part number with or without dots.

### B. Push: your service sends items to the store

```
POST https://agrolab.com.ua/api/supplier/items
Authorization: Bearer <SUPPLIER_SYNC_SECRET>
Content-Type: application/json

{ "items": [ {...}, {...} ] }          # at most 5000 per request
```

Response:

```json
{ "runId": 12, "received": 500, "inserted": 3, "updated": 41, "skipped": 0, "hidden": 0, "message": null }
```

`?full=1` means "this request is the COMPLETE catalogue": products missing from it get hidden. Only use it when you send everything in one request.

## Item format

What the scraper already returns. Unknown fields are ignored.

| Field | Used as | Notes |
|---|---|---|
| `id` | `products.supplier_id` | **Required.** The matching key; never duplicated |
| `title` | title | Missing `title` = **price-only update** (see below) |
| `part_number` | article / part number | Searchable with or without dashes and dots |
| `brand` | brand | Catalogue filter "Виробник" |
| `description` | description | Plain text, line breaks kept |
| `price` | price | The selling price is this value plus the markup percent, rounded up to a whole hryvnia. The raw value is kept in `supplier_price` and never shown to customers |
| `currency` | | Only `UAH` is imported; other currencies are skipped |
| `availability` | availability | `in_stock`, `ready_to_ship` → В наявності; `on_order`/`preorder`/`unknown` → Під замовлення; `out_of_stock` and anything unrecognised → Немає |
| `status` | visibility | Anything other than `active` (e.g. `removed`) hides the product and makes it unavailable |
| `main_image`, `images[]` | images | Shown from their URL (R2 or agrolosk), up to 15, duplicates removed |
| `price_unit` | unit | Shown after the price: "₴ 450 / комплект". Empty or `шт` = per piece |
| `price_from` | "від" | `true` shows "від ₴ 450" |
| `attributes[{name,value}]` | specs table | Repeated names are joined with ", " |
| `category_path[]` | category tree | Created automatically, up to 8 levels |
| `url` | supplier link | Admin and Telegram order alerts only. **Never shown to customers** |
| `first_seen_at` | created date | |
| `group_id`, `last_seen_at`, `updated_at`, `details_synced_at` | not used | |

### Price-only updates (fast path)

For frequent price runs, send only what changed:

```json
[{ "id": 2091755252, "price": 15020.0, "availability": "in_stock", "status": "active" }]
```

Items with no `title` update only the price, availability and visibility of products that already exist. Unknown ids are ignored.

## What the store guarantees

- **No duplicates.** Re-sending the same item updates it. An unchanged item isn't even rewritten (a full re-send of 20k items takes about 1 second).
- **Never deletes.** Dropped products are hidden, so old links and orders keep working.
- **Safety brake.** A full run that returns fewer than half of the currently visible products hides nothing and logs a warning. It's treated as a broken response.
- **Admin edits survive.** If the admin ticks "Ручне керування" on a product, sync updates only its supplier price, availability and link. Title, photos, description, price, category, retail price and visibility stay as edited. The admin's discount and "Хіт" flags survive in all cases.
- **Logged.** Every run is written to `supplier_sync_runs`, and the last 10 show in the admin Settings tab.

## Test locally without the scraper

```bash

npm run sync:supplier -- --file ./items.json          # array or { "items": [...] }
npm run sync:supplier -- --file ./items.json --full   # also hide products missing from the file
```

Tested with 20,000 generated items in this format: first import 3 s, unchanged re-import under 1 s, and catalogue pages in 60–150 ms.
