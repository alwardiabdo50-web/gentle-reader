

## Plan: Fix Admin Sidebar Collapse Issue

### Problem
The admin sidebar's `<aside>` element lacks `overflow-hidden`, so during the width transition from `w-60` → `w-[52px]`, text content briefly overflows and bleeds out before the conditional render removes it. The main dashboard sidebar (shadcn `Sidebar` component) handles this natively, but the admin sidebar is a custom implementation missing this detail.

### Changes

#### `src/components/AdminLayout.tsx`
- Add `overflow-hidden` to the `<aside>` element so content is clipped during the collapse/expand animation
- Add `whitespace-nowrap` to prevent text wrapping during the transition
- Ensure nav link text uses `truncate` to handle edge cases during animation

Single line change — add `overflow-hidden` to the aside's className.

