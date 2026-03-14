

## Plan: Fix Dark Mode Color Contrast Across Entire Project

The dark mode palette has several low-contrast variables that make text hard to read on dark surfaces. This is a CSS-only fix — updating variables in `src/index.css`.

### Problems
- `--muted-foreground: 240 5% 34%` — way too dark (34% lightness on 4-10% backgrounds). This is used everywhere for secondary text, labels, descriptions, table headers, helper text.
- `--border: 0 0% 100% / 0.07` and `--border-strong: 0 0% 100% / 0.12` — borders are barely visible.
- `--input: 0 0% 100% / 0.12` — input borders hard to distinguish.
- `--card: 240 6% 10%` and `--card-hover: 240 6% 13%` — cards blend into background, low separation.

### Changes (single file: `src/index.css`)

Updated dark mode variables:

| Variable | Old | New | Why |
|---|---|---|---|
| `--muted-foreground` | `240 5% 34%` | `240 5% 55%` | Secondary text readable |
| `--border` | `0 0% 100% / 0.07` | `0 0% 100% / 0.10` | Borders more visible |
| `--border-strong` | `0 0% 100% / 0.12` | `0 0% 100% / 0.16` | Strong borders clearer |
| `--input` | `0 0% 100% / 0.12` | `0 0% 100% / 0.16` | Input fields distinguishable |
| `--card` | `240 6% 10%` | `240 6% 11%` | Slightly more card lift |
| `--card-hover` | `240 6% 13%` | `240 6% 15%` | Better hover feedback |
| `--accent` | `240 6% 13%` | `240 6% 15%` | Accent surfaces more visible |
| `--sidebar-border` | `0 0% 100% / 0.07` | `0 0% 100% / 0.10` | Sidebar borders match |

### Files Changed
- `src/index.css` — Update 8 CSS variables in the `.dark` block

