

## Plan: Clean Up Removed CSS Class References

Six page files reference CSS classes (`glow-primary`, `surface-1`, `surface-2`, `nebula-cyan`, `nebula-warning`) that were removed during the redesign. These need to be replaced with the new design system equivalents.

### Files and Changes

**1. `src/pages/JobsPage.tsx`**
- Replace `nebula-cyan` references in `statusStyles` and `typeColors` with new semantic colors (`text-[#3B82F6]` for info/running, `text-[#F59E0B]` for warning/extract)
- Replace `surface-2` on table header with `bg-[#111113]`
- Replace `hover:bg-muted/30` on rows with `hover:bg-[#1F1F23]`
- Replace `bg-nebula-cyan` dot with `bg-[#3B82F6]`

**2. `src/pages/BillingPage.tsx`**
- Remove `surface-1 glow-primary` from current plan card, replace with `bg-card`
- Remove `surface-1` from credit usage card and plan cards
- Remove `glow-primary` from current plan card highlight

**3. `src/pages/ApiKeysPage.tsx`**
- Remove `glow-primary` from "New Key" button
- Replace `border-nebula-warning/30 bg-nebula-warning/5` warning box with `border-[#F59E0B]/20 bg-[#F59E0B]/10`
- Replace `text-nebula-warning` with `text-[#F59E0B]`
- Replace `surface-2` on table header with `bg-[#111113]`
- Replace `hover:bg-muted/30` with `hover:bg-[#1F1F23]`
- Replace `bg-muted` on code display with `bg-[#111113]`

**4. `src/pages/public/PricingPage.tsx`**
- Remove `glow-primary` from highlighted plan card and button
- Replace `surface-1` with `bg-card`
- Replace `surface-2` on comparison table header with `bg-[#111113]`

**5. `src/pages/public/StatusPage.tsx`**
- Replace `text-[hsl(var(--nebula-warning))]` with `text-[#F59E0B]` throughout
- Replace `bg-[hsl(var(--nebula-warning))]/10 border-[hsl(var(--nebula-warning))]/30` with `bg-[#F59E0B]/10 border-[#F59E0B]/20`

**6. `src/pages/SettingsPage.tsx`**
- Remove `surface-1` from notification toggle cards

### No logic changes. Pure class name replacements.

