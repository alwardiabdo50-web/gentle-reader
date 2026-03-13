

## Plan: Unify credit data via `useCredits` hook

Both pages currently fetch credit data independently — `UsagePage` queries profiles/org directly, and `BillingPage` uses `useCredits` but *also* fetches credits separately into local state. This creates inconsistency.

### Changes

1. **`UsagePage.tsx`** — Replace the manual credit fetching logic (lines 116-133) with `useCredits()`. Remove local state for `totalCredits`, `plan`, and `stats.creditsUsed`. Use `credits.creditsUsed`, `credits.creditsTotal`, `credits.plan` from the hook instead.

2. **`BillingPage.tsx`** — Remove the duplicate credit fetching in the `useEffect` (lines 57-84). Use `credits.plan`, `credits.creditsRemaining` from the existing `useCredits()` call instead of local `currentPlan`/`creditsRemaining` state for display. Keep the `checkSubscription` call for Stripe-specific data (subscription status, period end).

This ensures both pages always show identical credit numbers sourced from the same reactive hook with realtime updates.

