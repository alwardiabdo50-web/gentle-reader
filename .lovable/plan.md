

## Plan: Add Time (h:m:s) to All Job Execution Dates

### Problem
Several pages display job execution timestamps as date-only (e.g., "3/14/2026"). Users need to see the time of execution as well.

### Scope
Only pages showing **job/scraper execution dates** are affected. Excluded: billing period end, user join date, team invitation expiry, changelog dates, template creation dates — these are non-execution context where date-only is appropriate.

### Files to Change

**1. `src/pages/JobsPage.tsx`** (line 166)
- `formatTime` currently shows only `HH:MM`. Update to include seconds: `{ hour: "2-digit", minute: "2-digit", second: "2-digit" }`.

**2. `src/pages/OverviewPage.tsx`** (line 192)
- Recent jobs table shows `toLocaleDateString()` only. Change to `toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })`.

**3. `src/pages/admin/AdminJobsPage.tsx`** (line 90)
- Date column shows `toLocaleDateString()`. Change to include time with h:m:s.

**4. `src/pages/admin/AdminUserDetailPage.tsx`** (line 114)
- Recent Jobs table shows `toLocaleDateString()`. Change to include time with h:m:s.

**5. `src/pages/admin/AdminOverviewPage.tsx`**
- Line 140: Chart tooltip `labelFormatter` — change `toLocaleDateString()` to `toLocaleString()`.
- Recent Failures section: Add timestamp display using `created_at` with h:m:s format.

**6. `src/pages/SchedulesPage.tsx`** (line 312)
- Schedule creation date shows `"MMM d, yyyy"`. Change to `"MMM d, yyyy HH:mm:ss"`.

### Approach
Use a consistent format across all pages: `"MMM d, HH:mm:ss"` for compact table cells, or the equivalent `toLocaleString` with `{ month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }`.

