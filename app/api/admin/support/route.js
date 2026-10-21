import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const PER_PAGE = 50;
const STATUSES = ['Нове', 'В обробці', 'Вирішено', 'Закрито'];

export async function GET(request) {
    try {
        const sp = request.nextUrl.searchParams;
        const page = Math.max(1, parseInt(sp.get('page'), 10) || 1);
        const status = STATUSES.includes(sp.get('status')) ? sp.get('status') : null;
        const where = status ? 'where status = $1' : '';
        const params = status ? [status] : [];
        const [{ rows }, { rows: countRows }] = await Promise.all([
            query(`select * from support_requests ${where} order by created_at desc limit ${PER_PAGE} offset ${(page - 1) * PER_PAGE}`, params),
            query(`select count(*) as n from support_requests ${where}`, params),
        ]);
        const total = countRows[0]?.n || 0;
        return NextResponse.json({ items: rows, total, page, pages: Math.max(1, Math.ceil(total / PER_PAGE)) });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const { id, status } = await request.json();
        if (!STATUSES.includes(status)) return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
        const { rows } = await query('update support_requests set status = $1 where id = $2 returning id, status', [status, id]);
        if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(rows[0]);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
