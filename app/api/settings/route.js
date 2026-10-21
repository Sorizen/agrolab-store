import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSettings, setSetting } from '@/lib/data';
import { getSessionUser, isAdmin } from '@/lib/auth';
import { parseMarkup, setMarkupPercent } from '@/lib/pricing';
import { getMinOrder, parseMinOrder, MIN_ORDER_KEY, MAX_MIN_ORDER } from '@/lib/order-rules';

const PUBLIC_KEYS = ['announcement'];
const EDITABLE_KEYS = ['announcement'];

export async function GET() {
    const all = await getSettings();

    const cardPayments = process.env.MONOBANK_API_TOKEN ? '1' : '0';
    const minOrder = String(await getMinOrder());
    if (isAdmin(await getSessionUser())) return NextResponse.json({ ...all, card_payments: cardPayments, min_order: minOrder });
    return NextResponse.json({
        ...Object.fromEntries(PUBLIC_KEYS.filter((k) => k in all).map((k) => [k, all[k]])),
        card_payments: cardPayments,
        min_order: minOrder,
    });
}

export async function POST(request) {
    try {
        const body = (await request.json()) || {};
        const entries = Object.entries(body).filter(([key]) => EDITABLE_KEYS.includes(key));

        if (body.min_order_uah !== undefined) {
            const minOrder = parseMinOrder(body.min_order_uah);
            if (minOrder === null) {
                return NextResponse.json({ error: `Вкажіть ціле число від 0 до ${MAX_MIN_ORDER}` }, { status: 400 });
            }
            await setSetting(MIN_ORDER_KEY, String(minOrder));
            return NextResponse.json({ success: true, minOrder });
        }

        if (body.markup_percent !== undefined) {
            if (parseMarkup(body.markup_percent) === null) {
                return NextResponse.json({ error: 'Націнка має бути числом від 0 до 300' }, { status: 400 });
            }
            const result = await setMarkupPercent(body.markup_percent);
            revalidatePath('/', 'layout');
            return NextResponse.json({ success: true, ...result });
        }
        for (const [key, value] of entries) await setSetting(key, value);

        if (entries.some(([key]) => key === 'announcement')) revalidatePath('/', 'layout');

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
