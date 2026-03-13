

## Plan: Add Contact Management Actions

### Problem
The admin contacts page is read-only. Admins need actions to manage submissions — mark as read/archived, delete, and reply via email link.

### Changes

#### 1. Database migration — add `status` column to `contact_requests`
```sql
ALTER TABLE public.contact_requests ADD COLUMN status text NOT NULL DEFAULT 'new';
```
This enables tracking new vs. read vs. archived contacts.

#### 2. Update `supabase/functions/admin-stats/index.ts`
- Add new actions:
  - `"contact-update"` — accepts `contactId` and `status` (new/read/archived), updates the row
  - `"contact-delete"` — accepts `contactId`, deletes the row
- Both use POST method check and service role client
- Keep existing `"contacts"` action, add optional `status` filter param

#### 3. Add `useAdminContactActions` to `src/hooks/useAdminData.ts`
- Mutation functions: `updateContactStatus(id, status)` and `deleteContact(id)` calling the edge function
- Invalidate `["admin", "contacts"]` query on success

#### 4. Update `src/pages/admin/AdminContactsPage.tsx`
- Add an **Actions** column with:
  - Status badge (New / Read / Archived) with color coding
  - Dropdown menu (DropdownMenu) per row with: "Mark as Read", "Mark as Archived", "Send Email" (mailto: link), "Delete" (with confirmation dialog)
- Add a status filter dropdown at the top (All / New / Read / Archived)
- Row styling: unread rows slightly bolder/highlighted

### Technical details
- The edge function already validates admin role, so all new actions inherit that security
- POST vs GET: new mutating actions will use the request body (POST) while reads stay as GET params
- Delete uses an AlertDialog for confirmation before calling the API

