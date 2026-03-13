

## Three Features: Playground Improvements, Rate Limit Dashboard, Public Status Page

### Feature 1: Interactive Playground Improvements

**Request History** — After each successful run, save `{ mode, url, params, timestamp }` to `localStorage` (key: `playground_history`, max 50 entries). Add a collapsible "History" sidebar/panel on the right showing recent runs. Clicking an entry restores all inputs and re-runs or just restores inputs.

**Saved Presets** — New database table `playground_presets` with columns: `id, user_id, name, mode, config_json, created_at`. Users can click "Save as Preset" to name and store current playground config, and a dropdown to load presets. RLS: users manage their own.

**Diff View** — For scrape mode, store the last result in state. When running the same URL again, show a "Diff" tab in results that highlights added/removed lines in the markdown output using a simple inline diff algorithm (no external library needed — line-by-line comparison with green/red highlighting).

**Shareable Links** — Encode playground config (mode, url, options) into URL search params (`?mode=scrape&url=...&renderJs=true`). On mount, parse `window.location.search` to restore state. Add a "Share" button that copies the link.

**Files changed:**
| File | Action |
|------|--------|
| `src/pages/PlaygroundPage.tsx` | Add history panel, preset save/load, diff tab, URL params sync, share button |
| Migration | Create `playground_presets` table with RLS |

---

### Feature 2: Rate Limit Dashboard on Usage Page

Add a new "Rate Limits" section to `UsagePage.tsx`:

- **Current RPM card** — Show plan-based RPM limit (free=20, starter=60, pro=120, scale=600) from profile.plan. Display a gauge or progress bar showing approximate current usage.
- **Rate limit tracking** — Add a `rate_limit_log` table (`id, user_id, endpoint, hit_at, was_limited`) to record 429 responses. The edge functions already enforce rate limits; add a simple insert when a 429 is returned.
- **Historical chart** — Query `rate_limit_log` for the last 24 hours, group by hour, show as a bar chart: successful requests vs rate-limited requests.
- **Stats cards** — "Requests This Minute", "RPM Limit", "Rate Limit Hits (24h)", "Avg Requests/Min (24h)".

**Files changed:**
| File | Action |
|------|--------|
| `src/pages/UsagePage.tsx` | Add Rate Limits section with chart and stats |
| Migration | Create `rate_limit_log` table with RLS |
| Edge functions (`scrape`, `extract`, etc.) | Insert into `rate_limit_log` on 429 responses |

---

### Feature 3: Public Status Page (`/status`)

A public (unauthenticated) page at `/status` showing:

- **Overall status indicator** — Green/yellow/red badge based on recent error rates.
- **Endpoint health cards** — For each endpoint (Scrape, Crawl, Map, Extract, Pipeline), show uptime % and average response time over the last 24 hours.
- **Response time chart** — Line chart showing p50 response times per hour over the last 24 hours.
- **Incident history** — A simple list of recent periods where error rate exceeded a threshold.

**Data source:** New edge function `status-public` that queries `scrape_jobs`, `extraction_jobs`, `pipeline_runs` aggregated stats using service role (no auth required). Returns summary JSON. Cache the response for 5 minutes.

**Files changed:**
| File | Action |
|------|--------|
| `src/pages/public/StatusPage.tsx` | New page with status UI, charts |
| `src/App.tsx` | Add `/status` route under PublicLayout |
| `supabase/functions/status-public/index.ts` | New edge function aggregating health metrics |
| `supabase/config.toml` | Add `verify_jwt = false` for status-public |
| Migration | Create `rate_limit_log` table (shared with Feature 2) |

---

### Database Changes

One migration with:
1. `playground_presets` table — `id uuid PK, user_id uuid NOT NULL, name text NOT NULL, mode text NOT NULL, config_json jsonb NOT NULL DEFAULT '{}', created_at timestamptz DEFAULT now()` with RLS for user CRUD.
2. `rate_limit_log` table — `id uuid PK, user_id uuid NOT NULL, endpoint text NOT NULL, hit_at timestamptz DEFAULT now(), was_limited boolean DEFAULT false` with RLS for user SELECT + service_role ALL.

### Implementation Order
1. Database migration (both tables)
2. Playground improvements (localStorage history, presets CRUD, diff view, shareable links)
3. Rate Limit Dashboard (UsagePage additions + edge function logging)
4. Public Status Page (new edge function + new page + route)

