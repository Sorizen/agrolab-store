import { NextResponse, after } from 'next/server';
import { getSessionUser, hasBearerSecret, isAdmin } from '@/lib/auth';
import { runSupplierSync, runningPull, pullConfigured } from '@/lib/supplier-sync';

export async function POST(request) {
    const allowed = hasBearerSecret(request, process.env.SUPPLIER_SYNC_SECRET) || isAdmin(await getSessionUser());
    if (!allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!pullConfigured()) {
        return NextResponse.json({ error: 'SUPPLIER_API_URL не налаштовано' }, { status: 400 });
    }
    const running = await runningPull();
    if (running) {
        return NextResponse.json({ error: `Синхронізація #${running.id} ще виконується` }, { status: 409 });
    }

    const mode = request.nextUrl.searchParams.get('mode') === 'full' ? 'full' : 'updates';
    after(async () => {
        try {
            const result = await runSupplierSync({ mode });
            console.log(`Supplier sync #${result.runId} (${result.mode}) done:`, result);
        } catch (error) {
            console.error('Supplier sync failed:', error.message);
        }
    });
    return NextResponse.json({ started: true, mode }, { status: 202 });
}
