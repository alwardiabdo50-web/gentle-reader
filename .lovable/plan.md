

## Plan: Add Search, Scrape Actions, and Branding Extraction

This is a large feature set covering 3 new capabilities plus geo-targeting enhancements. Due to scope, I recommend implementing in phases. Here is Phase 1 (the most impactful features).

---

### 1. Search Endpoint (`/v1/search`)

**New edge function**: `supabase/functions/search/index.ts`

Uses the platform's built-in scrape pipeline to perform web search via a free search API (DuckDuckGo HTML scrape or a Lovable AI model to generate search-like results from a query). The search endpoint:
- Accepts `query`, `limit`, `lang`, `country`, `tbs` (time filter), `scrapeOptions`
- Returns ranked results with title, URL, description, and optionally scraped content
- Costs 1 credit per search (configurable via `api_credit_costs`)
- Records jobs in `scrape_jobs` with `mode: 'search'`

**Implementation approach**: Use the existing Lovable AI gateway with a model like `google/gemini-2.5-flash` to perform grounded web search (the model has search grounding capabilities). This avoids needing a third-party search API key.

**Database**: Add `search` to `api_credit_costs` table via migration.

**Files**:
| File | Change |
|------|--------|
| `supabase/functions/search/index.ts` | **New** — search endpoint |
| `src/pages/PlaygroundPage.tsx` | Add "search" mode tab with query input |
| `src/pages/DocsPage.tsx` | Add Search tab with docs + snippets |
| `src/components/docs/snippetGenerator.ts` | Add search endpoint path |

---

### 2. Scrape Actions (Pre-scrape Browser Interactions)

Add an `actions` parameter to the existing scrape endpoint that defines a sequence of browser-like interactions to perform before extracting content. Since the platform uses `linkedom` (no real browser), actions will be documented as available parameters that generate warnings when used without JS rendering, but the schema is ready for future browser integration.

**Supported action types**:
- `click` — CSS selector to click
- `scroll` — direction (down/up) and pixels
- `wait` — milliseconds to wait
- `type` — CSS selector + text to type
- `press` — keyboard key to press
- `screenshot` — capture at this point

**Implementation**: Add `actions` field to `ScrapeRequest` interface. In the current static scraper, actions are acknowledged and stored in the job record. When JS rendering becomes available, the actions pipeline will execute them. For now, a warning is returned.

**Files**:
| File | Change |
|------|--------|
| `supabase/functions/_shared/scrape-pipeline.ts` | Add `actions` to `ScrapeRequest` interface |
| `supabase/functions/scrape/index.ts` | Pass through `actions` parameter |
| `src/pages/PlaygroundPage.tsx` | Add actions builder UI in scrape mode |
| `src/pages/DocsPage.tsx` | Document actions parameter |

---

### 3. Branding Extraction Format

Add `branding` as a new output format for the scrape endpoint. When requested, the scraper extracts brand identity from the page DOM:
- **Colors**: Parse CSS custom properties, computed styles from key elements, meta theme-color
- **Fonts**: Extract font-family declarations from stylesheets and inline styles
- **Logo**: Find `<link rel="icon">`, OG images, and common logo selectors
- **Typography**: Font sizes, weights from headings and body

**Implementation**: Add a `extractBranding(doc, finalUrl)` function in `scrape-pipeline.ts` that analyzes the parsed DOM.

**Files**:
| File | Change |
|------|--------|
| `supabase/functions/_shared/scrape-pipeline.ts` | Add `extractBranding()` function, add `branding` to output |
| `supabase/functions/scrape/index.ts` | Include branding in response when format requested |
| `src/pages/PlaygroundPage.tsx` | Add branding format checkbox + result viewer |
| `src/pages/DocsPage.tsx` | Document branding format |

---

### 4. Geo-targeting / Location Parameters

Add `location` parameter to scrape requests with `country` and `languages` fields. In the current static implementation, these are passed as `Accept-Language` headers. Stored in job metadata for future proxy-based geo-targeting.

**Files**:
| File | Change |
|------|--------|
| `supabase/functions/_shared/scrape-pipeline.ts` | Add `location` to request, set Accept-Language header |
| `supabase/functions/scrape/index.ts` | Pass through location parameter |

---

### Database Migration

```sql
INSERT INTO api_credit_costs (id, label, base_cost, sort_order)
VALUES ('search', 'Search', 1, 5)
ON CONFLICT (id) DO NOTHING;
```

---

### Summary of all files changed

| File | Action |
|------|--------|
| `supabase/functions/search/index.ts` | **New** — search endpoint |
| `supabase/functions/_shared/scrape-pipeline.ts` | Add actions interface, branding extraction, location/geo params |
| `supabase/functions/scrape/index.ts` | Pass through actions + location params |
| `src/pages/PlaygroundPage.tsx` | Add search mode, actions builder, branding format |
| `src/pages/DocsPage.tsx` | Add search + actions + branding documentation |
| `src/components/docs/snippetGenerator.ts` | Add search endpoint |
| Database migration | Add search credit cost |

