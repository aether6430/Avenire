## Theme and color contract

The model must not invent a palette. Never write hex, RGB, HSL, Tailwind color literals, white/black panel colors, or hardcoded light/dark colors.

- Use provided utility classes for surfaces, controls, selected states, chart marks, and semantic states.
- Use `currentColor` inside SVG. Every SVG `<text>` must use the documented text class.
- Use series utilities/tokens only for meaningful persistent series, categories, or status identity. Keep mappings stable.
- Use series color on marks and legend swatches, never on labels or values. Pair color with text, shape, position, or line style.
- Keep structural lines, inactive marks, grids, and borders neutral and thin. Keep large-area fills subtle.
- Use the utility-selected state for pressed/selected controls; do not repaint controls in widget code.

### Canvas contract

The host exposes theme variables to raw canvas widgets, including `--background`, `--foreground`, `--card`, `--muted`, `--muted-foreground`, `--border`, `--input`, `--primary`, `--primary-foreground`, `--accent`, and `--ring`. Read them through utility classes or `var(...)` only when the canvas contract requires it; do not choose replacement values.

### SVG contract

Use the host SVG classes `t`, `ts`, `th`, `box`, `node`, `arr`, `leader`, and semantic ramp classes where supplied. Do not write a `<style>` block to define a new color system.
