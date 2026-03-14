

## Fix: Admin Sidebar Collapsed Icons Appearing Too Small

### Problem
The icons at 20px (`h-5 w-5`) look visually small because the collapsed sidebar (`w-[52px]`) creates too much empty space around them, and the nav link containers only use `p-2` padding — making the icons appear undersized relative to the sidebar width.

### Solution
Two changes in `src/components/AdminLayout.tsx`:

1. **Increase collapsed sidebar width** from `w-[52px]` to `w-[60px]` — gives icons more presence and matches better proportions
2. **Increase collapsed icon size** from `h-5 w-5` (20px) to `h-6 w-6` (24px) — the native lucide size, crisp and clear
3. **Increase nav link hit area** from `p-2` to `p-2.5` for better spacing

This applies to:
- The 5 nav icons (Overview, Users, Jobs, Contacts, Billing)
- The "Back to Dashboard" arrow icon
- The Shield icon in the header
- The collapse toggle button icon

Single file change: `src/components/AdminLayout.tsx`

