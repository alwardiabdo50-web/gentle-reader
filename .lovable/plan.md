

## Plan: Add /overview Dashboard Page

Create a quick-stats overview page as the default dashboard landing, showing credits, recent job counts, active API keys, webhooks, and schedules.

### Changes

1. **Create `src/pages/OverviewPage.tsx`**
   - Card grid with stats: credits remaining (via `useCredits`), active API keys count, recent scrape/crawl/extract jobs (last 7 days), active webhooks count, active schedules count
   - Queries: `api_keys` (count where `is_active`), `scrape_jobs` (count last 7d), `crawl_jobs` (count last 7d), `webhooks` (count where `is_active`), `schedules` (count where `is_active`)
   - Quick-action links to Playground, API Keys, Docs
   - Recent jobs list (last 5 scrape jobs) with status badges

2. **Update `src/App.tsx`**
   - Change default route `/` from `PlaygroundPage` to `OverviewPage`
   - Add `/playground` route for `PlaygroundPage`

3. **Update `src/components/AppSidebar.tsx`**
   - Add "Overview" as first item in `mainItems` with `LayoutDashboard` icon at `/`
   - Change Playground URL from `/` to `/playground`

