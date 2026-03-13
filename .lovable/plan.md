

## Plan: Make Dashboard & Admin Pages Responsive

### Problem
- **DashboardLayout**: Main content uses fixed `px-8 py-10` padding — too much on mobile. The layout itself works via the collapsible sidebar.
- **AdminLayout**: Sidebar is always visible at `w-60` with no way to hide on mobile. Main content also has fixed `px-8 py-10`.
- **Data tables** on admin pages (Users, Jobs, Contacts, Billing) and dashboard pages (Overview, Jobs) overflow on small screens — no horizontal scroll wrapper or column hiding.
- **Page headers** with filters (AdminContactsPage, AdminJobsPage) use horizontal flex that doesn't wrap on mobile.

### Changes

#### 1. `DashboardLayout.tsx` — reduce padding on mobile
- Change `px-8 py-10` to `px-4 py-6 md:px-8 md:py-10`

#### 2. `AdminLayout.tsx` — add mobile sidebar toggle
- Use a Sheet (slide-out drawer) for the sidebar on mobile (`md:hidden`)
- Show the fixed sidebar only on `hidden md:flex`
- Add a hamburger/menu trigger button in the header on mobile
- Reduce main content padding: `px-4 py-6 md:px-8 md:py-10`

#### 3. `OverviewPage.tsx` — responsive grid & table
- Stat cards grid: already has `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` (good)
- Wrap recent jobs table in `overflow-x-auto`
- Reduce heading size on mobile: `text-xl md:text-2xl`

#### 4. `AdminOverviewPage.tsx` — responsive stat grid
- Change heading: `text-2xl md:text-[36px]`
- Stat values: `text-xl md:text-[28px]`

#### 5. `AdminContactsPage.tsx` — responsive header & table
- Header: wrap title/actions in `flex-col sm:flex-row` with gap
- Table: wrap in `overflow-x-auto` container
- Pagination: stack on mobile with `flex-col sm:flex-row`

#### 6. `AdminUsersPage.tsx` — responsive table
- Wrap table in `overflow-x-auto`

#### 7. `AdminJobsPage.tsx` — responsive filters & table
- Filters row: `flex flex-wrap gap-2`
- Wrap table in `overflow-x-auto`
- Pagination: `flex-col sm:flex-row`

#### 8. `AdminBillingPage.tsx` — responsive stats & tables
- Stats grid already has `grid-cols-1 md:grid-cols-4` (good, but could use `grid-cols-2 sm:grid-cols-2 md:grid-cols-4`)
- Wrap tables in `overflow-x-auto`

### Summary
Mostly CSS-level changes: responsive padding, `overflow-x-auto` on tables, `flex-wrap` on filter rows, and a Sheet-based mobile sidebar for AdminLayout. No backend or data changes needed.

