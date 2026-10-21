# Orders

How an order moves through the store, with real payloads. Everything below was captured from `npm run local`, so you can reproduce it: place an order on http://localhost:3000, then look at it in `/admin` (login `admin@agrolab.local` / `admin12345`).

## Flow

```
cart (browser)
  └─ POST /api/checkout ............ app/api/checkout/route.js
       ├─ re-prices every line from the DB (cart prices are never trusted)
       ├─ insert into orders ....... status 'Нове'
       ├─ Telegram alert ........... lib/telegram.js notifyNewOrder (never throws)
       └─ card payment? ............ Monobank invoice → customer is redirected to pay
                                      Monobank → POST /api/webhooks/monobank → payment_status
admin
  └─ /admin → «Замовлення» ......... components/admin/OrdersTab.js → GET/PUT /api/orders
customer
  └─ /profile ...................... GET /api/customer-orders (own orders, by user id or email)
```

Placing the order with the supplier is manual today: the Telegram alert and the admin list carry each item's supplier link.

## 1. Checkout request

`POST /api/checkout`. This is what the cart sends:

```json
{
  "customer": {
    "firstName": "Іван", "lastName": "Петренко", "patronymic": "Миколайович",
    "phone": "+380671234567", "email": "ivan@example.com",
    "city": "м. Полтава, Полтавська обл.",
    "branch": "Відділення №12 (до 30 кг на одне місце): вул. Сінна, 2/49",
    "doNotCall": false, "comment": "Потрібна ТТН до обіду"
  },
  "items": [
    { "id": 2, "title": "Насос шестерний НШ-32М-3 лівого обертання", "price": 3450, "quantity": 1 },
    { "id": 8, "title": "Ремінь клиновий вентилятора", "price": 260, "quantity": 2, "size": "1250 мм" }
  ],
  "total": 3970,
  "paymentMethod": "cod"
}
```

