

## Plan: Fix All Broken Links on Public Pages

### Issues Found

**Navbar (`PublicNavbar.tsx`)**
- All nav links use `<a href>` instead of `<Link to>`, causing full page reloads for internal routes (`/pricing`, `/docs`, `/status`, `/changelog`, `/contact`). Only `#features` should remain as `<a href>`.

**Footer (`PublicFooter.tsx`)**
- `#features` link won't work when navigating from non-home pages — needs to be `/#features`
- "Dashboard" link points to `/` (home page) instead of `/app`
- `/privacy` and `/terms` have no routes — these lead to blank pages

**HomePage (`HomePage.tsx`)**
- All links are correct (uses `<Link to>` properly)

---

### Changes

**1. `src/components/public/PublicNavbar.tsx`**
- Render internal route links (`/pricing`, `/docs`, etc.) with `<Link to>` instead of `<a href>`
- Keep `#features` as `<a href>` since it's an anchor on the current page
- Apply same fix in the mobile menu

**2. `src/components/public/PublicFooter.tsx`**
- Change `#features` to `/#features` so it works from any page
- Change Dashboard href from `/` to `/app`

**3. New pages: `src/pages/public/PrivacyPage.tsx` and `src/pages/public/TermsPage.tsx`**
- Simple placeholder pages with standard headings and placeholder legal text
- Follow the same structure as other public pages

**4. `src/App.tsx`**
- Add routes for `/privacy` and `/terms` inside `PublicLayout`

### Files Changed
- `src/components/public/PublicNavbar.tsx`
- `src/components/public/PublicFooter.tsx`
- `src/pages/public/PrivacyPage.tsx` (new)
- `src/pages/public/TermsPage.tsx` (new)
- `src/App.tsx`

