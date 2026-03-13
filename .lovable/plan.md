

## Plan: Add Admin Contact Submissions View

### Changes

#### 1. Add `contacts` action to `supabase/functions/admin-stats/index.ts`
- New action `"contacts"` that queries `contact_requests` table using service role
- Supports pagination (page param, 20 per page) and returns total count
- Orders by `created_at` descending

#### 2. Add `useAdminContacts` hook to `src/hooks/useAdminData.ts`
- New exported hook calling `fetchAdminData("contacts", { page })` with react-query

#### 3. Create `src/pages/admin/AdminContactsPage.tsx`
- Table with columns: Name, Email, Company, Volume, Message (truncated), Date
- Pagination controls matching existing admin pages pattern
- Click row to expand/view full message (or inline expand)

#### 4. Update `src/App.tsx`
- Add route `/admin/contacts` → `AdminContactsPage`

#### 5. Update `src/components/AdminLayout.tsx`
- Add "Contacts" nav item with `Mail` icon to `adminNav` array

