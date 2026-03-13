

## Plan: Add Dark/Light Theme Toggle

The app has `next-themes` installed but no `ThemeProvider` wrapping the app and no toggle in the UI. Currently only dark mode CSS variables exist.

### Changes

**1. `src/index.css`** — Add a `.light` / `:root` light theme variable set inside the existing `@layer base` block. Light palette:
- Background: `#FAFAF9`, Foreground: `#18181B`
- Card: `#FFFFFF`, Card hover: `#F4F4F5`
- Sidebar: `#F4F4F5`, borders: `rgba(0,0,0,0.08)`
- Primary stays `#2DD4BF` (works on both themes)
- Move current dark values under `.dark` class

**2. `src/App.tsx`** — Wrap everything in `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>` from `next-themes`.

**3. `src/components/ThemeToggle.tsx`** — New component: a small button using `useTheme()` from `next-themes` that cycles between light/dark. Uses `Sun`/`Moon` icons from lucide-react. Ghost button style.

**4. `src/components/AppSidebar.tsx`** — Add the `ThemeToggle` in the sidebar footer, next to the user dropdown.

**5. `src/components/public/PublicNavbar.tsx`** — Add the `ThemeToggle` in the navbar actions area.

### Technical Notes
- `next-themes` with `attribute="class"` adds/removes `.dark` class on `<html>`, which Tailwind's `darkMode: "class"` picks up.
- Need to add `darkMode: "class"` to `tailwind.config.ts` if not already set.
- All hardcoded hex colors (e.g. `bg-[#111113]`, `text-[#52525B]`) across pages will need to be replaced with CSS variable-based classes to respond to theme changes. This is a larger follow-up task — the toggle will work immediately for all components using Tailwind theme tokens (`bg-card`, `text-foreground`, etc.), and hardcoded colors will appear as-is until migrated.

