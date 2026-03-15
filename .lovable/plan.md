

## Improve the Scraper Engine with Self-Hosted Playwright

### Architecture

```text
Current:   Edge Function → static fetch → linkedom parse → markdown
Improved:  Edge Function → check render_javascript flag
             ├─ false → static pipeline (unchanged)
             └─ true  → POST to Playwright microservice → get rendered HTML → linkedom parse → markdown
```

You'll deploy a lightweight Playwright microservice (Node.js + Playwright) on any VPS/container (e.g. Railway, Fly.io, a $5 VPS). The edge function calls it via HTTP when JS rendering is needed.

### Step 1: Create the Playwright microservice spec

A simple Express/Hono server with one endpoint:

```
POST /render
Body: { url, wait_until, timeout_ms, mobile, headers, cookies, actions, screenshot }
Response: { html, screenshot_base64?, final_url, status_code }
```

This is **not** deployed in Lovable — you'd host it externally. I'll provide the full code as a reference file you can deploy anywhere.

### Step 2: Add `PLAYWRIGHT_SERVICE_URL` secret

A new secret pointing to your deployed Playwright service (e.g. `https://your-pw-service.fly.dev`).

### Step 3: Update `scrape-pipeline.ts`

Modify `performScrape()` to:

1. Check if `render_javascript` is true AND `PLAYWRIGHT_SERVICE_URL` is configured
2. If yes: call the Playwright service to get fully rendered HTML, then feed that HTML into the existing linkedom + Readability + Turndown pipeline
3. If no: fall back to current static fetch (no change)
4. Support **screenshots** — the Playwright service returns a base64 screenshot, which we upload to the `branding` storage bucket and return as `screenshot_url`
5. Support **actions** — forward click/scroll/type/wait actions to the Playwright service
6. Remove the "not supported" warnings when the service is available

### Step 4: Add new scrape formats

While we're improving the pipeline, add these formats:

| Format | Description |
|--------|-------------|
| `rawHtml` | Return the original unmodified HTML (before Readability) |
| `images` | Extract all `<img>` src URLs from the page |

### What changes

| File | Change |
|------|--------|
| `supabase/functions/_shared/scrape-pipeline.ts` | Add `renderWithPlaywright()` function, update `performScrape()` routing, add `rawHtml` + `images` formats, add `images` to `ScrapeResult` |
| `supabase/functions/_shared/playwright-service.ts` | New file — reference Playwright microservice code (Express + Playwright) |
| Secret: `PLAYWRIGHT_SERVICE_URL` | New secret for the service endpoint |

### What does NOT change

- `scrape/index.ts`, `extract/index.ts`, `crawl-worker/index.ts` — all use `performScrape()` so they automatically get JS rendering
- No database changes needed
- Cache key already includes `render_javascript` flag so cached results stay correct

### Effort

The edge function changes are straightforward (~80 lines). The Playwright microservice is a separate ~100-line Node.js app you deploy independently.

