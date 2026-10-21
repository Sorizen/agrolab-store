import { sitemapFile } from '@/lib/sitemaps';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    const { name } = await params;
    const xml = name.endsWith('.xml') ? await sitemapFile(name.slice(0, -4)) : null;
    if (!xml) return new Response('Not found', { status: 404 });
    return new Response(xml, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600' },
    });
}
