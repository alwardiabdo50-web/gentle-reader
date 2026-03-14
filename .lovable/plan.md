

## Plan: Add Strikethrough Pricing to Plans

Add an optional "original price" field to each plan so the pricing page can show a crossed-out higher price next to the actual price (e.g. ~~$59~~ $49/mo).

### Database
- Add `original_monthly_price` (integer, nullable, default null) and `original_yearly_price` (integer, nullable, default null) columns to the `plans` table. When set, these display as strikethrough prices.

### Backend
- Update `admin-stats` edge function's `plan-update` and `plan-create` actions to accept the two new fields.

### Frontend

**AdminPlansPage.tsx** — Add two new inputs ("Original Monthly Price" and "Original Yearly Price") in the edit/create dialog next to the existing price fields. Include helper text like "Leave empty to hide strikethrough".

**usePlans.ts** — Add `original_monthly_price` and `original_yearly_price` to the `Plan` interface.

**PricingPage.tsx** — When `original_monthly_price` or `original_yearly_price` is set, render it as a crossed-out price before the real price:
```tsx
{originalPrice > 0 && (
  <span className="text-lg text-muted-foreground line-through mr-2">
    ${originalPrice}
  </span>
)}
<span className="text-3xl font-bold">${price}</span>
```

Apply same pattern to the bottom plans section.

### Files Changed
- New migration: add two nullable columns
- `src/hooks/usePlans.ts` — extend Plan interface
- `src/pages/public/PricingPage.tsx` — render strikethrough
- `src/pages/admin/AdminPlansPage.tsx` — add original price inputs + include in payload
- `supabase/functions/admin-stats/index.ts` — pass new fields through on create/update

