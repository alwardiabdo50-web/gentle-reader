

## Fix: Scheduled Jobs Not Counting in Credits, Job History & Usage

### Root Cause Analysis

The `api_key_id` UUID fix was applied in edge functions but there are **two remaining issues** causing scheduled jobs to not properly integrate:

1. **Job ID not captured**: In `schedules-manage/index.ts` line 183, the response parser looks for `result.data?.id || result.id`, but the scrape/extract/crawl functions return the job ID at `result.meta?.job_id`. So `schedule_runs.job_id` is always `null`, breaking the link between schedule runs and actual jobs.

2. **Org context lost for scheduled jobs**: `authenticateServiceRole()` in `api-key-auth.ts` always returns `orgId: null`. If the user has an active org, scheduled jobs bypass org credits entirely, using the user's personal (likely empty free-tier) credits instead — and quota checks fail silently.

3. **Billing error crashes the response**: In the scrape function, `recordLedgerEntry` throws on failure (line 187 in billing.ts), and there's no try/catch around the billing call (line 341-350 in scrape). A billing failure causes the whole request to return 500, even though the scrape itself completed successfully.

### Changes

**1. `supabase/functions/schedules-manage/index.ts`** — Fix job ID extraction
```typescript
// Line 183: Change from
jobId = result.data?.id || result.id || null;
// To
jobId = result.meta?.job_id || result.data?.id || result.id || null;
```

**2. `supabase/functions/_shared/api-key-auth.ts`** — Preserve org context for scheduled jobs
- Look up the user's `active_org_id` from profiles when authenticating a scheduled job
- Return the correct `orgId` so credits are deducted from the right account

**3. `supabase/functions/scrape/index.ts`** — Wrap billing in try/catch
- Don't fail the whole response if billing recording fails after a successful scrape
- Log the error but still return the successful scrape result
- Apply same pattern to `extract`, `crawl`, `pipeline`, `map`, `batch-scrape`

### Files Changed
- `supabase/functions/schedules-manage/index.ts` (1 line)
- `supabase/functions/_shared/api-key-auth.ts` (~10 lines)
- `supabase/functions/scrape/index.ts` (wrap billing in try/catch)
- `supabase/functions/extract/index.ts` (same)
- `supabase/functions/crawl/index.ts` (same)
- `supabase/functions/pipeline/index.ts` (same)
- `supabase/functions/map/index.ts` (same)
- `supabase/functions/batch-scrape/index.ts` (same)

