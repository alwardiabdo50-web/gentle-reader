

## Plan: Admin Plan Management Page

Move plan definitions from hardcoded config into a database table so admins can manage plans (features, limits, pricing, credits) from `/admin/plans`.

### Database

Create a `plans` table:
- `id` (text, PK) — e.g. "free", "hobby", "standard", "growth", "scale"
- `name` (text) — Display name
- `monthly_price` (integer) — cents
- `yearly_price` (integer) — cents
- `monthly_credits` (integer)
- `max_api_keys` (integer) — -1 for unlimited
- `rate_limit_rpm` (integer)
- `features_json` (jsonb) — `{ webhooks: true, schedules: false, ... }`
- `description` (text)
- `display_features` (jsonb) — array of feature strings shown on pricing page
- `cta_text` (text)
- `highlighted` (boolean)
- `sort_order` (integer)
- `is_active` (boolean, default true)
- `created_at`, `updated_at`

RLS: public SELECT for all (pricing page needs it), admin-only write via edge function.

Seed with current hardcoded values via migration.

### Backend

Add actions to `admin-stats` edge function:
- `plans` (GET) — list all plans ordered by sort_order
- `plan-update` (POST) — update a plan's fields (features, limits, pricing, credits, display)
- `plan-create` (POST) — create a new plan
- `plan-delete` (POST) — soft-delete (set is_active = false)

### Frontend

**1. New page: `src/pages/admin/AdminPlansPage.tsx`**
- Table listing all plans with columns: Name, Price, Credits, API Keys, Features (badges), Active status
- Click a plan to open an edit dialog/sheet with fields for all plan properties
- Feature toggles (webhooks, schedules, pipelines, extract, organizations) as switches
- "Add Plan" button for creating new plans

**2. Admin nav**: Add "Plans" link to `AdminLayout.tsx` nav

**3. Route**: Add `/admin/plans` route in `App.tsx`

**4. Dynamic plan loading**: 
- Create `src/hooks/usePlans.ts` to fetch plans from the `plans` table (public read)
- Update `src/lib/plan-limits.ts` to export a function that works with DB-fetched plan data
- Update `PricingPage.tsx` to load plans from DB instead of hardcoded array
- Update `UpgradeGate` and edge functions to read from DB plans table instead of hardcoded config

### Files Changed
- **New migration**: Create `plans` table + seed data
- `supabase/functions/admin-stats/index.ts` — Add plan CRUD actions
- `src/pages/admin/AdminPlansPage.tsx` (new)
- `src/hooks/usePlans.ts` (new)
- `src/hooks/useAdminData.ts` — Add plan query/mutation hooks
- `src/components/AdminLayout.tsx` — Add Plans nav item
- `src/App.tsx` — Add route
- `src/pages/public/PricingPage.tsx` — Load from DB
- `src/components/UpgradeGate.tsx` — Use DB plans
- `supabase/functions/_shared/plan-limits.ts` — Read from DB

