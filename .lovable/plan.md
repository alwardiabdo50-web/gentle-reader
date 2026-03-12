

## Result Caching & Deduplication

### Approach
Add a `scrape_cache` table that stores scrape results keyed by normalized URL + options hash. Before performing a scrape, check the cache; on hit, return cached data with zero credits charged. Expose a `cache_ttl` parameter (default 3600s) and return `cache_hit: true/false` in responses.

### Changes

#### 1. DB Migration — `scrape_cache` table
```sql
CREATE TABLE public.scrape_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,  -- hash of normalized_url + relevant options
  url text NOT NULL,
  final_url text,
  title text,
  status_code integer,
  markdown text,
  html text,
  metadata_json jsonb,
  links_json jsonb,
  warnings_json jsonb DEFAULT '[]',
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX idx_scrape_cache_key ON public.scrape_cache(cache_key);
CREATE INDEX idx_scrape_cache_expires ON public.scrape_cache(expires_at);

ALTER TABLE public.scrape_cache ENABLE ROW LEVEL SECURITY;

-- Cache is accessed only via service role in edge functions
CREATE POLICY "Service role full access" ON public.scrape_cache FOR ALL TO service_role USING (true);
```

#### 2. Shared Cache Utility — `supabase/functions/_shared/scrape-cache.ts`
- `buildCacheKey(url: string, options: object): string` — SHA-256 hash of normalized URL + sorted relevant options (formats, only_main_content, render_javascript, remove_selectors)
- `getCachedResult(cacheKey: string): CachedResult | null` — query `scrape_cache` where `cache_key = key AND expires_at > now()`
- `setCachedResult(cacheKey: string, result, ttl: number)` — upsert into `scrape_cache` with `expires_at = now() + ttl`
- Uses service role client

#### 3. Update `scrape` Edge Function
- Accept new optional param `cache_ttl` (number, seconds, default 3600, 0 = skip cache)
- Before scraping: compute cache key, check cache
- On cache hit: create job with `status: "completed"`, skip credit charge, return with `cache_hit: true`
- On cache miss: scrape as normal, store result in cache, return with `cache_hit: false`
- Add `cache_hit` to response `meta`

#### 4. Update `batch-scrape` Edge Function
- Accept `cache_ttl` param
- Per-URL: check cache before scraping
- Cache hits don't count toward credits
- Only charge for actual scrapes (cache misses that succeed)
- Include per-item `cache_hit` in results and total `cache_hits` in meta

#### 5. Update Client API — `src/lib/api/scrape.ts`
- Add `cache_ttl?: number` to `ScrapeOptions` and `BatchScrapeOptions`
- Add `cache_hit?: boolean` to response types

#### 6. Update Playground UI
- Add a "Cache TTL" input (seconds) to the options panel
- Show cache hit/miss badge in results

### Response Shape Changes
```json
{
  "meta": {
    "job_id": "...",
    "credits_used": 0,
    "cache_hit": true
  }
}
```

For batch:
```json
{
  "data": [{ "url": "...", "cache_hit": true, ... }],
  "meta": { "cache_hits": 2, "credits_used": 1 }
}
```

### Files Changed

| File | Action |
|------|--------|
| DB migration | New `scrape_cache` table |
| `supabase/functions/_shared/scrape-cache.ts` | New — cache key builder, get/set helpers |
| `supabase/functions/scrape/index.ts` | Add cache lookup before scrape, cache store after |
| `supabase/functions/batch-scrape/index.ts` | Add per-URL cache lookup, adjust credit math |
| `src/lib/api/scrape.ts` | Add `cache_ttl` to options, `cache_hit` to responses |
| `src/pages/PlaygroundPage.tsx` | Add cache TTL input and cache hit badge |

