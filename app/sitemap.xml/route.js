import { sitemapIndex } from '@/lib/sitemaps';

export const dynamic = 'force-dynamic';

export async function GET() {
    return new Response(await sitemapIndex(), {
        headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600' },
    });
}
