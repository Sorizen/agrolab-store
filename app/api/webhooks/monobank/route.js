import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { refreshSalesInBackground } from '@/lib/sales';
import { PAYMENT_STATUS_BY_INVOICE } from '@/lib/monobank';

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);
        const invoiceId = body?.invoiceId;
        if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 });

        const token = process.env.MONOBANK_API_TOKEN;
        if (!token) return NextResponse.json({ error: 'Monobank not configured' }, { status: 500 });

        const res = await fetch(
            `https://api.monobank.ua/api/merchant/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`,
            { headers: { 'X-Token': token }, signal: AbortSignal.timeout(10000) }
        );
        if (!res.ok) return NextResponse.json({ error: 'Invoice lookup failed' }, { status: 502 });
        const invoice = await res.json();

        const newStatus = PAYMENT_STATUS_BY_INVOICE[invoice.status];
        if (!newStatus) return NextResponse.json({ received: true });

        const { rows } = await query(
            'select id, total_amount, refunded_amount, payment_status from orders where payment_invoice_id = $1',
            [invoice.invoiceId || invoiceId]
        );
        const order = rows[0];
        if (!order) return NextResponse.json({ received: true, ignored: 'unknown invoice' });

        if (order.payment_status === 'Блокування знято' && invoice.status === 'reversed') {
            return NextResponse.json({ received: true });
        }

        let paymentStatus = newStatus;
        if ((invoice.status === 'success' || invoice.status === 'hold') && Number(invoice.finalAmount ?? invoice.amount) !== Math.round((order.total_amount - order.refunded_amount) * 100)) {
            paymentStatus = 'Сума оплати не збігається';
            console.error(`Monobank amount mismatch for order #${order.id}: paid ${invoice.amount}, expected ${(order.total_amount - order.refunded_amount) * 100}`);
        }

        await query(
            'update orders set payment_status = $1, payment_metadata = $2 where id = $3',
            [paymentStatus, JSON.stringify(invoice.paymentInfo || {}), order.id]
        );
        refreshSalesInBackground();
        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Monobank Webhook Error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
