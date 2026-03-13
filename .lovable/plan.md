

## Plan: Sync Pricing Across Homepage and Billing Page

### Problem
The homepage "Simple, transparent pricing" section still shows outdated plans (Free $0, Starter $29, Growth $99) that don't match the current tiers (Free, Hobby $9, Standard $49, Growth $199, Scale $399).

### Changes

#### 1. Update `src/pages/public/HomePage.tsx` — PricingTeaser section
- Replace the old `plans` array (lines 174-178) with the current tiers: **Free ($0)**, **Hobby ($9)**, **Standard ($49, highlighted)**, **Growth ($199)**
- Update features lists to match `PricingPage.tsx`
- Update credits text to match (500, 3,000, 25,000, 150,000)
- Add "Scale" and "Enterprise" mention below the cards with link to /pricing
- Keep the existing layout style (3-4 card grid)

#### 2. Update `src/pages/BillingPage.tsx` — Plan cards grid
- Currently shows 5 plans in a `lg:grid-cols-4` grid which doesn't fit well
- Change to `lg:grid-cols-5` or show Scale plan separately as a wider card below the main 4
- Minor layout polish: ensure all 5 plans display cleanly

### No backend changes needed — purely UI sync.

