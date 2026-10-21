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
            `select id, created_at, status, total_amount, delivery_method, delivery_city, delivery_branch,
                    payment_method, payment_status, tracking_number, items
             from orders where user_id = $1 or lower(customer_email) = $2
             order by created_at desc limit 100`,
            [session.id, String(session.email || '').toLowerCase()]
        );
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Fetch customer orders error:', error);
        return NextResponse.json({ error: 'Failed to fetch customer orders' }, { status: 500 });
    }
}
