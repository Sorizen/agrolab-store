import { NextResponse } from 'next/server';
import { tooManyAttempts } from '@/lib/auth';

async function np(calledMethod, methodProperties) {
    const res = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            apiKey: process.env.NOVA_POSHTA_API_KEY || '',
            modelName: 'Address',
            calledMethod,
            methodProperties,
        }),
        signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!data.success) throw new Error((data.errors || []).join('; ') || `HTTP ${res.status}`);
    return data.data || [];
}

export async function GET(request) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (tooManyAttempts(`np:${ip}`, 300, 10 * 60 * 1000)) {
        return NextResponse.json({ items: [], error: 'Забагато запитів' }, { status: 429 });
    }
    const sp = request.nextUrl.searchParams;
    const city = (sp.get('city') || '').trim().slice(0, 60);
    const cityRef = (sp.get('cityRef') || '').trim();
    const q = (sp.get('q') || '').trim().slice(0, 60);

    try {
        let items = [];
        if (cityRef) {
            if (!/^[0-9a-f-]{36}$/i.test(cityRef)) return NextResponse.json({ items: [] }, { status: 400 });
            const rows = await np('getWarehouses', { CityRef: cityRef, FindByString: q, Limit: '50', Page: '1' });
            items = rows.map((w) => ({ name: w.Description, number: w.Number, type: w.CategoryOfWarehouse === 'Postomat' ? 'postomat' : 'branch' }));

            if (/^\d+$/.test(q)) items.sort((a, b) => (b.number === q) - (a.number === q));
        } else if (city.length >= 2) {
            const rows = await np('searchSettlements', { CityName: city, Limit: '20', Page: '1' });
            items = (rows[0]?.Addresses || [])
                .filter((a) => Number(a.Warehouses) > 0)
                .map((a) => ({ name: a.Present, ref: a.DeliveryCity }));
        }
        return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    } catch (error) {
        console.error('Nova Poshta lookup failed:', error.message);
        return NextResponse.json({ items: [], error: 'Нова Пошта не відповідає. Спробуйте ще раз.' }, { status: 502 });
    }
}
