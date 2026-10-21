# CLAUDE.md

Guidance for AI coding assistants (Claude Code etc.) working in this repo. Humans: start with `README.md`.

## Repository layout

The repository root **is** the app. Run all `npm` commands from the root. The store is **Agrolab**, a Ukrainian-language ("uk") shop for tractor and farm-machinery parts, with a catalogue fed by a supplier scraper. It must stay fast at 20k+ products.

## Commands

```bash
npm run local          # embedded Postgres (PGlite, .dev-db/) + demo data + next dev: zero-install look
npm run seed:demo      # 10 demo products, admin/customer, orders (refuses on a non-empty DB)
npm run dev            # dev server at http://localhost:3000
npm run build          # production build (works without a database)
npm run start          # serve the production build
npm run db:setup       # apply db/schema.sql (idempotent; also how schema changes ship)
npm run create-admin -- <email> [password]
npm run set-password -- <email> <password>
npm run sync:supplier [-- --refresh[=full]] [-- --full] [-- --file items.json]
npm run check:prices [-- --quiet]
```

Scripts read `.env.local` via `node --env-file-if-exists`. There is **no lint script, no test suite, and no TypeScript**. This is plain JavaScript ESM (`"type": "module"`) with the App Router. Don't suggest running tests or `tsc`. Verify changes with `npm run build`, `npm run dev` and by using the page.

## Stack

Next.js 16 (App Router), React 19, PostgreSQL via `pg`, plain CSS. Login, sessions and uploads are built in: no Supabase or other backend service. Import alias `@/*` maps to the repo root. Icons come from `lucide-react`. Fonts load through `next/font` and their CSS variables sit on `<html>`.

## Architecture

- **Database:** `db/schema.sql` is the single source of truth. Every change must be re-runnable (`if not exists`, `alter table ... add column if not exists`). `lib/db.js` exports `query()` and `transaction()`. Postgres `numeric` and `int8` come back as JS numbers.
- **`lib/data.js`** is the only place products and categories are read and written. Rules:
  - **Never load all products.** Lists are filtered, sorted and paged in SQL (`getCatalog`, `listProductsAdmin`). Card queries use `CARD_COLUMNS` (no description, first image only).
  - `fromDB`/`toDB` map snake_case <-> camelCase. **A new product field goes into the schema AND both functions.** `fromDB(row)` omits supplier fields unless `{ admin: true }`, because public objects are serialised into page HTML.
  - JSONB columns must be `JSON.stringify`-ed before being passed to `pg` (arrays would otherwise become Postgres arrays).
  - There are no size/colour variants, old prices or "hit" flags. The store sells AGROLOSK parts at the supplier's price plus a markup.
