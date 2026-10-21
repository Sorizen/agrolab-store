# Performance (Core Web Vitals)

Measured with Lighthouse, mobile profile (simulated slow 4G, 4x CPU slowdown), production build, local server:

| Page | Score before | after | LCP before | after | Page weight before | after |
|---|---|---|---|---|---|---|
| Home | 68 | 89 | 12.3 s | 3.8 s | 2.8 MB | 1.4 MB |
| Category | 78 | 95 | 6.0 s | 2.9 s | 4.7 MB | 1.2 MB |
| Product | 78 | 90 | 6.4 s | 3.7 s | 1.4 MB | 1.1 MB |

What was done:

- **Photos go through the Next.js image optimizer** (`components/Photo.js`, `lib/images.js`): each photo is resized to the size it is shown at, served as WebP (not AVIF: it costs far more CPU on a small server) and cached for 30 days. Product photos in R2 are 1280 px originals, which used to be sent whole to a 56 px thumbnail. Photos from a host that is not allowed (a supplier URL that slipped through) fall back to a plain `<img>`.
- The first photos on every page (`priority`) are preloaded, the rest lazy-load; the home hero is preloaded and recompressed (hero/story/about shrank by about 55%).
- **Cached pages:** the home page and product pages are rendered once and rebuilt in the background every 5 minutes (ISR). Saving a product or changing the markup in the admin refreshes them immediately. A price changed by a cron sync appears within 5 minutes; checkout always re-prices from the database.
- The category tree (a counting query that ran on every page) is cached in memory for a minute.
- Google Analytics loads after the page (`lazyOnload`); the monospace font is not preloaded.

Notes for the server:

- The optimizer resizes a photo the first time it is requested, then serves it from `.next/cache/images`. Keep that folder across deploys, and expect a short CPU spike the first time a large catalogue page is opened.
- Photos are served from `img.agrolab.com.ua` (the R2 bucket behind Cloudflare, cached). The parser stores them as WebP, at most 1000 px on the long side. `img.agrolab.com.ua` is optimizable by default; other hosts go in `NEXT_PUBLIC_IMAGE_HOSTS` (comma separated) before building.
- Lab scores are not what Google ranks on: after launch check the real-user Core Web Vitals report in Search Console.
