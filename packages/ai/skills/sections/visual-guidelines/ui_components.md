## Utility components

Use host utilities for geometry, surfaces, controls, typography, and interaction. Do not add custom component skins, borders, radii, shadows, gradients, or pseudo-element states.

### Layout and surfaces

- `.card`: the only card-like surface. Use it for a necessary bounded summary, selected item, or interactive field. Keep charts, maps, diagrams, tables, controls, and the whole visualization transparent and unframed.
- `.viz-stat`: one muted label, one `.viz-stat-value`, and at most one short context/delta line.
- `.viz-grid`: peer metrics or choices. Keep groups to 2–3 columns at 736px and stack at narrow widths.
- `.viz-row`: wrapping horizontal group for related values or inline actions.
- `.viz-tile`: selectable dense-grid `.btn`; it stretches to its cell and uses the utility-selected state. Do not add another border, outline, shadow, or pressed rule.
- `.viz-badge`: compact display-only status/category accent; never use it as a button.

### Controls

- Use native `button`, `input`, `select`, and `textarea` with `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-block`, `.form-label`, `.form-check`, `.form-switch`, `.form-control`, `.form-select`, and `.form-range` where provided by the host.
- Use `.viz-controls` as a wrapping row for controls affecting the same visual. Keep fields to two columns at most and stack them when narrow.
- Use visible labels for icon-only controls through `aria-label`; keep native focus styles and tab order.
- Keep filters, selections, and presentation-only interactions local. Use `window.openai.sendFollowUpMessage` only for an explicit investigation or explanation request.

### Text and numbers

- Use `.text-small` only for secondary labels and `.text-muted` only for non-essential context. Never go below 11px.
- Use `.text-destructive` only for actionable errors. Use `.sr-only` for accessible descriptions and keyboard fallbacks.
- Round every displayed number; use sensible integer, decimal, percentage, or currency precision.

### Examples

For concrete compositions, load the relevant examples from `examples/` only when needed. Do not copy incidental spacing or content from an example when the user’s artifact differs.
