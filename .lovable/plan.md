

## Problem Analysis

The extraction feature is completing successfully but **credits are not being deducted**. Here's what's happening:

**Evidence from Database:**
- `extraction_jobs` table shows completed jobs with `credits_used: 2`
- `scrape_jobs` table has corresponding records with `mode: 'extract'`
- **`usage_ledger` table has ZERO entries with `source_type: 'extract'`**
- User's `profiles.credits_used` is not incrementing for extractions

**Root Cause:**

In `supabase/functions/extract/index.ts` (line 325-334), the billing function is called but its failure is **silently ignored**:

```typescript
await recordLedgerEntry({
  user_id: ctx.userId,
  api_key_id: ctx.apiKeyId,
  action: "extract_charge",
  credits: -EXTRACTION_CREDIT_COST,
  job_id: scrapeResult.scrapeJobId || null,
  source_type: "extract",
  balance_after: newBalance,
  metadata_json: { ... },
});
// No error checking! Returns null on failure but we don't check.
```

The `recordLedgerEntry` function in `supabase/functions/_shared/billing.ts` returns `null` on error instead of throwing, and the extract function doesn't verify success.

**Additional Issues:**
1. `scrapeForExtraction` returns empty string `""` instead of `null` when insert fails (line 70)
2. No logging to help diagnose billing failures
3. Edge function can return success even when billing completely fails

## Solution

### 1. Fix `recordLedgerEntry` in `_shared/billing.ts`
- Throw an error instead of returning null when ledger insert fails
- Add detailed logging for billing operations
- This ensures billing failures propagate and can't be ignored

### 2. Fix `scrapeForExtraction` in `extract/index.ts`
- Return `null` instead of empty string when scrape_jobs insert fails
- Add error logging for scrape failures
- Type the return value to use `string | null` instead of always string

### 3. Add Error Handling in Extract Handler
- Wrap `recordLedgerEntry` in try-catch
- If billing fails, mark the extraction_jobs record as failed
- Return error response to user instead of success
- Ensure extraction only succeeds if BOTH extraction AND billing succeed

### 4. Add Diagnostic Logging
- Log before calling `recordLedgerEntry` with all parameter values
- Log success/failure of billing operation
- This helps debug similar issues in the future

## Files to Modify

1. **`supabase/functions/_shared/billing.ts`**
   - Make `recordLedgerEntry` throw on failure
   - Add detailed error logging

2. **`supabase/functions/extract/index.ts`**
   - Fix `scrapeForExtraction` return type
   - Add try-catch around billing
   - Handle billing failures properly
   - Add diagnostic logging

## Technical Details

The fix ensures atomic consistency: if extraction succeeds but billing fails, we mark the job as failed and return an error. This prevents "free" extractions where the AI work completes but credits aren't charged.

We'll also add detailed logging so future billing issues can be quickly diagnosed from edge function logs.

