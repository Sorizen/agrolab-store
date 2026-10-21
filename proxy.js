import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

export async function proxy(request) {
    const { pathname } = request.nextUrl;

    const isProtectedPage = pathname.startsWith('/admin');
    const isProtectedApi =
        pathname.startsWith('/api/products') ||
        pathname.startsWith('/api/upload') ||
        pathname.startsWith('/api/orders') ||
        pathname.startsWith('/api/admin') ||
        (pathname.startsWith('/api/settings') && request.method !== 'GET');

    if (!isProtectedPage && !isProtectedApi) return NextResponse.next();

    const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!user) {
        return isProtectedPage
            ? NextResponse.redirect(new URL('/profile/login', request.url))
            : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
        return isProtectedPage
            ? NextResponse.redirect(new URL('/profile', request.url))
            : NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/api/products/:path*',
        '/api/upload/:path*',
        '/api/orders/:path*',
        '/api/settings/:path*',
        '/api/admin/:path*',
    ],
};
