# Changelog

Newest first. Every user-facing release gets an entry here and a matching `version` bump in `package.json`.

## 1.11.0

- Pages "Доставка і оплата" (`/delivery`) and "Повернення та гарантія" (`/returns`), linked from the footer and the sitemap.
- Photos come from `img.agrolab.com.ua` (cached by Cloudflare); the host is optimizable by default.
- Resend sends from `noreply@agrolab.com.ua`.

## 1.10.0 - Speed

- Product photos are resized and served as WebP through the Next.js image optimizer; the first photos on a page are preloaded, hero photos recompressed. Home and product pages are cached (5 minutes, refreshed on admin changes); the category tree is cached for a minute; Google Analytics loads lazily.
- Lighthouse (mobile, production): home 68 → 89, category 78 → 95, product 78 → 90; page weight down by 25-75%. See `docs/PERFORMANCE.md`.

## 1.9.0 - Technical SEO

- **Readable URLs** for products and categories (`/product/123-slug`, `/catalogue/45-slug`); old id-only and `?cat=` links redirect permanently.
- Canonical tags, `noindex` for filters/sorting/search, a self-canonical for pagination, one `<h1>` per category page with subcategory links.
- Titles/descriptions from snippet-sized templates; Open Graph and Twitter cards.
- Structured data: Product (richer), BreadcrumbList, CollectionPage + ItemList, Organization, WebSite with search action.
- Sitemap index with split sitemaps (pages, categories, products with images and `lastmod`). See `docs/SEO.md`.

## 1.8.0 - Editable minimum order

- The minimum order (200 ₴ by default) is now a setting: admin → Налаштування → «Мінімальне замовлення». It is enforced in the cart, the cart drawer and `/api/checkout`; 0 turns the limit off.
- Fixed: an unset markup or minimum order was read as 0 instead of the default.

## 1.7.0 - Analytics and monitoring

- **Google Analytics 4** (`NEXT_PUBLIC_GA_ID`): page views plus shop events `view_item`, `add_to_cart`, `begin_checkout`, `purchase` (card payments report on return from Monobank). Admin pages are not tracked. See `docs/MONITORING.md`.
- `GET /api/health` for uptime monitors (200 when the database answers and the supplier sync is fresh, else 503); `deploy/monitoring` runs Uptime Kuma.
- Telegram split into two channels: orders and contact messages for the person handling customers, technical alerts (price check) for whoever runs the site.

## 1.6.0 - Sales counters

- Products got `sales_units` and `sales_90d`, recomputed from orders (cancelled and unpaid card orders don't count).
- Admin → Статистика: orders, 30-day turnover, top products.
- The catalogue sorts by popularity by default (and offers «Популярні») once the shop has 30 counted orders (`POPULARITY_MIN_ORDERS`); before that the order is unchanged.

## 1.5.0 - Markup and saved delivery

- **Markup.** Store price = AGROLOSK price + a markup percent (5 by default), rounded up to a whole hryvnia (100 becomes 105). The percent is stored in `site_settings` and edited in the admin (Налаштування → Націнка); saving reprices every supplier product that isn't on manual control. The raw supplier price is never exposed to the public site. The price check, the Telegram alert and the product form use the marked-up price.
- **Saved delivery.** The customer cabinet got a Nova Poshta city + branch default; checkout prefills it and lets the customer change it. When they pick a different branch (or have none saved) a checkbox offers to remember it for next time.

## 1.4.0 - Card holds, cancellations, refunds

- **Hold instead of charge.** Card payments block the amount (up to 9 days) and are captured only after the admin confirms the order with the supplier («Підтвердити і списати»). If the item is unavailable, cancelling releases the money: no refund, no fee. `Відправлено` is refused while the money is only held.
- **Cancel with a reason** (out of stock / price changed / other): releases the hold or refunds, and emails the customer. A plain status change to `Скасовано` is no longer possible.
- **Partial refund** of a captured payment, with an email to the customer. New columns `cancel_reason`, `refunded_amount`.
- Needs live verification with the real Monobank token (hold status, capture, cancel of a hold).

## 1.3.0 - Order tracking emails

- **ТТН.** Orders got `tracking_number`. The admin enters it in the order details; the status `Відправлено` can't be set without it (14 digits).
- **Status emails.** `Відправлено` emails the customer the ТТН and a Nova Poshta tracking link; `Виконано` sends a thank-you. Sent once per status change, only when the order has an email. The admin sees whether it went out.
- The customer cabinet shows the ТТН as a tracking link.

## 1.2.0 - Password reset

- **Forgot password.** "Забули пароль?" on the login page leads to `/profile/forgot`: the customer enters an email, gets a 6-digit code by email (Resend), then sets a new password. Codes expire after 15 minutes, allow 5 wrong guesses and are never stored in plain text; at most one code per minute and five per hour per account. The answer is the same whether or not the email has an account.
- New table `password_resets` (applied by `npm run db:setup`) and env vars `RESEND_API_KEY`, `MAIL_FROM`.

## 1.1.0 - Supplier-only admin

- **Short product form.** Shows name, code, photo, AGROLOSK price and the supplier link read-only. Editable: price (only with "Ручне керування"), visibility, "На головній". Unticking the lock puts the price back to the AGROLOSK price.
- **No manual products.** Removed "Додати товар", the full editor (descriptions, photos, specs, logistics) and `POST /api/products`. `PUT /api/products` accepts only the four fields above.
- **Removed discounts and variants.** Old price, "Хіт продажу", sizes, colours, the "Тільки знижки" filter and their cart/checkout handling are gone; `db:setup` strips the old `_sizes`, `_colors`, `_oldPrice`, `_hotDeal` keys from existing products.

## 1.0.0 - Clean start

The store was split out of the old multi-brand `PlastTech` repository: only the current Agrolab app, no old brand assets, no history of previous designs.

- **Price = the supplier's price.** Removed the markup, rounding step, `retail_price()` SQL function, the margin calculator and the `cost_usd` / `margin_percent` columns. Manually priced products ("Ручне керування") still keep their own price.
- **Price check.** After every pull the store compares every visible supplier product with the parser's current price and sends one Telegram message on drift, stale data or a moved supplier price behind a manual price. Also `npm run check:prices`.
- **Publish rules.** Supplier products without a title, with a placeholder price (`<= PUBLISH_MIN_PRICE`, default 1) or without any photo are hidden. `PUBLISH_REQUIRE_IMAGE=false` shows photoless products.
- **Photos.** `--refresh=full` now also asks the parser to upload new photos to R2 before pulling.
- Parser API access moved to `lib/supplier-api.js`.
- Cart storage key renamed to `agrolab_cart`. Unused assets (old brand logo, demo photos, template icons, Nova Poshta widget archive) removed.
