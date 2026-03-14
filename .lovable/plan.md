

## Plan: Premium Admin Overview Dashboard

### Current State
The admin overview shows 8 stat cards, a plan distribution badge list, model usage chart/table, and a recent failures list. It's functional but basic — missing real-time activity, revenue insights, growth trends, and audit-level detail.

### What We'll Build

A comprehensive command-center overview with these sections:

**1. Hero KPI Row (4 primary cards with sparkline-style deltas)**
- Total Users (with new users today/7d)
- Total Jobs (30d) combining scrape+crawl+extract
- Revenue (MRR from active subscriptions)
- Success Rate (% of non-failed jobs)

**2. Secondary Stats Grid (compact row)**
- Active API Keys, Active Webhooks, Active Schedules, Credits Used, Credits Remaining, Pipeline Runs

**3. Jobs Volume Chart (7-day daily breakdown)**
- Stacked area chart: scrapes vs crawls vs extractions per day
- Backend will aggregate daily job counts for the last 7 days

**4. Revenue & Plan Distribution**
- Side-by-side: plan distribution as a visual bar breakdown (not just badges) + MRR calculation from subscriptions

**5. Real-Time Activity Feed (last 20 events)**
- Unified feed mixing: new signups, job completions, job failures, subscription changes, API key creations
- Each with icon, timestamp, and description
- Backend will query across profiles, scrape_jobs, crawl_jobs, extraction_jobs, subscriptions, api_keys sorted by created_at

**6. Error Log (enhanced)**
- Keep existing recent failures but add crawl and extraction failures too
- Show error_code, user plan, and time ago

**7. Top Users (by credits consumed)**
- Top 5 users by credits_used with plan badge

**8. System Health Pulse**
- Average response time (from scrape_jobs duration_ms, last 24h)
- Rate limit hits (from rate_limit_log, last 24h)

### Backend Changes (edge function)

Update the `overview` action in `admin-stats` to return additional data:

- `newUsersToday`, `newUsers7d` — count from profiles
- `jobsDaily` — array of `{date, scrapes, crawls, extractions}` for last 7 days
- `activeWebhooks`, `activeSchedules`, `pipelineRuns30d` — counts
- `successRate` — calculated from total vs failed
- `recentActivity` — unified feed from multiple tables (limit 20)
- `topUsers` — top 5 by credits_used
- `avgDurationMs24h` — avg scrape duration last 24h
- `rateLimitHits24h` — count from rate_limit_log
- `failedCrawlsRecent`, `failedExtractsRecent` — recent failures from those tables
- `mrr` — sum of monthly_price for active paid subscriptions
- `searchCount` (30d) — from scrape_jobs where mode='search' or from a search table

### Frontend Changes

Rewrite `AdminOverviewPage.tsx` with:
- Premium dark card design with subtle gradients on hero KPIs
- Color-coded delta indicators (green up, red down)
- Recharts stacked area for daily job volume
- Activity feed with lucide icons per event type
- Responsive grid layout (4-col desktop, 2-col tablet, 1-col mobile)
- Keep existing model usage section intact

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/admin-stats/index.ts` | Extend `overview` action with new queries |
| `src/pages/admin/AdminOverviewPage.tsx` | Complete rewrite with premium dashboard UI |

