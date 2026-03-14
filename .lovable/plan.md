

## Plan: Add Scroll-Triggered Animations to Homepage Cards

### Approach

Create a reusable `useScrollReveal` hook using the Intersection Observer API, then apply it to all card/grid sections on the homepage. Cards will fade-in and slide up with staggered delays as they enter the viewport.

### New File: `src/hooks/useScrollReveal.ts`
- Custom hook that returns a `ref` callback
- Uses `IntersectionObserver` with a threshold (~0.15) to detect when elements enter the viewport
- Adds a CSS class (e.g., `revealed`) when visible, triggering the animation
- Supports configurable delay for stagger effects

### Changes to `src/index.css`
Add scroll-reveal utility classes:
- `.scroll-reveal` — initial state: `opacity: 0; transform: translateY(24px)`
- `.scroll-reveal.revealed` — animated state: `opacity: 1; transform: translateY(0)` with a smooth cubic-bezier transition (~0.5s)
- CSS custom property `--reveal-delay` for per-card stagger

### Changes to `src/pages/public/HomePage.tsx`
Apply scroll-reveal to cards in these sections:
- **FeaturesSection** — each feature card gets staggered reveal (delay based on index)
- **ApiExampleSection** — the two code blocks
- **WorkflowSection** — the 4 step cards
- **UseCasesSection** — the 4 use case cards
- **PricingTeaser** — the 4 pricing cards
- **TrustSection** — the 4 trust point cards

Each card gets `className="scroll-reveal"` and `style={{ transitionDelay: `${index * 80}ms` }}` plus a `ref` from the hook.

### Files Changed
- `src/hooks/useScrollReveal.ts` (new)
- `src/index.css`
- `src/pages/public/HomePage.tsx`

