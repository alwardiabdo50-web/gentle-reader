

## Plan: Add Admin Platform Settings Page

### Overview
Create a `/admin/settings` page where admins can manage platform-wide settings: SEO metadata, social media links, branding assets (favicon, logo, hero image), and a maintenance mode toggle. Settings are stored in a key-value table and consumed by public pages dynamically.

### 1. Database: Create `site_settings` table

```sql
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for SEO/maintenance on public pages)
CREATE POLICY "Public can read site settings"
  ON public.site_settings FOR SELECT TO public USING (true);
```

Seed initial rows:
- `seo` — `{ title, description, keywords, og_image }`
- `socials` — `{ twitter, github, linkedin, discord, youtube }`
- `branding` — `{ favicon_url, logo_url, hero_image_url }`
- `maintenance` — `{ enabled: false, message: "" }`

### 2. Storage: Create `branding` bucket
For uploading favicon, logo, and hero images. Public bucket so assets are served directly.

### 3. Edge Function: Add settings handlers to `admin-stats`

**GET** `?action=settings` — returns all rows from `site_settings`

**POST** `action: "settings-update"` — accepts `{ key, value }`, upserts the row (admin-only)

### 4. Hook: `useAdminData.ts` additions
- `useAdminSettings()` — query for `["admin", "settings"]`
- `useAdminSettingsMutations()` — mutation calling `settings-update`, invalidates cache

### 5. New Hook: `src/hooks/useSiteSettings.ts`
Public-facing hook that reads `site_settings` table directly via the client (public RLS). Used by `PublicLayout` and `index.html` equivalent components to apply SEO/maintenance dynamically.

### 6. New Page: `src/pages/admin/AdminSettingsPage.tsx`
Tabbed card layout with four sections:

- **SEO** — inputs for title, description, keywords, OG image URL
- **Social Media** — inputs for Twitter/X, GitHub, LinkedIn, Discord, YouTube URLs
- **Branding** — file upload fields for favicon, logo, hero image (upload to `branding` bucket, store URL in settings)
- **Maintenance** — toggle switch + message textarea

Each section has a Save button that calls the mutation.

### 7. Wire Up

- **`AdminLayout.tsx`** — add "Settings" nav item with `Settings` icon pointing to `/admin/settings`
- **`App.tsx`** — add route `<Route path="/settings" element={<AdminSettingsPage />} />`
- **`PublicLayout.tsx`** — consume `useSiteSettings` to:
  - Set `document.title` and meta tags from SEO settings
  - Show maintenance banner when enabled
  - Render social links in footer from socials settings
- **`PublicNavbar.tsx`** — use logo URL from branding settings if set

### Files Changed
- `supabase/functions/admin-stats/index.ts` (add settings GET + POST handlers)
- `src/hooks/useAdminData.ts` (add settings query + mutation)
- `src/hooks/useSiteSettings.ts` (new — public settings hook)
- `src/pages/admin/AdminSettingsPage.tsx` (new)
- `src/components/AdminLayout.tsx` (add nav item)
- `src/App.tsx` (add route)
- `src/components/public/PublicLayout.tsx` (consume settings)
- DB migration for `site_settings` table + `branding` storage bucket

