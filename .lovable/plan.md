

## Plan: Move Dashboard to `/app/*`, Home Page to `/`

### Changes

#### 1. `src/App.tsx`
- Change `/home` route to `/` for HomePage
- Change dashboard catch-all from `/*` to `/app/*`
- All nested dashboard routes stay relative (no change needed inside)

#### 2. `src/components/ProtectedRoute.tsx`
- Change unauthenticated redirect from `/home` to `/`

#### 3. `src/components/public/PublicNavbar.tsx`
- Change logo link from `/home` to `/`

#### 4. `src/components/AppSidebar.tsx`
- Prefix all sidebar nav URLs with `/app` (e.g. `/playground` → `/app/playground`, `/billing` → `/app/billing`)
- Update footer dropdown links (`/settings`, `/billing`) to `/app/settings`, `/app/billing`

#### 5. `src/pages/OverviewPage.tsx`
- Prefix internal links with `/app` (`/playground` → `/app/playground`, `/api-keys` → `/app/api-keys`, `/docs` → `/app/docs`)
- Update usage/jobs href references in stat cards

#### 6. `src/pages/public/PublicDocsPage.tsx`
- Change `/api-keys` link to `/app/api-keys`

#### 7. `src/pages/public/HomePage.tsx`
- Change `/docs` link to `/app/docs` (or keep as public `/docs` if that's the intended target — the public docs route stays at `/docs`)

#### 8. `src/components/AdminProtectedRoute.tsx`
- If it redirects to `/`, update to redirect to `/app` instead (for authenticated non-admin users)

This moves all authenticated dashboard routes under `/app/*` and makes `/` the public landing page.

