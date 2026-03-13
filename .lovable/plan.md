

## Plan: Create Public Docs Page

The current `/docs` route is inside the protected dashboard. We need a public version accessible without login.

### Changes

1. **Create `src/pages/public/PublicDocsPage.tsx`**
   - Reuse the same content from `DocsPage` but remove the `ApiKeySelector` (requires auth) and hardcode a placeholder API key like `YOUR_API_KEY` in snippets
   - Wrap in `PublicLayout` styling (max-w-4xl, proper spacing)

2. **Update `src/App.tsx`**
   - Add route: `<Route path="/docs" element={<PublicLayout><PublicDocsPage /></PublicLayout>} />`
   - Place it in the public routes section (before the protected catch-all)

3. **Update `src/components/public/PublicNavbar.tsx`**
   - The "Docs" nav link already points to `/docs` — it will now resolve to the public page for unauthenticated users

4. **Dashboard `/docs` route** — keep as-is inside the protected area so logged-in users still get the interactive version with API key selector

