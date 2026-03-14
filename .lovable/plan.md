

## Plan: Providers & Models Management

### Overview
Add a database-driven AI model registry with provider grouping, cost tiers (free/cheaper/expensive), and plan-based access control. Managed from a new `/admin/models` page. Replaces the hardcoded `ALLOWED_MODELS` arrays throughout edge functions and the hardcoded model `<Select>` dropdowns in the Playground UI.

### 1. Database

**Table: `ai_providers`**
```sql
CREATE TABLE public.ai_providers (
  id text PRIMARY KEY,              -- e.g. 'openrouter'
  name text NOT NULL,               -- 'OpenRouter'
  base_url text NOT NULL,           -- 'https://openrouter.ai/api/v1/chat/completions'
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Table: `ai_models`**
```sql
CREATE TABLE public.ai_models (
  id text PRIMARY KEY,              -- e.g. 'google/gemini-2.5-flash'
  provider_id text NOT NULL REFERENCES ai_providers(id),
  name text NOT NULL,               -- 'Gemini 2.5 Flash'
  tier text NOT NULL DEFAULT 'free', -- 'free' | 'cheaper' | 'expensive'
  credit_cost integer NOT NULL DEFAULT 0, -- 0 for free, 2 for cheaper, 5 for expensive
  min_plan text NOT NULL DEFAULT 'free', -- minimum plan required to use this model
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

RLS: Public SELECT for active models (needed by Playground UI). No public INSERT/UPDATE/DELETE. Admin manages via edge function.

Seed data — OpenRouter as default provider, with models:
- **Free tier** (0 credits): `google/gemini-2.5-flash-lite`, `openai/gpt-5-nano`
- **Cheaper tier** (2 credits): `google/gemini-3-flash-preview`, `google/gemini-2.5-flash`, `openai/gpt-5-mini`
- **Expensive tier** (5 credits): `google/gemini-2.5-pro`, `google/gemini-3.1-pro-preview`, `openai/gpt-5`, `openai/gpt-5.2`

Plan access: Free plan → free models only. Hobby → free + cheaper. Standard+ → all tiers.

### 2. Admin Page: `/admin/models`

New page `src/pages/admin/AdminModelsPage.tsx`:
- **Providers section**: List/create/edit providers (name, base URL, default toggle, active toggle)
- **Models section**: Table of all models grouped by provider, showing tier, credit cost, min plan, active status
- CRUD dialogs for both providers and models
- Tier shown as color-coded badges (green=free, blue=cheaper, orange=expensive)

### 3. Admin Sidebar + Route

- Add "Models" nav item in `AdminLayout.tsx` (use `Brain` or `Cpu` icon)
- Add `/admin/models` route in `App.tsx`

### 4. Hook: `useModels`

New `src/hooks/useModels.ts`:
- Fetches active models from `ai_models` table (joined with provider)
- Filters by user's plan tier access
- Returns grouped by tier for the Playground UI

### 5. Admin Data Hooks

Add to `useAdminData.ts`:
- `useAdminProviders()` / `useAdminModels()` — GET queries
- `useAdminProviderMutations()` / `useAdminModelMutations()` — CRUD mutations

### 6. Edge Function Updates

Add to `admin-stats/index.ts`:
- GET `action=providers` and `action=models`
- POST actions: `provider-create`, `provider-update`, `provider-delete`, `model-create`, `model-update`, `model-delete`

### 7. Playground Integration

Update `PlaygroundPage.tsx`:
- Replace hardcoded model `<Select>` with dynamic list from `useModels`
- Group models by tier in the dropdown (Free / Cheaper / Expensive headers)
- Show lock icon + upgrade prompt for models above user's plan tier
- Show credit cost badge next to each model name

### 8. Edge Function Model Validation

Update `extract/index.ts` and `pipeline/index.ts`:
- Replace hardcoded `ALLOWED_MODELS` with DB lookup from `ai_models`
- Check user's plan against `min_plan` before allowing model usage
- Add model's `credit_cost` to the total extraction credit cost
- Fall back to hardcoded list if DB lookup fails

### 9. Plan Limits Update

Update `src/lib/plan-limits.ts` and `supabase/functions/_shared/plan-limits.ts`:
- Add `model_tier_access` concept: maps plan → allowed tiers (`free`, `cheaper`, `expensive`)

### Files Changed
- DB migration (2 tables + RLS + seed data)
- `src/pages/admin/AdminModelsPage.tsx` (new)
- `src/hooks/useModels.ts` (new)
- `src/hooks/useAdminData.ts` (add provider/model queries + mutations)
- `src/components/AdminLayout.tsx` (add nav item)
- `src/App.tsx` (add route)
- `src/pages/PlaygroundPage.tsx` (dynamic model selector)
- `supabase/functions/admin-stats/index.ts` (CRUD handlers + GET queries)
- `supabase/functions/extract/index.ts` (DB-driven model validation)
- `supabase/functions/pipeline/index.ts` (DB-driven model validation)
- `src/lib/plan-limits.ts` (add tier access mapping)
- `supabase/functions/_shared/plan-limits.ts` (add tier access mapping)

### Additional Ideas
- **Model usage analytics**: Track which models are most used per plan tier, show in admin overview
- **Per-model rate limiting**: Different RPM limits for expensive vs free models
- **Model recommendations**: Suggest the best model for a task based on schema complexity
- **Provider failover**: If OpenRouter is down, auto-route to the Lovable AI gateway as backup
- **Custom API key support**: Let users bring their own OpenRouter API key for higher limits

