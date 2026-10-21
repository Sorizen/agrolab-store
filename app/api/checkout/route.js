import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getProductsForCheckout } from '@/lib/data';
import { isOrderable } from '@/lib/availability';
import { getSessionUser } from '@/lib/auth';
import { notifyNewOrder } from '@/lib/telegram';
import { refreshSalesInBackground } from '@/lib/sales';
import { getMinOrder } from '@/lib/order-rules';
import { site } from '@/lib/site';

const SITE_URL = (process.env.SITE_URL || site.url).replace(/\/+$/, '');

const str = (v, max) => String(v ?? '').trim().slice(0, max);

async function priceCart(items) {
    const products = await getProductsForCheckout(items.map((i) => i.id));
    const lines = [];
    const unavailable = [];
    const prices = {};
    for (const item of items.slice(0, 100)) {
        const product = products.get(Number(item.id));
        if (!product || !isOrderable(product)) {
            unavailable.push(item.title || `#${item.id}`);
            continue;
        }
        prices[product.id] = product.price;
        lines.push({
            id: product.id,
            title: product.title,
            article: product.article,
            quantity: Math.min(999, Math.max(1, Math.trunc(Number(item.quantity) || 1))),
            price: product.price,
        });
    }
    const total = Math.round(lines.reduce((sum, l) => sum + l.price * l.quantity, 0) * 100) / 100;
    return { lines, unavailable, prices, total };
}

export async function POST(request) {
    try {
        const { customer = {}, items, total: clientTotal, paymentMethod } = await request.json();
        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Кошик порожній' }, { status: 400 });
        }
        if (!str(customer.phone, 30) || !str(customer.firstName || customer.lastName, 100)) {
            return NextResponse.json({ error: "Вкажіть ім'я та телефон" }, { status: 400 });
        }

        const { lines, unavailable, prices, total } = await priceCart(items);
        if (unavailable.length) {
            return NextResponse.json(
                { error: `Недоступно для замовлення: ${unavailable.join(', ')}. Видаліть з кошика та спробуйте ще раз.`, prices },
                { status: 409 }
            );
        }
        if (clientTotal !== undefined && Math.abs(Number(clientTotal) - total) > 0.01) {
            return NextResponse.json(
                { error: 'Ціни на деякі товари змінилися. Перевірте суму та підтвердіть замовлення ще раз.', prices, total },
                { status: 409 }
            );
        }
        const minOrder = await getMinOrder();
        if (total < minOrder) {
            return NextResponse.json({ error: `Мінімальна сума замовлення — ${minOrder} ₴` }, { status: 400 });
        }

        const isOnlinePayment = paymentMethod === 'monobank';
        if (isOnlinePayment && !process.env.MONOBANK_API_TOKEN) {
            return NextResponse.json({ error: 'Оплата карткою тимчасово недоступна. Оберіть оплату під час отримання.' }, { status: 400 });
        }
        const session = await getSessionUser();
        const { rows } = await query(
            `insert into orders (user_id, customer_first_name, customer_last_name, customer_patronymic, customer_email,
                customer_phone, delivery_method, delivery_city, delivery_branch, do_not_call, comment, total_amount,
                status, payment_method, payment_status, items)
             values ($1, $2, $3, $4, $5, $6, 'Нова Пошта', $7, $8, $9, $10, $11, 'Нове', $12, $13, $14)
             returning *`,
            [
                session?.id || null,
                str(customer.firstName, 100),
                str(customer.lastName, 100),
                str(customer.patronymic, 100),
                str(customer.email, 200) || null,
                str(customer.phone, 30),
                str(customer.city, 200),
                str(customer.branch, 300),
                Boolean(customer.doNotCall),
                str(customer.comment, 1000),
                total,
                isOnlinePayment ? 'Оплата карткою онлайн' : 'Оплата при отриманні',
                isOnlinePayment ? 'Очікує оплати' : 'Оплата при отриманні',
                JSON.stringify(lines),
            ]
        );
        const order = rows[0];
        await notifyNewOrder(order);
        refreshSalesInBackground();

        if (isOnlinePayment) {
            const monoToken = process.env.MONOBANK_API_TOKEN;
            if (!monoToken) throw new Error('Monobank API token is not configured on the server.');

            const monoRes = await fetch('https://api.monobank.ua/api/merchant/invoice/create', {
                method: 'POST',
                headers: { 'X-Token': monoToken, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Math.round(total * 100),
                    ccy: 980,
                    paymentType: 'hold',
                    reference: String(order.id),
                    merchantPaymInfo: {
                        reference: String(order.id),
                        destination: `Оплата замовлення #${order.id} · ${site.name}`,
                    },
                    redirectUrl: `${SITE_URL}/cart?status=success`,
                    ...(/^https:\/\/(?!localhost|127\.)/.test(SITE_URL) ? { webHookUrl: `${SITE_URL}/api/webhooks/monobank` } : {}),
                    validity: 3600,
                }),
                signal: AbortSignal.timeout(15000),
            });
            if (!monoRes.ok) throw new Error(`Monobank API Error: ${await monoRes.text()}`);

            const monoData = await monoRes.json();
            await query('update orders set payment_invoice_id = $1 where id = $2', [monoData.invoiceId, order.id]);
            return NextResponse.json({ success: true, orderId: order.id, redirectUrl: monoData.pageUrl });
        }

        return NextResponse.json({ success: true, orderId: order.id });
    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Не вдалося оформити замовлення. Спробуйте ще раз або зателефонуйте нам.' }, { status: 500 });
    }
}
