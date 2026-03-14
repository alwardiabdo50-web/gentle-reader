

## Plan: Animated Grid Pattern Hero Background

Replace the static blur blob with an advanced animated dot grid pattern that subtly pulses and has a teal radial glow emanating from the center — matching the dark aesthetic from the screenshot.

### Approach

**New component: `src/components/public/HeroBackground.tsx`**
- Canvas-based animated dot grid pattern using `useEffect` + `useRef`
- Dots arranged in a grid, with opacity modulated by distance from center (radial falloff)
- Subtle floating animation: dots gently pulse/breathe in opacity using sine waves with randomized phase offsets
- Teal radial gradient overlay behind the grid for the ambient glow effect
- Fully responsive — recalculates on resize
- Uses `requestAnimationFrame` for smooth 60fps animation
- `pointer-events-none` so it doesn't interfere with content

**Modified: `src/pages/public/HomePage.tsx`**
- Import and render `<HeroBackground />` inside the hero section, replacing the static blur div
- Keep the existing content untouched

### Visual Effect
- ~40px spaced dot grid across the full hero
- Each dot is a small circle (1-2px radius), teal-tinted, low opacity
- Center has a brighter radial glow that fades out
- Dots near the center are brighter, edges fade to near-invisible
- Gentle sine-wave breathing animation on dot opacity

### Files Changed
- `src/components/public/HeroBackground.tsx` (new)
- `src/pages/public/HomePage.tsx`

