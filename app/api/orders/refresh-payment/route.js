import { NextResponse } from 'next/server';
import { refreshPayment } from '@/lib/order-payment';

export async function POST(request) {
    try {
        const { id } = await request.json();
        return NextResponse.json(await refreshPayment(id));
    } catch (error) {
        console.error('Refresh payment error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
