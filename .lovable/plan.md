

## Plan: Update Homepage Pricing Section to Use Dynamic Plans

The homepage pricing section currently uses hardcoded plan data. The dedicated Pricing page already fetches plans dynamically from the database via `usePlans()`. This update will align the homepage pricing teaser with the same approach.

### Changes to `src/pages/public/HomePage.tsx`

1. Import `usePlans` hook and `Skeleton` component
2. Replace the hardcoded `plans` array in `PricingTeaser` with data from `usePlans()`
3. Render dynamic fields: `name`, `monthly_price`, `monthly_credits`, `display_features`, `cta_text`, `highlighted`
4. Add a loading skeleton state while plans load
5. Format credits with `toLocaleString()` for comma separators (e.g. "25,000 credits/mo")
6. Keep the "Scale & Enterprise" footer text and "View full pricing" link

### Files Changed
- `src/pages/public/HomePage.tsx`

