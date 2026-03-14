

## Plan: Model Usage Trend Chart

### Overview
Add a time-series area chart below the existing Model Usage table showing daily extraction job counts per model over the last 30 days. Uses Recharts (already available via the `chart.tsx` component).

### 1. Edge Function (`admin-stats/index.ts`)

In the overview action, extend the existing `extractionRows` aggregation to also produce a daily time-series:

- Group extraction jobs by `date` (truncate `created_at` to YYYY-MM-DD) and `model`
- Return as `modelUsageTrend`: array of `{ date: string, [modelName]: number }` objects — one entry per day with job counts per model
- Only include top 5 models by total jobs to keep the chart readable

### 2. Admin Overview Page (`AdminOverviewPage.tsx`)

Add a Recharts `AreaChart` between the "Model Usage (30d)" header and the existing table:

- Import `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` from `@/components/ui/chart`
- Stacked area chart with one area per model (top 5)
- Color-coded by tier (green=free, blue=cheaper, orange=expensive)
- X-axis: dates, Y-axis: job count
- Falls back to "No trend data" if empty
- Chart height ~250px inside the existing card, table remains below

### Files Changed
- `supabase/functions/admin-stats/index.ts` — add `modelUsageTrend` to overview response
- `src/pages/admin/AdminOverviewPage.tsx` — add area chart above the table

