import { NextResponse } from 'next/server';
import { captureOrder } from '@/lib/order-payment';

export async function POST(request) {
    try {
        const { id, amount } = await request.json();
        return NextResponse.json(await captureOrder(id, amount));
    } catch (error) {
        console.error('Capture error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
