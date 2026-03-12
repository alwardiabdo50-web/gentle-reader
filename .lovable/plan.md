

## AI-Powered Data Cleaning Pipelines

### Overview
A new "pipeline" concept that chains **scrape → extract → transform** in a single API call. Users can also save reusable pipeline definitions (schema + prompt + transform instructions) for repeated use.

### Database Changes

**New table: `pipelines`** — stores reusable pipeline definitions per user.

```sql
CREATE TABLE public.pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  scrape_options jsonb DEFAULT '{}',
  extract_schema jsonb,
  extract_prompt text,
  extract_model text DEFAULT 'google/gemini-3-flash-preview',
  transform_prompt text,
  transform_model text DEFAULT 'google/gemini-3-flash-preview',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: users CRUD their own pipelines
-- Service role full access
```

**New table: `pipeline_runs`** — tracks each execution of a pipeline.

```sql
CREATE TABLE public.pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  api_key_id uuid,
  source_url text NOT NULL,
  status text DEFAULT 'running',
  scrape_job_id uuid,
  extraction_job_id uuid,
  scrape_result jsonb,
  extract_result jsonb,
  transform_result jsonb,
  final_output jsonb,
  credits_used integer DEFAULT 0,
  error_code text,
  error_message text,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz DEFAULT now()
);
-- RLS: users view own runs, service role full access
```

### New Edge Function: `pipeline`

**`supabase/functions/pipeline/index.ts`**

Accepts either:
- **Inline mode**: `{ url, scrape_options?, extract: { prompt?, schema?, model? }, transform?: { prompt, model? } }`
- **Saved pipeline mode**: `{ url, pipeline_id }` — loads config from `pipelines` table

Execution flow:
1. **Auth** via API key (reuse `_shared/api-key-auth.ts`)
2. **Rate limit + quota check** (cost = 1 scrape + 2 extract + 2 transform = up to 5 credits)
3. **Scrape** — call `performScrape()` from `_shared/scrape-pipeline.ts`, with cache support
4. **Extract** — call AI gateway with schema/prompt against scraped markdown (reuse logic from `extract/index.ts`)
5. **Transform** (optional) — second AI call to clean/reshape the extracted JSON using a transform prompt (e.g., "normalize prices to USD", "flatten nested arrays")
6. **Record** pipeline_run, ledger entries, webhook dispatch (`pipeline.completed` / `pipeline.failed`)

Credits charged: 1 (scrape, 0 if cached) + 2 (extract) + 2 (transform, 0 if skipped) = 1-5 credits.

### New Edge Function: `pipelines-manage`

**`supabase/functions/pipelines-manage/index.ts`**

CRUD for saved pipelines (authenticated via session, not API key):
- `GET` — list user's pipelines
- `POST` — create pipeline
- `PUT` — update pipeline
- `DELETE` — delete pipeline

### Frontend Changes

**1. New page: `src/pages/PipelinesPage.tsx`**
- List saved pipelines in a table (name, description, last run, actions)
- Create/edit dialog with fields: name, description, extract prompt, JSON schema, transform prompt, model selectors
- "Run" button that opens a URL input and executes the pipeline
- Results viewer showing each stage: Scrape → Extract → Transform → Final Output

**2. Update `src/pages/PlaygroundPage.tsx`**
- Add `pipeline` mode to the mode selector
- Pipeline mode UI: URL input + either select a saved pipeline or define inline (extract prompt/schema + optional transform prompt)
- Results show a stepped view: scrape result → extracted data → transformed output

**3. Update routing in `src/App.tsx`**
- Add `/pipelines` route

**4. Update sidebar in `src/components/AppSidebar.tsx`**
- Add "Pipelines" nav item

**5. Update `src/lib/api/scrape.ts`**
- Add `PipelineResponse` interface and `runPipeline()` client helper

### Config
```toml
[functions.pipeline]
verify_jwt = false

[functions.pipelines-manage]
verify_jwt = false
```

### Response Shape
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "stages": {
      "scrape": { "title": "...", "markdown": "...", "cache_hit": false },
      "extract": { "data": { "name": "Widget", "price": 29.99 }, "validation": { "valid": true } },
      "transform": { "data": { "product": "Widget", "price_usd": 29.99 } }
    },
    "final_output": { "product": "Widget", "price_usd": 29.99 }
  },
  "meta": {
    "run_id": "uuid",
    "pipeline_id": "uuid or null",
    "credits_used": 5
  }
}
```

### Files Summary

| File | Action |
|------|--------|
| DB migration | `pipelines` + `pipeline_runs` tables |
| `supabase/functions/pipeline/index.ts` | New — orchestrates scrape→extract→transform |
| `supabase/functions/pipelines-manage/index.ts` | New — CRUD for saved pipelines |
| `supabase/config.toml` | Register both functions |
| `src/pages/PipelinesPage.tsx` | New — pipeline management UI |
| `src/pages/PlaygroundPage.tsx` | Add pipeline mode |
| `src/App.tsx` | Add route |
| `src/components/AppSidebar.tsx` | Add nav item |
| `src/lib/api/scrape.ts` | Add pipeline types + client helper |

