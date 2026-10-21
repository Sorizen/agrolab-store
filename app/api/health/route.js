import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SYNC_MAX_AGE_HOURS = Number(process.env.HEALTH_SYNC_MAX_AGE_HOURS) || 6;

export async function GET() {
    const body = { ok: true, db: false, sync: { ageHours: null, fresh: null } };
    try {
        await query('select 1');
        body.db = true;
        const { rows } = await query(
            `select extract(epoch from (now() - max(finished_at))) / 3600 as age
             from supplier_sync_runs where status = 'ok'`
        );
        const age = rows[0]?.age;
        if (age !== null && age !== undefined) {
            body.sync.ageHours = Math.round(Number(age) * 10) / 10;
            body.sync.fresh = Number(age) <= SYNC_MAX_AGE_HOURS;
        }
    } catch (error) {
        console.error('Health check failed:', error.message);
    }
    body.ok = body.db && body.sync.fresh !== false;
    return NextResponse.json(body, { status: body.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
