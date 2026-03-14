

## Add Filters and Plan-Colored Badges to Admin Users Page

### Changes

**1. `src/hooks/useAdminData.ts`** — Add `plan` filter param to `useAdminUsers`
- Accept a `plan` parameter (default `"all"`)
- Pass it to `fetchAdminData("users", { page, search, plan })`

**2. `supabase/functions/admin-stats/index.ts`** — Handle `plan` filter in the `users` action
- Read `plan` from search params
- If not `"all"`, add `.eq("plan", plan)` to the profiles query

**3. `src/pages/admin/AdminUsersPage.tsx`** — Add filter UI and plan-colored badges
- Add a plan filter dropdown (Select) with options: All, Free, Hobby, Standard, Growth, Scale
- Wire it to the hook and reset page on filter change
- Map plan names to Badge variants:
  - `free` → `secondary` (gray)
  - `hobby` → `info` (blue)
  - `standard` → `default` (primary)
  - `growth` → `warning` (amber)
  - `scale` → `success` (green)

### Files Changed
- `src/hooks/useAdminData.ts` (add plan param)
- `supabase/functions/admin-stats/index.ts` (filter by plan)
- `src/pages/admin/AdminUsersPage.tsx` (filter UI + colored badges)

