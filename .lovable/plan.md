

## Plan: Public API Changelog Page

A static `/changelog` page listing API changes, new features, and deprecations in a clean timeline format. Entries are hardcoded in the component (no database needed) — easy to update by editing an array.

### What Gets Built

**New file: `src/pages/public/ChangelogPage.tsx`**
- Timeline-style layout with entries grouped by date
- Each entry has: date, version tag, title, description, and a category badge (Feature / Improvement / Deprecation / Fix)
- Badge colors: green for Feature, blue for Improvement, amber for Deprecation, red for Fix
- Seed with 5-6 sample entries covering scrape, crawl, extract, map endpoints
- Follows the same page structure as other public pages (max-w-6xl, consistent typography)

**Modified: `src/App.tsx`**
- Add route: `<Route path="/changelog" element={<PublicLayout><ChangelogPage /></PublicLayout>} />`

**Modified: `src/components/public/PublicNavbar.tsx`**
- Add "Changelog" to `navLinks` array

**Modified: `src/components/public/PublicFooter.tsx`**
- Add "Changelog" link under the Resources section

### Files Changed
- `src/pages/public/ChangelogPage.tsx` (new)
- `src/App.tsx`
- `src/components/public/PublicNavbar.tsx`
- `src/components/public/PublicFooter.tsx`

