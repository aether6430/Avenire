## Color palette

## Color palette

We use a Notion-inspired semantic color palette. Instead of picking raw hex codes for fills and strokes, **you must exclusively use the predefined semantic CSS classes** which automatically adapt perfectly to both light and dark mode.

### Pre-built Semantic SVG Classes

| Class | Ramp | Semantic Use |
|-------|------|--------------|
| `c-purple` | Purple | General categories, abstract concepts |
| `c-teal` | Teal | General categories, outcomes |
| `c-pink` | Pink | General categories |
| `c-blue` | Blue | Informational, primary actions |
| `c-green` | Green | Success states, organic physical properties |
| `c-amber` | Amber | Warning states, heat/energy |
| `c-red` | Red | Danger/Error states, extreme heat |
| `c-coral` | Coral | General categories, pathogens |
| `c-gray` | Gray | Neutral/structural nodes (start, end, generic steps) |
| `c-black` | Black | Primary emphasis, binary states (on/off), contrasted nodes |

**How to assign colors**: Color should encode meaning, not sequence. Don't cycle through colors like a rainbow (step 1 = blue, step 2 = amber, step 3 = red...). Instead:
- Group nodes by **category** — all nodes of the same type share one color. E.g. in a vaccine diagram: all immune cells = purple, all pathogens = coral, all outcomes = teal.
- For illustrative diagrams, map colors to **physical properties** — warm ramps for heat/energy, cool for cold/calm, green for organic, gray for structural/inert.
- Use **gray for neutral/structural** nodes (start, end, generic steps).
- Use **2-3 colors per diagram**, not 6+. More colors = more visual noise. A diagram with gray + purple + teal is cleaner than one using every ramp.
- **Prefer purple, teal, coral, pink** for general diagram categories. Reserve blue, green, amber, and red for cases where the node genuinely represents an informational, success, warning, or error concept — those colors carry strong semantic connotations from UI conventions. (Exception: illustrative diagrams may use blue/amber/red freely when they map to physical properties like temperature or pressure.)

### Using Colors

- **In SVG:** Apply `c-{ramp}` to a `<g>` wrapping shape+text, or directly to a `<rect>`/`<circle>`/`<ellipse>`. Never to `<path>` — paths don't get ramp fill. For colored connector strokes use inline `stroke="var(--color-border-...)"` variables. Dark mode is automatic for ramp classes. Available: c-gray, c-blue, c-red, c-amber, c-green, c-teal, c-purple, c-coral, c-pink.
- **In CSS/HTML:** Use the matching CSS variables: `var(--color-bg-{ramp})`, `var(--color-border-{ramp})`, `var(--color-text-{ramp})`, and `var(--color-pill-{ramp})`.

The WidgetRenderer maps `c-{ramp}` to `var(--color-pill-{ramp})` for the stroke, and `var(--color-bg-{ramp})` for the fill. Therefore, simply applying the class is enough. You never need to worry about creating your own light/dark mode color logic!

For status/semantic meaning in UI (success, warning, danger) use CSS variables. For categorical coloring in both diagrams and UI, use these ramps.
