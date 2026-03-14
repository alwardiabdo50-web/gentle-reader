

## Project Audit: Findings and Cleanup Plan

### Issues Found

**1. Unused Files**
- `src/pages/Index.tsx` — Default Lovable placeholder page, not imported anywhere. Safe to delete.
- `src/App.css` — Contains only `/* Intentionally empty */`. No imports reference it... wait, let me verify.

**2. Broken Footer Links**
- `src/components/public/PublicFooter.tsx` lines 18-19: "Status" links to `"#"` instead of `"/status"`, "Changelog" links to `"#"` instead of `"/changelog"`. Both pages exist at those routes.

**3. Console Warnings (forwardRef)**
- `CtaSection` in `HomePage.tsx` and `PublicFooter` in `PublicLayout.tsx` produce React warnings: "Function components cannot be given refs." This is likely caused by parent components or routing internals trying to pass refs. Both components should be wrapped with `React.forwardRef` to silence these warnings.

**4. No Other Issues Found**
- All hooks are actively used (`useScrollReveal`, `useAdminData`, `usePlans`, etc.)
- All components are imported and used (`UpgradeGate`, `OnboardingWizard`, `PendingInvitationsBanner`)
- All lib files are referenced (`plan-limits`, `color-utils`, `api/scrape`)
- `src/integrations/lovable/index.ts` is auto-generated and used in `AuthPage`
- `src/components/ui/use-toast.ts` is a re-export shim (standard shadcn pattern) — keep
- Edge functions and shared helpers all look properly structured

### Changes

| File | Action |
|------|--------|
| `src/pages/Index.tsx` | **Delete** — unused placeholder |
| `src/App.css` | **Delete** — empty file, verify no import first |
| `src/components/public/PublicFooter.tsx` | Fix Status → `/status`, Changelog → `/changelog` |
| `src/pages/public/HomePage.tsx` | Wrap `CtaSection` with `forwardRef` to fix console warning |
| `src/components/public/PublicFooter.tsx` | Wrap with `forwardRef` to fix console warning |

This is a small, safe cleanup — no functional changes, just removing dead code and fixing broken links + warnings.

