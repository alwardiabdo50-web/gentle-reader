

## Plan: Admin API Credits Management

Store per-endpoint credit costs in the database instead of hardcoding them, and add an admin UI to manage them.

### Current State

Credit costs are hardcoded in multiple places:
- `supabase/functions/scrape/index.ts` — 1 credit per scrape
- `supabase/functions/crawl-worker/index.ts` — 1 credit per crawl page
- `supabase/functions/map/index.ts` — 1 credit per map
- `supabase/functions/extract/index.ts` — `EXTRACTION_CREDIT_COST = 2`
- `supabase/functions/pipeline/index.ts` — `SCRAPE_CREDIT_COST = 1`, `EXTRACT_CREDIT_COST = 2`, `TRANSFORM_CREDIT_COST = 2`
- `src/pages/public/PricingPage.tsx` — hardcoded `creditRows` array (lines 14-21)

### Database

Create an `api_credit_costs` table:
- `id` (text, PK) — endpoint slug: "scrape", "crawl", "map", "extract", "screenshot", "js_rendering"
- `label` (text) — display name, e.g. "Scrape", "Crawl (per page)"
- `base_cost` (integer) — default credit cost (applies to all plans)
- `plan_overrides` (jsonb) — per-plan overrides, e.g. `{"free": 0, "hobby": 0}` for endpoints unavailable on certain plans (0 = unavailable, shown as "—")
- `is_addon` (boolean, default false) — if true, displayed as "+N credit" style (e.g. JS Rendering)
- `sort_order` (integer)
- `is_active` (boolean, default true)

RLS: public SELECT, admin-only write via edge function.

Seed with current values:
| id | label | base_cost | plan_overrides | is_addon |
|---|---|---|---|---|
| scrape | Scrape | 1 | {} | false |
| crawl | Crawl (per page) | 2 | {} | false |
| map | Map | 1 | {} | false |
| extract | AI Extract | 5 | {"free":0,"hobby":0} | false |
| screenshot | Screenshot | 2 | {"free":0,"hobby":0} | false |
| js_rendering | JS Rendering | 1 | {} | true |

### Backend

Add to `admin-stats` edge function:
- `credit-costs` (GET) — list all credit cost rows
- `credit-cost-update` (POST) — update a row's cost/overrides
- `credit-cost-create` (POST) — add a new endpoint row
- `credit-cost-delete` (POST) — soft-delete (set `is_active = false`)

Create a shared helper `supabase/functions/_shared/credit-costs.ts`:
- `getCreditCost(admin, endpointId, planId?)` — fetches cost from DB, applies plan overrides, falls back to hardcoded defaults if DB unavailable
- Used by scrape, crawl-worker, map, extract, pipeline functions

### Frontend

**New page: `src/pages/admin/AdminCreditCostsPage.tsx`**
- Table showing all endpoints with columns: Endpoint, Base Cost, Plan Overrides (badges), Add-on, Active
- Edit dialog to change base cost, per-plan overrides (input per plan), is_addon toggle
- "Add Endpoint" button

**Admin nav**: Add "API Credits" link to `AdminLayout.tsx`

**Route**: Add `/admin/credit-costs` in `App.tsx`

**Hooks**: Add `useAdminCreditCosts`, `useAdminCreditCostMutations` to `useAdminData.ts`

**PricingPage.tsx**: Replace hardcoded `creditRows` with a `useApiCreditCosts()` hook that fetches from the `api_credit_costs` table, dynamically building the table columns from active plans.

### Edge Function Updates

Update these files to use the shared `getCreditCost()` helper instead of hardcoded constants:
- `supabase/functions/scrape/index.ts`
- `supabase/functions/crawl-worker/index.ts`
- `supabase/functions/map/index.ts`
- `supabase/functions/extract/index.ts`
- `supabase/functions/pipeline/index.ts`

### Files Changed
- **New migration**: Create `api_credit_costs` table + seed
- `supabase/functions/_shared/credit-costs.ts` (new) — shared DB lookup helper
- `supabase/functions/admin-stats/index.ts` — CRUD actions
- `supabase/functions/scrape/index.ts` — use dynamic cost
- `supabase/functions/crawl-worker/index.ts` — use dynamic cost
- `supabase/functions/map/index.ts` — use dynamic cost
- `supabase/functions/extract/index.ts` — use dynamic cost
- `supabase/functions/pipeline/index.ts` — use dynamic cost
- `src/pages/admin/AdminCreditCostsPage.tsx` (new)
- `src/hooks/useAdminData.ts` — credit cost hooks
- `src/hooks/useApiCreditCosts.ts` (new) — public read hook
- `src/components/AdminLayout.tsx` — nav link
- `src/App.tsx` — route
- `src/pages/public/PricingPage.tsx` — dynamic credit rows

