

## Add click-through on Top Users cards

Wrap each top user row in a `Link` (from react-router-dom) pointing to `/admin/users/{user_id}`. Add a chevron icon and hover state.

### Changes

**`src/pages/admin/AdminOverviewPage.tsx`**
- Import `Link` from `react-router-dom` and `ChevronRight` (already imported)
- Replace the `<div>` wrapper for each top user with `<Link to={/admin/users/${u.user_id}}>` 
- Add `hover:bg-muted/50 transition-colors cursor-pointer` classes
- Append a `<ChevronRight>` icon on the right

Single file, ~5 lines changed.

