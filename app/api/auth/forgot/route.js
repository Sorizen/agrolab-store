import { NextResponse } from 'next/server';
import { normalizeEmail } from '@/lib/users';
import { requestPasswordReset } from '@/lib/password-reset';
import { mailConfigured } from '@/lib/mail';
import { tooManyAttempts } from '@/lib/auth';

export async function POST(request) {
    try {
        if (!mailConfigured()) {
            return NextResponse.json({ error: 'Відновлення пароля тимчасово недоступне' }, { status: 503 });
        }
        const { email } = await request.json();
        const cleanEmail = normalizeEmail(email);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return NextResponse.json({ error: 'Вкажіть коректний email' }, { status: 400 });
        }
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
        if (tooManyAttempts(`forgot:${ip}`, 5, 60 * 60 * 1000)) {
            return NextResponse.json({ error: 'Забагато спроб. Спробуйте пізніше.' }, { status: 429 });
        }
        try {
            await requestPasswordReset(cleanEmail);
        } catch (error) {
            console.error('Password reset email failed:', error.message);
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Не вдалося надіслати код' }, { status: 500 });
    }
}
