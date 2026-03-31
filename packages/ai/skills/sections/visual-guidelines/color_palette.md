## Color palette

We use a semantic system palette. Instead of picking raw colors yourself, **you must exclusively use the predefined classes and theme tokens**. Do not choose colors. Do not tune colors. Do not "improve" colors. The system already owns that decision.

### Non-negotiable rule

- Never write hex, rgb(), hsl(), oklch(), named colors, or custom gradients for normal UI/diagram styling.
- Never hand-author `fill`, `stroke`, `color`, `background`, or `border-color` values when a provided class or token exists.
- If you are about to pick a color, stop and apply the correct classname instead.

### Actual palette exposed by the app

These are the real palette families available from the shared styles:

- `default`
- `gray`
- `brown`
- `orange`
- `yellow`
- `green`
- `blue`
- `purple`
- `pink`
- `red`

For each family, the app exposes:

- `--color-text-{family}`
- `--color-bg-{family}`
- `--color-pill-{family}`

Examples:

- `var(--color-bg-red)`
- `var(--color-bg-purple)`
- `var(--color-bg-yellow)`
- `var(--color-text-blue)`
- `var(--color-pill-green)`

These come from the shared UI theme and already adapt for light and dark mode. Use them directly when you truly need a token. Do not invent adjacent shades.

### Pre-built Semantic SVG Classes

| Class | Ramp | Semantic Use |
|-------|------|--------------|
| `c-default` | Default | Neutral base, plain content |
| `c-gray` | Gray | Neutral/structural nodes (start, end, generic steps) |
| `c-brown` | Brown | Earthy, muted categories |
| `c-purple` | Purple | General categories, abstract concepts |
| `c-pink` | Pink | General categories |
| `c-blue` | Blue | Informational, primary actions |
| `c-green` | Green | Success states, organic physical properties |
| `c-yellow` | Yellow | Warning states, warm physical properties |
| `c-orange` | Orange | Warm physical properties, accent categories |
| `c-red` | Red | Danger/Error states |
| `c-black` | Foreground/Background contrast | Primary emphasis, binary states (on/off), contrasted nodes |
| `c-teal` | Alias to green tokens | Backward-compatible alias when older examples use teal |
| `c-amber` | Alias to yellow tokens | Backward-compatible alias when older examples use amber |
| `c-coral` | Alias to orange tokens | Backward-compatible alias when older examples use coral |

**How to assign colors**: Color should encode meaning, not sequence. Don't cycle through colors like a rainbow (step 1 = blue, step 2 = amber, step 3 = red...). Instead:
- Group nodes by **category** — all nodes of the same type share one color. E.g. in a vaccine diagram: all immune cells = purple, all pathogens = coral, all outcomes = teal.
- For illustrative diagrams, map colors to **physical properties** — warm ramps for heat/energy, cool for cold/calm, green for organic, gray for structural/inert.
- Use **gray for neutral/structural** nodes (start, end, generic steps).
- Use **2-3 colors per diagram**, not 6+. More colors = more visual noise. A diagram with gray + purple + teal is cleaner than one using every ramp.
- **Prefer purple, teal, coral, pink** for general diagram categories. Reserve blue, green, amber, and red for cases where the node genuinely represents an informational, success, warning, or error concept — those colors carry strong semantic connotations from UI conventions. (Exception: illustrative diagrams may use blue/amber/red freely when they map to physical properties like temperature or pressure.)

### Using Colors

- **In SVG:** Apply `c-{ramp}` to a `<g>` wrapping shape+text, or directly to a `<rect>`/`<circle>`/`<ellipse>`. Never to `<path>` — paths don't get ramp fill. Dark mode is automatic for ramp classes. Supported families: default, gray, brown, orange, yellow, green, blue, purple, pink, red. Compatibility aliases: `c-amber` maps to yellow, `c-coral` maps to orange, `c-teal` maps to green.
- **In CSS/HTML:** If you truly need color styling, use the matching theme tokens only: `var(--color-bg-{family})`, `var(--color-text-{family})`, and `var(--color-pill-{family})`. The real families are `default`, `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, and `red`.

The WidgetRenderer maps `c-{ramp}` to `var(--color-pill-{ramp})` for the stroke, and `var(--color-bg-{ramp})` for the fill. Therefore, simply applying the class is enough. You do not need custom light/dark mode logic, and you should not write any.

For status/semantic meaning in UI (success, warning, danger) use the system tokens. For categorical coloring in both diagrams and UI, use these ramps. Nothing else.

### Canvas palette

Canvas widgets should not hardcode one palette and hope it survives theme changes. Read colors from the theme contract exposed by `WidgetRenderer`:

- `window.avenireTheme`
- `window.addEventListener("avenire:themechange", ...)`
- CSS variables such as `--canvas-background`, `--canvas-text`, `--canvas-muted`, `--canvas-primary`, `--canvas-grid`

Use the current theme as the source of truth, then redraw the canvas whenever the theme changes. That keeps charts, simulations, and custom renderers readable in both modes.
