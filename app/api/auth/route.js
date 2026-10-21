import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/users';
import { startSession, endSession, tooManyAttempts } from '@/lib/auth';
import { authConfigured } from '@/lib/session';

export async function POST(request) {
    try {
        if (!authConfigured()) {
            return NextResponse.json({ error: 'Вхід тимчасово недоступний (AUTH_SECRET не налаштовано)' }, { status: 503 });
        }
        const { email, password } = await request.json();
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
        if (tooManyAttempts(`login:${ip}:${String(email).toLowerCase()}`)) {
            return NextResponse.json({ error: 'Забагато спроб. Спробуйте за 10 хвилин.' }, { status: 429 });
        }

        const user = email && password ? await authenticate(email, password) : null;
        if (!user) {
            return NextResponse.json({ error: 'Невірний логін або пароль' }, { status: 401 });
        }

        await startSession(user);
        return NextResponse.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Помилка входу' }, { status: 500 });
    }
}

export async function DELETE() {
    await endSession();
    return NextResponse.json({ success: true });
}
