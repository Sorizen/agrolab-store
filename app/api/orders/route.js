import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { notifyOrderStatus, TRACKING_PATTERN } from '@/lib/order-mail';
import { refreshSalesInBackground } from '@/lib/sales';

const PER_PAGE = 50;
const ORDER_STATUSES = ['Нове', 'В обробці', 'Відправлено', 'Виконано', 'Скасовано'];

export async function GET(request) {
    try {
        const sp = request.nextUrl.searchParams;
        const page = Math.max(1, parseInt(sp.get('page'), 10) || 1);
        const status = ORDER_STATUSES.includes(sp.get('status')) ? sp.get('status') : null;
        const where = status ? 'where status = $1' : '';
        const params = status ? [status] : [];

        const [{ rows }, { rows: countRows }] = await Promise.all([
            query(
                `select * from orders ${where} order by created_at desc
                 limit ${PER_PAGE} offset ${(page - 1) * PER_PAGE}`,
                params
            ),
            query(`select count(*) as n from orders ${where}`, params),
        ]);

        const ids = [...new Set(rows.flatMap((o) => (o.items || []).map((i) => Number(i.id)).filter(Boolean)))];
        const supplier = new Map();
        if (ids.length) {
            const { rows: links } = await query(
                'select id, supplier_url from products where id = any($1::bigint[]) and supplier_url is not null',
                [ids]
            );
            links.forEach((l) => supplier.set(l.id, l.supplier_url));
        }
        const items = rows.map((o) => ({
            ...o,
            items: (o.items || []).map((i) => ({ ...i, supplierUrl: supplier.get(Number(i.id)) || null })),
        }));

        const total = countRows[0]?.n || 0;
        return NextResponse.json({ items, total, page, pages: Math.max(1, Math.ceil(total / PER_PAGE)) });
    } catch (error) {
        console.error('Fetch orders error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const { id, status, trackingNumber } = await request.json();
        if (status !== undefined && !ORDER_STATUSES.includes(status)) {
            return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
        }
        const { rows: [current] } = await query('select * from orders where id = $1', [id]);
        if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        let tracking = current.tracking_number;
        if (trackingNumber !== undefined) {
            tracking = String(trackingNumber || '').replace(/\s+/g, '');
            if (tracking && !TRACKING_PATTERN.test(tracking)) {
                return NextResponse.json({ error: 'ТТН Нової Пошти складається з 14 цифр' }, { status: 400 });
            }
            tracking = tracking || null;
        }
        const nextStatus = status ?? current.status;
        if (nextStatus === 'Скасовано' && current.status !== 'Скасовано') {
            return NextResponse.json({ error: 'Скасовуйте кнопкою «Скасувати замовлення»: вона знімає блокування коштів і повідомляє покупця' }, { status: 400 });
        }
        if (nextStatus === 'Відправлено' && current.payment_status === 'Кошти заблоковано') {
            return NextResponse.json({ error: 'Спочатку підтвердіть замовлення і спишіть заблоковані кошти' }, { status: 400 });
        }
        if (nextStatus === 'Відправлено' && !tracking) {
            return NextResponse.json({ error: 'Спочатку вкажіть ТТН, потім ставте «Відправлено»', needsTracking: true }, { status: 400 });
        }

        const { rows: [order] } = await query(
            'update orders set status = $1, tracking_number = $2 where id = $3 returning *',
            [nextStatus, tracking, id]
        );

        let email = 'skipped';
        if (nextStatus !== current.status) {
            refreshSalesInBackground();
            try {
                email = await notifyOrderStatus(order);
            } catch (error) {
                console.error('Order status email failed:', error.message);
                email = 'failed';
            }
        }
        return NextResponse.json({ id: order.id, status: order.status, trackingNumber: order.tracking_number, email });
    } catch (error) {
        console.error('Update order error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
