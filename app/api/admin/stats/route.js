import { NextResponse } from 'next/server';
import { salesOverview } from '@/lib/sales';

export async function GET() {
    try {
        return NextResponse.json(await salesOverview(20));
    } catch (error) {
        console.error('Stats error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
