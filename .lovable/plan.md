

## Fix: "Failed to create scrape job" for Scheduled Runs

### Root Cause

The `scrape` edge function inserts a row into `scrape_jobs` with `api_key_id: ctx.apiKeyId`. When the schedule-runner triggers a scrape, the `authenticateServiceRole` function returns `apiKeyId: "scheduled"` — a plain string, not a valid UUID. Since `scrape_jobs.api_key_id` is a `uuid` column, Postgres rejects the insert with: `invalid input syntax for type uuid: "scheduled"`.

This affects **two insert locations** in `supabase/functions/scrape/index.ts`:
- **Line 198**: cache-hit job record insert
- **Line 257**: normal job record insert

### Fix

In `supabase/functions/scrape/index.ts`, change both inserts to use `null` for `api_key_id` when the value is not a valid UUID (i.e., when it's a scheduled job):

```typescript
api_key_id: ctx.apiKeyId === "scheduled" ? null : ctx.apiKeyId,
```

Two lines changed (198 and 257), single file edit.

### Scope

- **File**: `supabase/functions/scrape/index.ts` (2 line changes)
- No database migration needed — `api_key_id` is already nullable
- Same fix may be needed in `crawl/index.ts` and `extract/index.ts` if they have the same pattern (will check and fix in the same pass)

