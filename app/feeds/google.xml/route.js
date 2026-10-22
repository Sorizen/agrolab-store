import { googleFeedStream } from '@/lib/google-feed';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(googleFeedStream(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600',
    },
  });
}
