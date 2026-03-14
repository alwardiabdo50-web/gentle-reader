

## Plan: Fix Settings Double-Serialization Bug

### Root Cause
The save flow double-serializes the value:
- `useAdminSettingsMutations` does `JSON.stringify(value)` → value becomes a string
- `postAdminAction` does `JSON.stringify(body)` → the string gets escaped again
- Edge function stores the string in the JSONB column as a string literal, not an object

### Fix (3 files + 1 DB cleanup)

**1. `src/hooks/useAdminData.ts`** — Remove the extra `JSON.stringify(value)` in `useAdminSettingsMutations`. Pass value as-is since `postAdminAction` already serializes the whole body.

**2. `supabase/functions/admin-stats/index.ts`** — In the `settings-update` handler, add a safety parse: if `value` arrives as a string, `JSON.parse()` it before upserting. This handles both old and new client code.

**3. `src/hooks/useSiteSettings.ts`** — Add resilience: if a setting value is a string instead of an object, try to `JSON.parse()` it. This handles any previously-corrupted data.

**4. Database migration** — Clean up the currently corrupted rows in `site_settings` by resetting them to proper default JSON objects.

### Files Changed
- `src/hooks/useAdminData.ts` (1 line)
- `supabase/functions/admin-stats/index.ts` (add JSON.parse safety)
- `src/hooks/useSiteSettings.ts` (add string-value parsing)
- DB migration to reset corrupted data

