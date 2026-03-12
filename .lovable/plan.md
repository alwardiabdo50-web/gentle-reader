

## Fully Functional Credits System — Plan

### Current State

The system already has significant infrastructure:
- **Profile table** with `plan`, `monthly_credits`, `extra_credits`, `credits_used`, `current_period_start/end`
- **Usage ledger** tracking all credit changes
- **Billing shared module** (`getUserCredits`, `checkQuota`, `recordLedgerEntry`)
- **Scrape/crawl/extract endpoints** that charge credits and check quota
- **Stripe integration** for checkout, webhook, customer portal
- **UI pages** for billing and usage

### Gaps to Fix

1. **`checkout.session.completed` not handled** — First-time subscribers never get linked (no subscription row created from checkout metadata, so `get_user_by_stripe_customer` returns nothing for subsequent webhook events)
2. **Monthly grant ledger entry records `credits: 0`** instead of the actual grant amount
3. **Free plan credits never reset** — No mechanism resets `credits_used` for free users at period end
4. **No rate limiting enforcement** — `rpm` is defined in config but never checked
5. **No real-time credit balance in sidebar/header** — Users can't see remaining credits without navigating to Usage page
6. **Subscription upsert may fail** — `onConflict: "provider_subscription_id"` requires a unique constraint that may not exist
7. **No credit usage progress bar** on the billing page

### Implementation Plan

#### 1. Database Migration
- Add unique constraint on `subscriptions.provider_subscription_id` (needed for upsert)
- Create a `rate_limit_log` table or use in-memory approach for RPM tracking

#### 2. Fix Stripe Webhook — Handle `checkout.session.completed`
Update `supabase/functions/stripe-webhook/index.ts`:
- Add `checkout.session.completed` handler that creates the initial subscription row and links `provider_customer_id` to the user via `metadata.user_id` from the checkout session
- This ensures `get_user_by_stripe_customer` works for all subsequent events
- Fix `handleInvoicePaid` to record `credits: profile.monthly_credits` (positive grant) instead of `credits: 0`

#### 3. Add Rate Limiting to API Endpoints
Update `supabase/functions/_shared/billing.ts`:
- Add `checkRateLimit(userId: string, rpm: number)` function that queries recent usage_ledger entries within the last 60 seconds
- Apply in scrape, crawl, extract, and map endpoints before processing

#### 4. Free Plan Credit Reset
Create `supabase/functions/reset-free-credits/index.ts`:
- A cron-invokable function that finds free-plan profiles where `current_period_end < now()`
- Resets `credits_used = 0` and advances the period by 30 days
- Records a `monthly_grant` ledger entry

#### 5. Credit Balance in Dashboard Sidebar
Update `src/components/AppSidebar.tsx`:
- Show a small credit usage indicator (used/total) with a progress bar
- Subscribe to real-time changes on the `profiles` table for live updates

#### 6. Credit Usage Progress Bar on Billing Page
Update `src/pages/BillingPage.tsx`:
- Add a visual progress bar showing `credits_used / (monthly_credits + extra_credits)`
- Color-coded: green < 70%, yellow 70-90%, red > 90%

#### 7. Client-Side Credit Hook
Create `src/hooks/useCredits.ts`:
- Reusable hook that fetches and subscribes to credit balance
- Returns `{ plan, creditsUsed, creditsTotal, creditsRemaining, percentUsed, loading }`
- Used by both sidebar and billing page

### Files Changed

| File | Action |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Add `checkout.session.completed` handler, fix monthly grant |
| `supabase/functions/_shared/billing.ts` | Add `checkRateLimit()` function |
| `supabase/functions/scrape/index.ts` | Add rate limit check before quota check |
| `supabase/functions/crawl/index.ts` | Add rate limit check |
| `supabase/functions/extract/index.ts` | Add rate limit check |
| `supabase/functions/map/index.ts` | Add rate limit check |
| `supabase/functions/reset-free-credits/index.ts` | New — free plan credit reset |
| `src/hooks/useCredits.ts` | New — reusable credit balance hook with realtime |
| `src/components/AppSidebar.tsx` | Add credit usage indicator |
| `src/pages/BillingPage.tsx` | Add progress bar, use `useCredits` hook |
| DB migration | Add unique constraint on `subscriptions.provider_subscription_id` |

