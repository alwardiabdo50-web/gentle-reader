

## Fix Extract Endpoint to Use Real Scraping

The extract endpoint currently uses a **mock** `scrapeForExtraction` function (line 67-93 of `extract/index.ts`) that returns hardcoded fake content like "This is mock content from **{url}**". That's why extraction always returns empty results — the AI model never sees the real page content.

### Root Cause

```text
Current flow:  URL → mock HTML string → AI extracts from fake data → empty results
Desired flow:  URL → real HTTP fetch + parse → AI extracts from actual content → real data
```

### Fix

**`supabase/functions/extract/index.ts`**

1. Replace the mock `scrapeForExtraction` function with a call to the real `performScrape` from `../_shared/scrape-pipeline.ts` (same pipeline used by the `/scrape` endpoint)
2. Pass `render_javascript`, `only_main_content`, and other relevant options from the request body
3. Store the real scrape result (markdown, title, final_url) into the `scrape_jobs` record and feed the real markdown to the AI model

### What changes

| Section | Before | After |
|---------|--------|-------|
| Import | — | Add `import { performScrape } from "../_shared/scrape-pipeline.ts"` |
| `scrapeForExtraction()` | Returns hardcoded mock string | Calls `performScrape({ url, formats: ["markdown"], only_main_content, ... })` and returns real markdown + title |
| Scrape job insert | Inserts mock data | Inserts real scraped content |

Single file change, ~30 lines replaced.

