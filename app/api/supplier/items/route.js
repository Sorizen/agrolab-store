import { NextResponse } from 'next/server';
import { hasBearerSecret } from '@/lib/auth';
import { importAndLog } from '@/lib/supplier-sync';

export async function POST(request) {
    if (!hasBearerSecret(request, process.env.SUPPLIER_SYNC_SECRET)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        const items = Array.isArray(body) ? body : body?.items;
        if (!Array.isArray(items)) {
            return NextResponse.json({ error: 'Expected an array of items or { items: [...] }' }, { status: 400 });
        }
        const full = request.nextUrl.searchParams.get('full') === '1';
        if (!full && items.length > 5000) {
            return NextResponse.json({ error: 'Send at most 5000 items per request' }, { status: 413 });
        }
        const result = await importAndLog(items, { mode: 'push', full });
        return NextResponse.json(result);
    } catch (error) {
        console.error('Supplier push failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
