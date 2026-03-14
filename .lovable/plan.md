

## Plan: Dynamic Color Palette Management in Platform Settings

### Overview
Add a "Theme" tab to the Admin Settings page with a full color palette editor for both light and dark modes. The palette is stored in the database via the existing `site_settings` key-value table and applied at runtime by injecting CSS variables, replacing the hardcoded values in `index.css`.

### Architecture

1. **Database**: Store palette as `site_settings` key `"theme"` with structure:
   ```json
   {
     "light": { "background": "40 6% 97%", "foreground": "240 6% 10%", ... },
     "dark": { "background": "240 6% 4%", "foreground": "40 14% 97%", ... }
   }
   ```

2. **CSS Variables become defaults**: Keep the current values in `index.css` as fallbacks, but the runtime theme applier overrides them.

3. **Runtime applier**: A new hook `useThemeColors` (consumed in `App.tsx` or `PublicLayout`) reads the `site-settings` query and injects the stored CSS variables into `:root` and `.dark` style rules via a `<style>` tag.

### Color Groups in the Editor

Organized into collapsible sections for clarity:

- **Core** (6): background, foreground, card, card-foreground, card-hover, radius
- **Brand** (4): primary, primary-foreground, ring, selection color  
- **Semantic** (6): destructive, destructive-foreground, success, warning, info, muted, muted-foreground
- **Surfaces** (6): secondary, secondary-foreground, accent, accent-foreground, popover, popover-foreground
- **Borders** (3): border, border-strong, input
- **Sidebar** (8): sidebar-background, sidebar-foreground, sidebar-primary, sidebar-primary-foreground, sidebar-accent, sidebar-accent-foreground, sidebar-border, sidebar-ring

Each variable gets:
- An HSL input field (e.g., `174 72% 50%`)
- A color swatch preview (converted HSL to hex for the native color picker)
- Side-by-side light/dark columns

### UI Features
- Toggle between editing Light and Dark palettes
- Live preview swatches next to each input
- "Reset to defaults" button per mode
- Color picker (native `<input type="color">`) with HSL conversion utility
- Import/Export JSON for the full palette

### Files to Change

| File | Change |
|------|--------|
| `src/pages/admin/AdminSettingsPage.tsx` | Add "Theme" tab with the palette editor UI |
| `src/hooks/useSiteSettings.ts` | Add `theme` to `SiteSettings` interface and defaults |
| `src/hooks/useThemeColors.ts` | **New** — reads theme from site settings, injects CSS variables into DOM |
| `src/App.tsx` | Call `useThemeColors()` to apply palette globally |
| `src/index.css` | No structural change — existing values serve as defaults when no DB override exists |

### Color Picker Implementation
- Native `<input type="color">` for visual picking (hex)
- HSL text input for precise control
- Utility functions: `hslStringToHex()` and `hexToHslString()` for conversion between the two formats
- These go in a small `src/lib/color-utils.ts` file

### No backend changes needed
The existing `site_settings` table + `settings-update` admin action already supports arbitrary key-value pairs. The `"theme"` key will be stored just like `"seo"` or `"branding"`.