- **Search:** `products.search_text` is lowercased in JS by `lib/search.js` (`buildSearchText`), indexed with `pg_trgm`, and rebuilt on every admin save and sync. Part numbers match with or without punctuation (`normalizeCode`).
- **Categories:** a tree (`categories.parent_id`), built from the supplier's `category_path`. `getCategoryTree()` returns `{ roots, byId }` with counts that include descendants. Only pass `roots` to client components.
- **Availability:** `products.availability` is `in_stock | on_order | out_of_stock` (`lib/availability.js`, shared with the client). `active=false` hides a product. Supplier products are hidden, never deleted.
- **Catalogue URL state:** `lib/catalog-params.js` (`parseCatalogParams`, `catalogHref`) is shared by `app/catalogue/page.js` and `components/CatalogueClient.js`. Filters are URL params; the client only navigates.
- **Auth:** `lib/password.js` (scrypt), `lib/users.js`, `lib/session.js` (jose JWT cookie `store_session`, needs `AUTH_SECRET`, edge-safe), `lib/auth.js`. The role sits in the token, so a role change needs a re-login.
- **`proxy.js` is the Next 16 middleware** and the **only** gate for `/admin`, `/api/products`, `/api/upload`, `/api/orders`, `/api/admin/*` and writes to `/api/settings`. Route handlers behind it don't re-check, so **any new admin route must be added to the `matcher`.** `/api/supplier/*` checks its own Bearer secret (`hasBearerSecret`).
- **Supplier sync:** the scraper is `agrolosk-price-service`, a **separate repo run as a service** (never edit it from here). `lib/supplier-api.js` is the only module that knows its HTTP shape (`GET /products?page&per_page<=100&updated_since`, `POST /sync`, `POST /images/sync`). `lib/supplier-sync.js` normalises items and upserts by `supplier_id`, skipping unchanged rows. Push (`/api/supplier/items`) and file import also exist; all paths go through `importItems`. See `docs/SUPPLIER-SYNC.md`.
- **Admin:** products come only from the supplier. The product form is read-only except price (only with "Ручне керування"), visibility and "На головній"; `PUT /api/products` accepts just `price`, `active`, `featured`, `syncLocked`. There is no add-product flow.
- **Prices:** a supplier product's `price` = `supplier_price` + the markup percent (`site_settings` key `markup_percent`, default 5, edited in the admin Налаштування), rounded UP to a whole hryvnia (`lib/pricing.js`: `retailPrice()` in JS and `retailSql()` in SQL must stay identical). `supplier_price` is the raw feed value and must never reach public pages or APIs (`fromDB` hides it unless `{ admin: true }`). `sync_locked` products ("Ручне керування") keep their own `price`, title, photos, description, category and visibility. Saving a new percent reprices every unlocked supplier product. The invariant "price = retail(supplier_price)" is checked by `lib/price-check.js` after every pull and alerts Telegram.
- **Publish rules:** `lib/publish-rules.js` decides if a supplier product is visible (title, price above `PUBLISH_MIN_PRICE`, at least one photo unless `PUBLISH_REQUIRE_IMAGE=false`). The same rule exists twice: in JS (`normalizeSupplierItem`) and in SQL (`PUBLISHABLE_SQL` for price-only updates). Change both together.
- **Sales counters:** `products.sales_units` / `sales_90d` are recomputed from `orders.items` by `lib/sales.js` (`refreshSalesStats`, called after checkout, payment webhook, status change, capture and cancel). Cancelled orders and unpaid card orders don't count. The catalogue's default order switches to popularity (`sales_90d`) only once there are `POPULARITY_MIN_ORDERS` (default 30) counted orders. Admin → Статистика shows the top.
- **Checkout** (`app/api/checkout`) re-prices the cart from the DB and returns `409 { prices }` when the cart is stale (the cart then calls `updatePrices`). The minimum order comes from `lib/order-rules.js` (`getMinOrder()`: the `min_order_uah` setting, default `site.minOrderUah`); the cart reads it through `useMinOrder()`.
- **Card payments are holds** (`paymentType: 'hold'` in `app/api/checkout`). `lib/order-payment.js` captures (`invoice/finalize`), cancels (`invoice/cancel` releases a hold or refunds) and partially refunds, always asking Monobank for the live invoice status first (`lib/monobank.js`). Order cancellation must go through `POST /api/orders/cancel`, never a plain status change (`PUT /api/orders` refuses `Скасовано`).
- **Monobank webhook** doesn't trust its body: it re-fetches the invoice status by `invoiceId` and matches it to `orders.payment_invoice_id` and the amount.
- **Password reset:** `lib/password-reset.js` emails a 6-digit code through Resend (`lib/mail.js`, `RESEND_API_KEY` + `MAIL_FROM`). Codes live 15 minutes, are stored as an HMAC, allow 5 wrong guesses, and the request endpoint answers the same for unknown emails. Sessions are stateless JWTs, so a reset does not log out devices that are already signed in.
- **Telegram:** two independent channels in `lib/telegram.js`: `orders` (`TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`: new orders and contact messages, for the person who handles customers) and `alerts` (`TELEGRAM_ALERTS_BOT_TOKEN` / `TELEGRAM_ALERTS_CHAT_ID`: the price check and other technical alerts). They never fall back to each other. It must never throw.
- **Nova Poshta:** the cart's city/branch picker calls `GET /api/novaposhta`, which only does two read-only `Address` lookups. **Never send `NOVA_POSHTA_API_KEY` to the browser.**
- **Uploads:** `lib/storage.js` writes to `UPLOAD_DIR` (default `./uploads`, gitignored) and `app/uploads/[name]/route.js` serves the files. File types are checked by magic bytes; SVG is rejected.
- **Analytics:** `components/Analytics.js` loads GA4 only when `NEXT_PUBLIC_GA_ID` is set (baked in at build time) and never on `/admin`. Shop events live in `lib/analytics.js` (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`). `GET /api/health` is for uptime monitors. See `docs/MONITORING.md`.
- **SEO:** products live at `/product/<id>-<slug>` and categories at `/catalogue/<id>-<slug>` (`lib/slug.js`; always build links with `productPath()` / `categoryUrl()` / `catalogHref()`, never by hand). A wrong slug 308-redirects to the canonical. Filter, sort and search URLs are `noindex`; canonical, titles and JSON-LD come from `lib/seo.js` and `app/catalogue/view.js`. Sitemaps are an index plus split files (`lib/sitemaps.js`). See `docs/SEO.md`.
- **Images and speed:** show photos with `components/Photo.js` (next/image through the optimizer, plain `<img>` for hosts that are not allowed; `lib/images.js`, `NEXT_PUBLIC_IMAGE_HOSTS`), always with a `sizes` hint; use `priority` only for the first photos on screen. Home and product pages are ISR (`revalidate = 300`); the admin's product save/markup change revalidates them. See `docs/PERFORMANCE.md`.
- **`lib/site.js`** holds the shop name, contacts, legal entity, domain and minimum order. Never hardcode these in pages.
- DB-reading pages use `export const dynamic = 'force-dynamic'`. Product pages rethrow DB errors (a 500, not a 404).
- **Prom (marketplace)** is planned: the feed and order intake will be built **from this store's database**, with its own price rule. The parser never talks to Prom.

## Conventions

- **Changelog discipline:** every user-facing release gets a `CHANGELOG.md` entry (newest first) and a matching `version` bump in `package.json`.
- **Styling:** global `app/globals.css` with CSS custom properties (Agrolab brand tokens at the top), plus inline `style={{}}`. No Tailwind, no CSS Modules.
- **UI language is Ukrainian**, including order statuses stored in the DB (`'Нове'`, `'Сплачено'`). Match it.
