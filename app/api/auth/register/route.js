import { NextResponse } from 'next/server';
import { createUser, findUserByEmail, normalizeEmail } from '@/lib/users';
import { startSession, tooManyAttempts } from '@/lib/auth';
import { authConfigured } from '@/lib/session';

const DISPOSABLE_DOMAINS = [
    'mailinator.com', 'guerrillamail.com', 'yopmail.com', '10minutemail.com',
    'temp-mail.org', 'tempmail.com', 'throwawaymail.com', 'trashmail.com',
    'temp-mail.io', 'minuteinbox.com', '10minemail.com', 'maildrop.cc'
];

export async function POST(request) {
    try {
        if (!authConfigured()) {
            return NextResponse.json({ error: 'Реєстрація тимчасово недоступна (AUTH_SECRET не налаштовано)' }, { status: 503 });
        }
        const { email, password, firstName, lastName, phone, city, branch, deliveryMethod } = await request.json();
        const cleanEmail = normalizeEmail(email);

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return NextResponse.json({ error: 'Вкажіть коректний email' }, { status: 400 });
        }
        if (!password || String(password).length < 8) {
            return NextResponse.json({ error: 'Пароль має містити щонайменше 8 символів' }, { status: 400 });
        }
        if (DISPOSABLE_DOMAINS.includes(cleanEmail.split('@')[1])) {
            return NextResponse.json({ error: 'Реєстрація з тимчасових поштових скриньок заборонена' }, { status: 400 });
        }
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
        if (tooManyAttempts(`register:${ip}`, 5, 60 * 60 * 1000)) {
            return NextResponse.json({ error: 'Забагато спроб. Спробуйте пізніше.' }, { status: 429 });
        }
        if (await findUserByEmail(cleanEmail)) {
            return NextResponse.json({ error: 'Акаунт з таким email уже існує. Увійдіть.' }, { status: 409 });
        }

        const user = await createUser({
            email: cleanEmail,
            password,
            first_name: firstName,
            last_name: lastName,
            phone,
            city,
            branch,
            delivery_method: deliveryMethod,
        });
        await startSession(user);
        return NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Не вдалося завершити реєстрацію' }, { status: 500 });
    }
}
