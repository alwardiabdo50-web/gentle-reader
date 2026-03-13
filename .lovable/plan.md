

## Plan: Full UI Redesign — Firecrawl-grade Polish

This is a visual-only redesign touching the design system (CSS tokens, fonts, base components) and then every page/layout component. No logic, routes, or data changes.

### Phase 1: Design System Foundation

**1. `index.html`** — Add Geist + Geist Mono font imports from Google Fonts.

**2. `src/index.css`** — Complete rewrite of CSS variables:
- Replace all HSL color tokens with the exact hex/rgba palette specified
- New tokens for card-hover, subtle-border, strong-border, brand-accent-bg, success/warning/danger/info pairs
- Font-family: `'Geist', system-ui, sans-serif`
- Add global rules: `-webkit-font-smoothing: antialiased`, custom scrollbar styles (4px, rgba thumb), `::selection` with teal tint
- Remove all `glow-*` utilities and `text-gradient-primary`
- Add utility classes for the 4 heading levels (h1-h4) and body/small/code text styles
- All transitions: `0.15s ease`

**3. `tailwind.config.ts`** — Update:
- Font families to Geist/Geist Mono
- All color tokens to match new palette
- Border radius max 12px (remove lg if >12px)
- Remove nebula-* custom colors, replace with semantic status colors

### Phase 2: Base UI Components (~12 files)

**4. `src/components/ui/button.tsx`** — Restyle all variants:
- Primary: `bg-[#2DD4BF] text-[#0A0A0B]`, hover `bg-[#14B8A6] -translate-y-px`, 8px radius, 13px font
- Secondary: `bg-[#18181B] text-[#FAFAF9] border border-white/12`, hover `bg-[#1F1F23]`
- Ghost: transparent, text `#A1A1AA`, hover `bg-[#18181B] text-[#FAFAF9]`
- Remove `glow-primary` usage from all buttons app-wide

**5. `src/components/ui/card.tsx`** — Apply: `bg-[#18181B] border border-white/[0.07] rounded-xl p-5`, hover variant with `hover:bg-[#1F1F23] hover:border-white/[0.12]`, transition, no shadows.

**6. `src/components/ui/input.tsx`** — `bg-[#18181B] border-white/[0.12] rounded-lg` , focus: `border-[#2DD4BF] ring-[#2DD4BF]/12 ring-[3px]`, no outline, 13px font, placeholder `#52525B`.

**7. `src/components/ui/badge.tsx`** — 11px, weight 500, pad `2px 8px`, radius 4px, semantic color variants (success, warning, danger, info, neutral).

**8. `src/components/ui/tabs.tsx`** — Segmented control: container `bg-[#111113] border-white/[0.07] rounded-lg p-[3px]`, active tab `bg-[#18181B] text-[#FAFAF9] font-medium shadow-sm`, inactive `text-[#A1A1AA]`.

**9. `src/components/ui/table.tsx`** — Wrapper border + rounded-xl + overflow-hidden. Header: 11px uppercase `#52525B`. Row hover `#1F1F23`. Cell: 13px `#A1A1AA`.

**10. `src/components/ui/switch.tsx`** — Inactive track `rgba(255,255,255,0.12)`, active track `#2DD4BF`, white thumb.

**11. `src/components/ui/select.tsx`, `textarea.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `sheet.tsx`** — Apply consistent dark surface colors, border styles, and font sizing.

### Phase 3: Layout Components

**12. `src/components/AppSidebar.tsx`** — Sidebar bg `#111113`, right border `white/[0.07]`. Nav items: 13px, `#A1A1AA`, padding `7px 12px`, rounded-lg. Active: `bg-[#2DD4BF]/12 text-[#2DD4BF] font-medium`. Group labels: 10px uppercase `#52525B` tracking-widest. Remove font-mono from version. Credits widget: match card style.

**13. `src/components/DashboardLayout.tsx`** — Page bg `#0A0A0B`. Content padding `32px horizontal, 40px vertical`. Max width 1200px centered. Header bar: `#111113` bg, subtle bottom border.

**14. `src/components/AdminLayout.tsx`** — Same sidebar treatment as AppSidebar. Nav items match new active/hover states.

**15. `src/components/public/PublicNavbar.tsx`** — Remove `glow-primary`. Apply new button styles. Backdrop blur stays.

**16. `src/components/public/PublicFooter.tsx`** — Section titles: 11px uppercase. Muted text colors from new palette.

**17. `src/components/public/PublicLayout.tsx`** — Body bg `#0A0A0B`.

### Phase 4: Pages

**18. `src/pages/admin/AdminOverviewPage.tsx`** — 4-col grid. Stat cards: label 12px uppercase `#52525B` above, value 28px bold `#FAFAF9`. First card gets left accent border. Plan Distribution: proper pill badges. Empty failures: success icon + "All systems healthy".

**19. `src/pages/PlaygroundPage.tsx`** — Mode selector: segmented control style. Input area card with subtle border. URL input full-width with Run button as suffix. Toggles: teal switch. Results area: `#111113` bg. Divider between input/results.

**20. `src/pages/AuthPage.tsx`** — Remove `glow-primary`. Apply new button/input styles. Card container with new card style.

**21. All remaining pages** (`ApiKeysPage`, `UsagePage`, `BillingPage`, `JobsPage`, `SettingsPage`, `TeamPage`, `WebhooksPage`, `SchedulesPage`, `PipelinesPage`, `DocsPage`, `PricingPage`, `StatusPage`, admin pages) — Apply heading hierarchy (H1 36px bold, H2 24px semibold), card styles, table styles, badge colors, spacing (48px section gaps, 16px card grid gaps).

**22. `src/pages/public/HomePage.tsx`** — Keep one subtle radial gradient on hero. Remove all other glows. Apply heading hierarchy. Feature cards: new card style with hover.

**23. `src/components/public/CodeBlock.tsx`** — `bg-[#111113] border-white/[0.07] rounded-xl`, Geist Mono 13px, copy button ghost style on hover.

### Summary of Files Touched
- `index.html` (font import)
- `src/index.css` (full rewrite)
- `src/App.css` (cleanup/remove)
- `tailwind.config.ts` (color + font overhaul)
- ~12 UI component files in `src/components/ui/`
- 5 layout/nav components
- ~18 page files
- 1 CodeBlock component

Total: ~38 files. Pure visual changes only — no logic, routes, or data modifications.

