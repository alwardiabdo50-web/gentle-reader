

## Plan: Guided First-Run Onboarding Experience

A step-by-step onboarding wizard that appears for new users (no API keys, no jobs) and walks them through: creating an API key → running their first scrape → understanding credits.

### How It Works

Track onboarding state in a `profiles` column (`onboarding_completed`, boolean, default false). When the user lands on `/app` and `onboarding_completed` is false AND they have 0 API keys and 0 jobs, show a full-page onboarding wizard instead of the normal Overview.

### Onboarding Steps (3 steps)

**Step 1 — Create Your API Key**
- Explain what API keys are for
- Inline "Create Key" form (name input + button) — same logic as `ApiKeysPage`
- Show the generated token with copy button and warning
- "Next" button enabled once key is created

**Step 2 — Run Your First Scrape**
- Pre-filled URL input (e.g. `https://example.com`)
- "Run Scrape" button that calls the scrape function using the just-created key
- Show a simplified result preview (title, word count, snippet of markdown)
- Highlights "1 credit used" to introduce the concept

**Step 3 — Understand Your Credits**
- Visual credit bar showing current usage (reuse `useCredits`)
- Brief explanation: plan name, monthly credits, what costs credits (link to pricing)
- "Go to Dashboard" button that sets `onboarding_completed = true` and navigates to Overview

### Database
- Add `onboarding_completed` (boolean, default false) to `profiles` table

### Frontend Files

**New: `src/components/OnboardingWizard.tsx`**
- Multi-step component with progress indicator (dots or step bar)
- Steps 1-3 as described above
- Uses existing `supabase` client for key creation and scrape invocation
- Calls `useCredits` for step 3

**Modified: `src/pages/OverviewPage.tsx`**
- Check `onboarding_completed` from profiles
- If false + 0 API keys + 0 jobs → render `<OnboardingWizard />` instead of normal dashboard
- Pass `onComplete` callback that updates profile and switches to normal view

### Files Changed
- New migration: add `onboarding_completed` boolean to `profiles`
- `src/components/OnboardingWizard.tsx` (new) — the 3-step wizard
- `src/pages/OverviewPage.tsx` — conditionally show wizard for new users

