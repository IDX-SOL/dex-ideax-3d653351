# dex.idxsolana.io — GSC exports (2026-11-18)

Property: **dex.idxsolana.io** — SPA + static prerender (`IdxDex`). Host **301s** extensionless paths to trailing slash (`/futures` → `/futures/`).

## Summary (31 URLs in “Why pages aren’t indexed”)

| Bucket | # | Verdict |
|--------|---|---------|
| Alternative page with proper canonical tag | 14 | **Fix deployed:** canonical/sitemap used `/futures` while live URL is `/futures/`. Also `?symbol=` and `?utm_*` URLs canonicalize to bare route — **expected** noise for trading deep links. |
| Page with redirect | 10 | **Expected:** `/futures?symbol=…` → `/futures/?symbol=…` (slash redirect). No Validate fix. |
| Blocked by robots.txt | 3 | **Expected:** `/perp`, `/portfolio` (+ utm) — app/account surfaces, `noindex` in HTML too. |
| Discovered – currently not indexed | 3 | **Wait:** `leaderboard`, `points`, `rewards/affiliate` in sitemap; crawl not started (`1970-01-01`). |
| Crawled – currently not indexed | 1 | **Expected:** `/?lang=de` — hreflang param; index **`/`** only. |

## Code / deploy checklist

1. **`buildCanonicalUrl`** — trailing slash on non-root paths (matches CDN).
2. Rebuild → `generate-seo-files` refreshes `public/robots.txt`, `public/sitemap.xml`, static route HTML.
3. Deploy dex; GSC → Sitemaps → resubmit `https://dex.idxsolana.io/sitemap.xml` (optional).
4. Wait 3–7 days; **do not** mass Validate fix on redirect/alternative-canonical rows.

## Optional later (not required for health)

- `noindex` when `?symbol=` is present (if symbol URLs stay noisy in GSC).
- Few URL Inspection requests for `/leaderboard/`, `/points/`, `/rewards/affiliate/` after deploy.

Zips: `alternative-canonical-2026-11-18.zip`, `page-with-redirect-2026-11-18.zip`, `blocked-robots-2026-11-18.zip`, `discovered-not-indexed-2026-11-18.zip`, `crawled-not-indexed-2026-11-18.zip`.