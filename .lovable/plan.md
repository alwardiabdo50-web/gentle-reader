

## Plan: Add Pagination to Jobs, Webhooks, Schedules, and Admin Pages

### 1. Jobs Page (`src/pages/JobsPage.tsx`)
- Add `page` state (default 1), use `ITEMS_PER_PAGE = 20`
- Update each query (scrape_jobs, extraction_jobs, pipeline_runs) to use `.range(from, to)` based on current page instead of `.limit(50)`
- Get total count via `{ count: 'exact', head: true }` queries
- Add prev/next pagination controls below the table with "Page X of Y" indicator
- Reset page to 1 when filter or search changes

### 2. Webhooks Page (`src/pages/WebhooksPage.tsx`)
- Add client-side pagination for the deliveries table (webhooks list is typically small)
- Slice deliveries array by page, show prev/next controls under the deliveries tab

### 3. Schedules Page (`src/pages/SchedulesPage.tsx`)
- Add client-side pagination for the runs list (schedule runs per selected schedule)
- Slice runs array by page, show prev/next controls under the runs section

### 4. Admin Users & Jobs Pages (`src/pages/admin/AdminUsersPage.tsx`, `src/pages/admin/AdminJobsPage.tsx`)
- Enhance existing prev/next with page number display ("Page X of Y")
- Calculate total pages from `data.total` and `data.limit`

### Shared Pattern
All pages will use the same pagination UI: `ChevronLeft`/`ChevronRight` buttons with a "Page X of Y" text between them, consistent with the existing admin page style. No separate pagination component needed — inline buttons keep it simple.

