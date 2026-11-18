import { readUpload } from '@/lib/storage';

export async function GET(request, { params }) {
    const { name } = await params;
    const file = await readUpload(name);
    if (!file) return new Response('Not found', { status: 404 });
    return new Response(file.body, {
        headers: {
            'Content-Type': file.type,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
