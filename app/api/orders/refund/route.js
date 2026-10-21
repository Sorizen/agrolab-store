import { NextResponse } from 'next/server';
import { refundOrder } from '@/lib/order-payment';

export async function POST(request) {
    try {
        const { id, amount, reason } = await request.json();
        return NextResponse.json(await refundOrder(id, amount, reason));
    } catch (error) {
        console.error('Refund error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
