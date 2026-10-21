import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getUserById, toPublicUser } from '@/lib/users';

export async function GET() {
    try {
        const session = await getSessionUser();
        const user = session ? await getUserById(session.id) : null;
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: true, user: toPublicUser(user) });
    } catch (error) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
