

## Plan: Show Dashboard Link Instead of Login/Signup When Authenticated

The `PublicNavbar` doesn't check auth state — it always shows "Log in" and "Get Started Free" buttons regardless of whether the user is signed in.

### Changes

**`src/components/public/PublicNavbar.tsx`**:
- Import `useAuth` from `AuthContext`
- Read `session` from auth context
- When `session` exists: replace "Log in" / "Get Started Free" with a single "Dashboard" button linking to `/jobs` (or the default dashboard route)
- Apply the same logic to the mobile menu section
- Keep `ThemeToggle` visible in both states

