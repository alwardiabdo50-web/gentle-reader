

## Plan: Model Usage Analytics

### What we're building
Add a "Model Usage (30d)" section to the Admin Overview page showing which AI models are most used, broken down by plan tier. Data comes from the `extraction_jobs` table which already has a `model` column, joined with `profiles` for plan info.

### 1. Edge Function (`admin-stats/index.ts`)

In the `overview` action handler, add two new queries:

- **Model usage**: Query `extraction_jobs` (last 30 days), group by `model`, count usage and sum `credits_used`. Join with `profiles` to get the user's plan. Return an array like:
  ```json
  [
    { "model": "google/gemini-2.5-flash", "tier": "cheaper", "total_jobs": 42, "credits": 84, "by_plan": { "free": 5, "hobby": 20, "standard": 17 } }
  ]
  ```
- Since Supabase JS client can't do GROUP BY, fetch raw rows (model, credits_used, user_id) and aggregate in JS. Join user_id → profiles.plan in-memory using the already-fetched `creditsData`.

- Also join with `ai_models` table to get the tier for each model.

### 2. Admin Overview Page (`AdminOverviewPage.tsx`)

Add a new card section "Model Usage (30d)" below Plan Distribution:

- Table with columns: Model, Tier (color badge), Jobs, Credits Used, breakdown by plan (small badges)
- Sorted by job count descending
- Tier badges: green=free, blue=cheaper, orange=expensive

### Files Changed
- `supabase/functions/admin-stats/index.ts` — add model usage aggregation to `overview` action
- `src/pages/admin/AdminOverviewPage.tsx` — add Model Usage table/card

No database changes needed — all data already exists in `extraction_jobs.model` and `profiles.plan`.

