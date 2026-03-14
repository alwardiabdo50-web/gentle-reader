

## User Detail Dialog with Blurred Background

Create a reusable dialog component that shows full user details in a popup with a blurred backdrop overlay, used from both the Overview page (top users) and Users list page.

### New File: `src/components/admin/AdminUserDetailDialog.tsx`
- Dialog using existing `Dialog` component from `@/components/ui/dialog`
- Props: `userId: string | null`, `open: boolean`, `onOpenChange: (open: boolean) => void`
- Uses `useAdminUserDetail(userId)` hook to fetch data
- Content: profile cards (plan, credits, joined), subscription status, API keys list, recent jobs table — same layout as `AdminUserDetailPage` but without back button
- `DialogContent` with `max-w-3xl max-h-[85vh] overflow-y-auto`
- Loading skeleton while fetching

### Modify `DialogOverlay` in `src/components/ui/dialog.tsx`
- Add `backdrop-blur-sm` to the overlay class so all dialogs get the frosted glass blur effect behind them

### Modify `src/pages/admin/AdminOverviewPage.tsx`
- Replace `Link` import usage for top users with a click handler setting `selectedUserId` state
- Add `useState<string | null>(null)` for `selectedUserId`
- Render `<AdminUserDetailDialog>` controlled by that state

### Modify `src/pages/admin/AdminUsersPage.tsx`
- Replace `navigate(...)` onClick with `setSelectedUserId(u.user_id)`
- Remove `useNavigate` import (if unused elsewhere)
- Render `<AdminUserDetailDialog>` controlled by state

### Files

| File | Action |
|------|--------|
| `src/components/admin/AdminUserDetailDialog.tsx` | Create |
| `src/components/ui/dialog.tsx` | Add `backdrop-blur-sm` to overlay |
| `src/pages/admin/AdminOverviewPage.tsx` | Replace Link with dialog trigger |
| `src/pages/admin/AdminUsersPage.tsx` | Replace navigate with dialog trigger |

