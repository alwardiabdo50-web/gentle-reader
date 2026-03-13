

## Plan: Add CSV Export & Improve Pagination on Admin Contacts Page

### Changes

#### 1. Add `contacts-export` action to `supabase/functions/admin-stats/index.ts`
- New GET action that fetches **all** contact_requests (respecting current status filter) without pagination
- Returns the full dataset so the client can generate CSV

#### 2. Add `useAdminContactsExport` to `src/hooks/useAdminData.ts`
- A function (not a hook — called on-demand) that fetches all contacts via `fetchAdminData("contacts-export", { status })`

#### 3. Update `src/pages/admin/AdminContactsPage.tsx`
- **CSV Export**: Add a "Export CSV" button next to the status filter. On click, fetches all contacts (with current filter), converts to CSV (name, email, company, volume, message, status, date), and triggers a browser download
- **Pagination**: The page already has basic prev/next pagination. Enhance with page number buttons (show up to 5 page numbers with ellipsis for larger sets) using the existing `Pagination` UI components, matching the project's standard "Page X of Y" pattern with 20 items per page

No database or edge function structural changes needed beyond the new export action.

