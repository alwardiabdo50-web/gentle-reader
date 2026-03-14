

## Plan: Add Mouse-Follow Glow to Hero Dot Grid

### Approach

Update `src/components/public/HeroBackground.tsx` to track mouse position over the canvas and boost the brightness/size of dots within a radius (~150px) of the cursor.

### Changes to `src/components/public/HeroBackground.tsx`

1. Add a `mouseRef` to track cursor position (default off-screen so no glow when mouse isn't over the hero)
2. Add `mousemove` and `mouseleave` event listeners on the canvas
3. In the `draw` loop, for each dot calculate distance to cursor — if within the glow radius (~150px), boost alpha and slightly increase dot radius using a smooth falloff (e.g. `1 - dist/radius`)
4. The glow effect multiplier will brighten dots up to ~3x their base alpha and increase radius up to ~2.5x

### Visual Effect
- A soft circular "spotlight" follows the mouse cursor
- Dots smoothly brighten and grow as the cursor approaches
- When the mouse leaves the hero, the effect disappears gracefully

### Files Changed
- `src/components/public/HeroBackground.tsx`

