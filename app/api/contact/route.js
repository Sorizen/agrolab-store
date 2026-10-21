import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, tooManyAttempts } from '@/lib/auth';
import { notifyNewSupportRequest } from '@/lib/telegram';

export async function POST(request) {
    try {
        const { firstName, lastName, phone, email, message } = await request.json();
        if (!message || !String(message).trim()) {
            return NextResponse.json({ error: 'Напишіть повідомлення' }, { status: 400 });
        }
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
        if (tooManyAttempts(`contact:${ip}`, 10, 60 * 60 * 1000)) {
            return NextResponse.json({ error: 'Забагато повідомлень. Спробуйте пізніше.' }, { status: 429 });
        }
        const session = await getSessionUser();
        const { rows } = await query(
            `insert into support_requests (user_id, customer_first_name, customer_last_name, customer_email, customer_phone, message)
             values ($1, $2, $3, $4, $5, $6) returning *`,
            [
                session?.id || null,
                String(firstName || '').slice(0, 100),
                String(lastName || '').slice(0, 100),
                String(email || '').slice(0, 200),
                String(phone || '').slice(0, 50),
                String(message).slice(0, 5000),
            ]
        );
        await notifyNewSupportRequest(rows[0]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Support route error:', error);
        return NextResponse.json({ error: 'Не вдалося надіслати повідомлення' }, { status: 500 });
    }
}
