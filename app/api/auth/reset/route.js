import { NextResponse } from 'next/server';
import { normalizeEmail } from '@/lib/users';
import { confirmPasswordReset } from '@/lib/password-reset';
import { tooManyAttempts } from '@/lib/auth';

export async function POST(request) {
    try {
        const { email, code, password } = await request.json();
        const cleanEmail = normalizeEmail(email);
        if (!/^\d{6}$/.test(String(code || '').trim())) {
            return NextResponse.json({ error: 'Код має містити 6 цифр' }, { status: 400 });
        }
        if (!password || String(password).length < 8) {
            return NextResponse.json({ error: 'Пароль має містити щонайменше 8 символів' }, { status: 400 });
        }
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
        if (tooManyAttempts(`reset:${ip}:${cleanEmail}`, 10, 60 * 60 * 1000)) {
            return NextResponse.json({ error: 'Забагато спроб. Спробуйте пізніше.' }, { status: 429 });
        }
        if (!(await confirmPasswordReset(cleanEmail, code, String(password)))) {
            return NextResponse.json({ error: 'Невірний або прострочений код' }, { status: 400 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Не вдалося змінити пароль' }, { status: 500 });
    }
}
