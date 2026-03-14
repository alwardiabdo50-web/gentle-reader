

## Plan: Update Rate Limits table + Add Search/new features to Public Docs

Two changes across two files:

### 1. Update Rate Limits & Credits table (both pages)

The screenshot shows the current hardcoded table uses plan names "Free, Starter, Pro, Scale" — but the actual platform plans are **Free, Hobby ($9), Standard ($49), Growth ($199), Scale ($399)**. Update both `DocsPage.tsx` and `PublicDocsPage.tsx` to use the correct plan data:

| Plan | Credits/mo | Rate Limit | Price |
|------|-----------|------------|-------|
| Free | 500 | 5 req/min | $0 |
| Hobby | 3,000 | 20 req/min | $9/mo |
| Standard | 25,000 | 100 req/min | $49/mo |
| Growth | 100,000 | 500 req/min | $199/mo |
| Scale | 500,000 | 1,000 req/min | $399/mo |

Better approach: **pull from the `plans` table dynamically** using the existing `usePlans` hook so the table stays in sync with admin-managed plan data. The `plans` table already has `monthly_credits`, `rate_limit_rpm`, and `monthly_price` fields.

### 2. Update Public Docs (`PublicDocsPage.tsx`) to include new features

The public docs page is missing the recently added endpoints and features. Add:

- **Search tab** — `POST /v1/search` with params table and snippets
- **Scrape actions** — document the `actions` parameter with examples (click, scroll, wait, type, press)
- **Branding format** — document `branding` as an output format with example snippet
- **Geo-targeting** — document the `location` parameter with example snippet

This mirrors what already exists in the dashboard `DocsPage.tsx`.

### Files changed

| File | Change |
|------|--------|
| `src/pages/DocsPage.tsx` | Replace hardcoded rate limits table with dynamic data from `usePlans` hook |
| `src/pages/public/PublicDocsPage.tsx` | Add Search tab, scrape actions/branding/geo-targeting docs, replace hardcoded rate limits with dynamic data |

