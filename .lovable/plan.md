

## Plan: Feature Gating by Subscription Plan

### Feature Access Matrix

| Feature | Free | Hobby | Standard | Growth | Scale |
|---|---|---|---|---|---|
| Scrape, Crawl, Map | Yes | Yes | Yes | Yes | Yes |
| API Keys (max) | 2 | 5 | 10 | 25 | Unlimited |
| AI Extract | No | No | Yes | Yes | Yes |
| Organizations | No | No | Yes | Yes | Yes |
| Webhooks | No | Yes | Yes | Yes | Yes |
| Schedules | No | No | Yes | Yes | Yes |
| Pipelines | No | No | Yes | Yes | Yes |

### Implementation

**1. Create a plan limits config — `src/lib/plan-limits.ts`**

A single source of truth mapping each plan to its feature access and limits (max API keys, whether orgs/webhooks/schedules/pipelines/extract are enabled). All gating logic references this file.

**2. Create an upgrade prompt component — `src/components/UpgradeGate.tsx`**

A reusable wrapper component that checks the user's current plan against a required feature. If the user's plan doesn't include the feature, it renders an upgrade card (with the feature name and a "Upgrade" button linking to `/app/billing`) instead of the children. Used like:
```tsx
<UpgradeGate feature="webhooks">
  <WebhooksContent />
</UpgradeGate>
```

**3. Gate each feature page**

- **SchedulesPage.tsx** — Wrap content with `<UpgradeGate feature="schedules">`
- **WebhooksPage.tsx** — Wrap with `<UpgradeGate feature="webhooks">`
- **PipelinesPage.tsx** — Wrap with `<UpgradeGate feature="pipelines">`
- **OrgSwitcher.tsx** — Hide "Create Organization" button if orgs not available; show upgrade hint
- **ApiKeysPage.tsx** — Disable "Create" button when at max API key limit for plan; show limit info
- **PlaygroundPage.tsx** — Disable extract mode if plan doesn't include it

**4. Backend enforcement — edge functions**

Add plan checks in the following edge functions to reject requests from users whose plan doesn't allow the feature:
- `schedules-manage/index.ts` — Check plan before creating schedules
- `webhooks-manage/index.ts` — Check plan before creating webhooks
- `pipelines-manage/index.ts` — Check plan before creating pipelines
- `api-keys-manage/index.ts` — Check API key count limit
- `extract/index.ts` — Check plan before running extract

Each will query the user's profile plan, look up limits from a shared config, and return a `403` with an upgrade message if the feature is not available.

**5. Shared backend config — `supabase/functions/_shared/plan-limits.ts`**

Mirror of the frontend plan-limits config for server-side enforcement.

### Files Changed
- `src/lib/plan-limits.ts` (new)
- `src/components/UpgradeGate.tsx` (new)
- `supabase/functions/_shared/plan-limits.ts` (new)
- `src/pages/SchedulesPage.tsx` (wrap with gate)
- `src/pages/WebhooksPage.tsx` (wrap with gate)
- `src/pages/PipelinesPage.tsx` (wrap with gate)
- `src/pages/ApiKeysPage.tsx` (add limit check)
- `src/pages/PlaygroundPage.tsx` (disable extract for free/hobby)
- `src/components/OrgSwitcher.tsx` (hide create org for free/hobby)
- `supabase/functions/schedules-manage/index.ts` (add plan check)
- `supabase/functions/webhooks-manage/index.ts` (add plan check)
- `supabase/functions/pipelines-manage/index.ts` (add plan check)
- `supabase/functions/api-keys-manage/index.ts` (add limit check)
- `supabase/functions/extract/index.ts` (add plan check)