- `items[].id` is `products.id`. Only `id`, `quantity`, `size` and `color` are used. `price` and `title` are ignored; the server reads them from the DB.
- `total` is what the customer saw. If it differs from the DB total, the order is refused with `409` (see below) and the cart updates itself.
- `paymentMethod`: `"cod"` (pay on delivery) or `"monobank"` (card; refused when `MONOBANK_API_TOKEN` isn't set, and the cart hides the option).
- `city` and `branch` are the names the Nova Poshta picker returned (`/api/novaposhta`), stored as text.

### Responses

| Status | Body | When |
|---|---|---|
| 200 | `{"success":true,"orderId":5}` | Pay on delivery |
| 200 | `{"success":true,"orderId":6,"redirectUrl":"https://pay.monobank.ua/..."}` | Card: send the customer to `redirectUrl` |
| 409 | `{"error":"Ціни на деякі товари змінилися...","prices":{"2":3450,"8":260},"total":3970}` | The cart is stale. `prices` is product id → current price |
| 409 | `{"error":"Недоступно для замовлення: ...","prices":{...}}` | A product is hidden or out of stock, or a size/colour is missing |
| 400 | `{"error":"Мінімальна сума замовлення — 200 ₴"}` | Below the minimum order (admin → Налаштування, default `site.minOrderUah` = 200 in `lib/site.js`) |
| 400 | `{"error":"Вкажіть ім'я та телефон"}` | Missing name or phone |

## 2. The stored order

Table `orders` (`db/schema.sql`). Here's the order above as `GET /api/orders` returns it. The admin API adds `supplierUrl` to each line; it isn't stored in the row.

```json
{
  "id": 5,
  "created_at": "2026-10-11T17:36:15.392Z",
  "user_id": null,
  "customer_first_name": "Іван",
  "customer_last_name": "Петренко",
  "customer_patronymic": "Миколайович",
  "customer_email": "ivan@example.com",
  "customer_phone": "+380671234567",
  "delivery_method": "Нова Пошта",
  "delivery_city": "м. Полтава, Полтавська обл.",
  "delivery_branch": "Відділення №12 (до 30 кг на одне місце): вул. Сінна, 2/49",
  "do_not_call": false,
  "comment": "Потрібна ТТН до обіду",
  "total_amount": 3970,
  "status": "Нове",
  "payment_method": "Оплата при отриманні",
  "payment_status": "Оплата при отриманні",
  "payment_invoice_id": null,
  "payment_metadata": null,
  "items": [
    { "id": 2, "title": "Насос шестерний НШ-32М-3 лівого обертання", "article": "НШ-32М-3",
      "quantity": 1, "price": 3450, "supplierUrl": "https://agrolosk.com.ua/ua/p9000000002-demo.html" },
    { "id": 8, "title": "Ремінь клиновий вентилятора", "article": "11×10-1250",
      "quantity": 2, "price": 260, "size": "1250 мм", "supplierUrl": null }
  ]
}
```

- `items` is a snapshot at order time (title, part number, price). Later product edits don't change old orders.
- `user_id` is set when the customer was logged in. Guests are linked to their account later by email.
- `supplierUrl: null` means a product added by hand in the admin rather than from the supplier feed.
- Orders don't change stock: products follow the supplier's availability.

### Statuses (Ukrainian, stored as-is)

- `status` (set by the admin): `Нове` → `В обробці` → `Відправлено` → `Виконано`, or `Скасовано`.
- `tracking_number`: the Nova Poshta ТТН (14 digits), entered by the admin in the order details. Moving an order to `Відправлено` is refused (`400`, `needsTracking`) until it is set.
- Emails: moving to `Відправлено` emails the customer the ТТН with a tracking link, `Виконано` sends a thank-you (only when the order has an email, and only when the status actually changes). The admin sees whether the mail went out. The customer cabinet shows the ТТН as a tracking link.
- Card payments are a **hold**: the amount is blocked on the card (up to 9 days, then Monobank releases it by itself), not charged. `payment_status` is `Кошти заблоковано` until the admin presses «Підтвердити і списати» (after confirming the item with the supplier). `Відправлено` is refused while the money is only held.
- «Скасувати замовлення» (reason required) releases a hold (`Блокування знято`) or refunds a captured payment (`Повернено`), sets `Скасовано`, and emails the customer the reason. `Скасовано` can't be picked in the status list on purpose. «Часткове повернення» refunds part of a captured payment (`refunded_amount`); capturing less than the total is the same for a hold.
- `payment_status`: `Оплата при отриманні` (pay on delivery) · `Очікує оплати` → `Кошти заблоковано` → `Сплачено` / `Помилка оплати` / `Повернено` / `Сума оплати не збігається` (card).

## 3. Admin API

Behind the admin session cookie (`store_session`, checked in `proxy.js`). For a script, log in first with `POST /api/auth {"email","password"}` and reuse the cookie.

```
GET /api/orders?page=1&status=Нове   → { items: [order...], total, page, pages }   (50 per page, newest first)
PUT /api/orders {"id":5,"status":"Відправлено"}  → { id, status }
```

## 4. Telegram alert

Sent to `TELEGRAM_CHAT_ID` for every new order. This is the exact text for the order above:

```
🛒 Нове замовлення #5 · Agrolab

👤 Петренко Іван
📞 +380671234567
📍 м. Полтава, Полтавська обл., Відділення №12 (до 30 кг на одне місце): вул. Сінна, 2/49

💰 3970 грн · Оплата при отриманні
💬 Потрібна ТТН до обіду

📦 Товари (2):
• Насос шестерний НШ-32М-3 лівого обертання ×1 — 3450 грн
   Код: НШ-32М-3
   https://agrolosk.com.ua/ua/p9000000002-demo.html
• Ремінь клиновий вентилятора (1250 мм) ×2 — 260 грн
   Код: 11×10-1250
```

## 5. Card payment (Monobank acquiring)

The store creates the invoice after inserting the order:

```
POST https://api.monobank.ua/api/merchant/invoice/create      X-Token: MONOBANK_API_TOKEN
{ "amount": 397000, "ccy": 980, "reference": "6",
  "merchantPaymInfo": { "reference": "6", "destination": "Оплата замовлення #6 · Agrolab" },
  "redirectUrl": "https://<SITE_URL>/cart?status=success",
  "webHookUrl":  "https://<SITE_URL>/api/webhooks/monobank",
  "validity": 3600 }
→ { "invoiceId": "...", "pageUrl": "https://pay.monobank.ua/..." }   (invoiceId saved in orders.payment_invoice_id)
```

Monobank then POSTs `{ "invoiceId": "...", "status": "success", ... }` to the webhook. The handler **only uses `invoiceId` from that body**: it fetches `GET /api/merchant/invoice/status?invoiceId=...` itself, finds the order by `payment_invoice_id`, checks the paid amount against `total_amount`, and writes `payment_status` plus `payment_metadata` (Monobank's `paymentInfo`: masked card, `tranId`, ...).

`amount` is in kopecks. Payments and refunds are also visible in the Monobank business cabinet, independent of the store's DB.

## Not built yet (where it would go)

- **Ordering from the supplier automatically.** Hook in right after `notifyNewOrder(order)` in `app/api/checkout/route.js`, or poll `select * from orders where status = 'Нове'`. Like Telegram, it must not throw or slow down checkout: catch, log, and let the admin finish by hand.
- **Machine access to orders** (for your service). Today it's the admin cookie only. If you need it, add a route under `/api/supplier/` that checks its own Bearer secret like `app/api/supplier/items/route.js` does (`hasBearerSecret`). `proxy.js` doesn't guard `/api/supplier/*`, so the route must check. Use a separate secret: orders contain customer data.
- **Nova Poshta waybills (ТТН).** `NOVA_POSHTA_API_KEY` is only used server-side for the city/branch lookup. Creating waybills (`InternetDocument.save`) isn't implemented.
- **Customer notifications** (email/SMS on status change). There is no email service.
