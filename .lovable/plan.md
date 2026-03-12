

## Batch Scrape Endpoint

### Overview
New `batch-scrape` Edge Function accepting `{ urls: string[], options?: ScrapeOptions }`, processing in parallel with concurrency control, charging credits per successful scrape, and returning aggregated results.

### Changes

**1. New Edge Function — `supabase/functions/batch-scrape/index.ts`**
- Auth: reuse `extractApiKey`/`validateApiKey` from `_shared/api-key-auth.ts`
- Validate input: require `urls` array, max 100 URLs, normalize each
- Rate limit check via `checkRateLimit(userId)`
- Upfront quota check via `checkQuota(userId, urls.length)` to ensure enough credits
- Create a parent `scrape_jobs` row with `mode = "batch"`, status `running`
- Process URLs with a concurrency pool (max 5 parallel) using `performScrape()` from `_shared/scrape-pipeline.ts`
- For each URL: create a child `scrape_jobs` row, attempt scrape, update row with result/error
- After all complete: charge credits only for successful scrapes via single `recordLedgerEntry` call
- Update parent job with `credits_used`, `status` (completed/partial)
- Fire `batch.completed` or `batch.partial` webhook via `dispatchWebhooks`
- Return aggregated response

**2. Register function in `supabase/config.toml`**
```toml
[functions.batch-scrape]
verify_jwt = false
```

**3. Client helper — update `src/lib/api/scrape.ts`**
- Add `BatchScrapeResponse` interface
- Add `batchScrapeUrls(urls, apiKey, options?)` function that invokes `batch-scrape`

### Response Shape
```json
{
  "success": true,
  "data": [
    { "url": "...", "markdown": "...", ... },
    null
  ],
  "errors": [
    null,
    { "url": "...", "code": "NAVIGATION_TIMEOUT", "message": "..." }
  ],
  "meta": {
    "job_id": "uuid",
    "total": 2,
    "completed": 1,
    "failed": 1,
    "credits_used": 1
  }
}
```

### Credit Logic
- Upfront check ensures user has enough credits for the full batch
- Only successful scrapes are charged (partial billing)
- Single ledger entry with `action: "batch_scrape_charge"` and `credits: -N` where N = successful count
- Parent job's `credits_used` field reflects actual consumed credits

### No DB Migration Needed
The existing `scrape_jobs` table already has a `mode` column (can store `"batch"`) and all needed fields. Child jobs are independent rows — no `parent_job_id` FK required; we can store the parent reference in `request_json` metadata to keep it simple.

