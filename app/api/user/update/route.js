import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { updateUserProfile, toPublicUser } from '@/lib/users';

export async function PUT(request) {
    try {
        const session = await getSessionUser();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { firstName, lastName, patronymic, phone, city, branch, deliveryMethod } = await request.json();
        const user = await updateUserProfile(session.id, {
            first_name: firstName,
            last_name: lastName,
            patronymic,
            phone,
            city,
            branch,
            delivery_method: deliveryMethod,
        });
        return NextResponse.json({ success: true, user: toPublicUser(user) });
    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
