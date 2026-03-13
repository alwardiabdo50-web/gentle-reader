

## Plan: Redesign Pricing Page and Update Plan Structure

### New Pricing Tiers (cheaper than Firecrawl)

Based on the Firecrawl reference (€0 / €14 / €72 / €290 / €522), here are the new tiers:

| Plan | Price | Credits | Rate Limit |
|------|-------|---------|------------|
| Free | $0/mo | 500 | 5 req/min |
| Hobby | $9/mo | 3,000 | 20 req/min |
| Standard | $49/mo | 25,000 | 100 req/min |
| Growth | $199/mo | 150,000 | 500 req/min |
| Scale | $399/mo | 500,000 | 1,000 req/min |
| Enterprise | Custom | Custom | Custom |

### Changes

#### 1. Redesign `src/pages/public/PricingPage.tsx`
Rebuild to match Firecrawl's layout from the screenshot:
- "Flexible pricing" header with subtitle
- 4 main plan cards in a row (Free, Hobby, Standard highlighted, Growth) with feature bullet lists
- Scale + Enterprise section below as wider cards
- "API Credits" comparison table section
- FAQ accordion section (Billing questions)
- Monthly/yearly toggle (yearly = 2 months free)

#### 2. Update `src/pages/BillingPage.tsx`
- Update the `plans` array to match new tier names and prices (free, hobby, standard, growth, scale)
- Update `PLAN_PRICES` mapping for Stripe price IDs (keep existing IDs as placeholders — user will need to create new Stripe products)

#### 3. Update `supabase/functions/create-checkout/index.ts`
- Update `PLAN_PRICES` to match new plan names (hobby, standard, growth, scale)

#### 4. Update `supabase/functions/customer-portal/index.ts`
- No changes needed (portal is generic)

### Technical Notes
- The Stripe price IDs in `PLAN_PRICES` will need to be updated once new products are created in Stripe. The current IDs will be kept as placeholders mapped to the new plan names.
- FAQ section will use the existing Accordion component.
- Yearly pricing will show discounted amounts (2 months free).

