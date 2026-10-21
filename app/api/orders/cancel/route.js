import { NextResponse } from 'next/server';
import { cancelOrder } from '@/lib/order-payment';

export async function POST(request) {
    try {
        const { id, reason } = await request.json();
        return NextResponse.json(await cancelOrder(id, reason));
    } catch (error) {
        console.error('Cancel error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
