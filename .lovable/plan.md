

## Plan: Database-backed Changelog with Admin UI

### Overview
Move changelog entries from a hardcoded array into a database table, create admin CRUD operations via the existing `admin-stats` edge function, and build an admin page following the same pattern as `AdminPlansPage`.

### Database

**New table: `changelog_entries`**
- `id` (uuid, PK, default gen_random_uuid())
- `date` (date, not null) — display date
- `version` (text, not null) — e.g. "v1.4.0"
- `category` (text, not null) — feature, improvement, deprecation, fix
- `title` (text, not null)
- `description` (text, not null)
- `is_published` (boolean, default true) — allows drafts
- `sort_order` (integer, default 0) — for manual ordering within same date
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

**RLS policies:**
- Public SELECT where `is_published = true` (public changelog page)
- No public INSERT/UPDATE/DELETE (admin-only via service role in edge function)

**Seed** the 6 existing hardcoded entries via INSERT.

### Edge Function Changes (`admin-stats/index.ts`)

Add to GET handlers:
- `action=changelog` — select all entries ordered by date desc (admin sees all including unpublished)

Add to POST handlers:
- `changelog-create` — insert new entry
- `changelog-update` — update entry by id
- `changelog-delete` — hard delete entry by id

### Frontend Changes

**`src/hooks/useAdminData.ts`**
- Add `useAdminChangelog()` query hook
- Add `useAdminChangelogMutations()` with create/update/delete mutations

**New file: `src/pages/admin/AdminChangelogPage.tsx`**
- Table listing all entries with date, version, category badge, title, published status
- Create/Edit dialog with fields: date, version, category (select), title, description, is_published toggle
- Delete button with confirmation
- Pattern matches `AdminPlansPage` exactly

**`src/components/AdminLayout.tsx`**
- Add "Changelog" nav item with `FileText` icon pointing to `/admin/changelog`

**`src/App.tsx`**
- Add route: `<Route path="/changelog" element={<AdminChangelogPage />} />` inside admin routes

**`src/pages/public/ChangelogPage.tsx`**
- Replace hardcoded entries array with data fetched from database via `supabase.from("changelog_entries").select("*").eq("is_published", true).order("date", { ascending: false })`
- Show loading skeleton while fetching

### Files Changed
- `supabase/functions/admin-stats/index.ts` (add changelog CRUD handlers)
- `src/hooks/useAdminData.ts` (add changelog hooks)
- `src/pages/admin/AdminChangelogPage.tsx` (new)
- `src/pages/public/ChangelogPage.tsx` (fetch from DB)
- `src/components/AdminLayout.tsx` (add nav item)
- `src/App.tsx` (add admin route)
- Migration SQL (create table + seed data + RLS)

