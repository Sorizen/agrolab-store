import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const session = await getSessionUser();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { rows } = await query(
            `select id, created_at, status, message from support_requests
             where user_id = $1 or lower(customer_email) = $2
             order by created_at desc limit 100`,
            [session.id, String(session.email || '').toLowerCase()]
        );
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Fetch customer support requests error:', error);
        return NextResponse.json({ error: 'Failed to fetch support requests' }, { status: 500 });
    }
}
