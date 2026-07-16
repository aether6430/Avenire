# Visualize — Avenire visual-guidelines draft

Create a visual when it materially improves understanding or decision-making. Keep it focused: lead with the visual signal, use only relevant controls, and avoid decorative panels, invented scores, duplicate legends, and card grids that do not explain the data.

## Choose the output

- Use `show_widget` with `type: "spec"` when the artifact is naturally represented by existing primitives such as sections, cards, stats, tables, progress, callouts, or simple charts.
- Use `type: "code"` for custom SVG, canvas, simulations, maps, controls, animation, or chart behavior that primitives cannot express.
- Do not force either mode. Schema consistency is useful when it reduces work, but visual clarity and required interaction take priority.
- For static labeled structures, Mermaid is acceptable only when the host surface explicitly supports it. Otherwise use the Avenire SVG rules below.

## Composition

- Start with the plot, map, diagram, or dominant visual. Put values and takeaways on marks, axes, annotations, or one compact selected-state detail.
- Use `.card` only for a necessary bounded summary or selected-item detail. Never nest cards or wrap the whole visualization in card chrome.
- Use `.viz-stat` for a label, value, and at most one short delta; use `.viz-grid` only for 2–3 peer metrics or choices.
- Use `.viz-row` for wrapping related values or actions; use `.viz-controls` for controls affecting the same visual.
- Use `.viz-badge` for display-only status/category accents, never as a button.
- Use `.btn`, `.btn-primary`, `.btn-ghost`, and `.btn-block` for actions; use native `button`, `input`, `select`, and `textarea`.
- Use `.form-label`, `.form-check`, `.form-switch`, `.form-control`, `.form-select`, and `.form-range` rather than recreating controls.
- Keep presentation-only state local. For a deliberate drill-down, use `window.openai.sendFollowUpMessage({ prompt, title })` and include the selected values.

## Accessibility and responsiveness

- Use semantic HTML, native tab order, keyboard-accessible controls, concise labels, and browser focus styles. Never add `tabindex` or override focus styles.
- Give every chart, SVG, canvas, and widget an accessible name or description using a role, `<title>`, `<desc>`, fallback text, or `.sr-only`.
- Pair color with labels, shape, position, or line style. Meaning must not depend on color alone.
- Design for 736px down to 320px. Reflow with wrapping or stacking; reserve space for the longest label.
- Avoid fixed outer widths, horizontal overflow, internal scrolling, `position: fixed`, and viewport-height layouts. The host sizes the frame to in-flow content.
- Keep text, marks, controls, cards, and dynamic content free of clipping and overlap at every supported width.
- Use `.text-small` only for secondary annotations and `.text-muted` only for non-essential context. Never go below 11px.

## Theme and utility discipline

- Use host utility classes for geometry, surfaces, controls, typography, and interaction. Do not add custom component skins, borders, radii, shadows, gradients, or pseudo-element states.
- Do not provide the model with a hand-authored color palette. Never write hex, RGB, HSL, Tailwind color literals, or hardcoded light/dark colors.
- Use the provided utility classes and semantic theme tokens only where the host utility contract requires them. Use `currentColor` inside SVG.
- Use series utilities/tokens only for meaningful persistent series or status identity. Keep structural lines and inactive marks neutral and thin.
- Use series colors on marks and legend swatches, not on labels or values. Keep mappings stable and large-area fills subtle.

## Charts and maps

- Label axes, units, important values, and chart meaning. Use a tooltip only when direct labels would be less clear; mirror important tooltip data in a keyboard-visible fallback.
- Animate transitions between data states, not initial appearance. Never loop chart motion and honor `prefers-reduced-motion`.
- For named numeric data, do not add KPI rows, controls, cards, or panels unless requested or necessary to explain the behavior.
- For timelines and parallel work, use aligned lanes on one time axis. For distributions or multi-metric comparisons, prefer shared-scale facets or small multiples and show requested dimensions together.
- Let maps dominate. Use verified published GeoJSON/TopoJSON and project longitude/latitude with `d3-geo`; never guess or hand-draw geographic outlines unless a schematic map is requested. Include the verified geometry in the final HTML and inspect it for blank basemaps, failed imports, missing labels, and unprojected points.

## SVG rules

- Use `<svg width="100%" viewBox="0 0 680 H">`; keep content inside x=40..640 and calculate H from the lowest element plus 20–40px padding.
- Never use negative coordinates. Check rightmost and bottommost geometry, text-anchor overflow, and at least 20px horizontal / 32px vertical peer spacing.
- Every `<text>` gets `class="t"`, `class="ts"`, or `class="th"`; use 14px labels and 12px secondary text only. Explicitly wrap SVG text with `<tspan>` when needed.
- Use the host SVG classes such as `.box`, `.node`, `.arr`, `.leader`, and semantic utility classes. Do not write color styles or filters.
- Include the standard arrow marker when connectors need arrows. Keep connectors orthogonal where possible and never overlap boxes.
- One SVG per widget. No abandoned or partial SVG output.

## Physics and simulations

- Make the dominant simulation readable before interaction. Use compact controls, one primary visual, and only the live values needed to understand the behavior.
- Keep simulation geometry and collision geometry identical. Every drawn collider must participate in collision handling; resolve overlap and prevent bodies from remaining inside colliders.
- Use measured responsive layout, not fixed canvas dimensions. Redraw when the host theme or container size changes; use `ResizeObserver` where appropriate.
- Cap animation work, clean up timers/listeners, pause when hidden where possible, and honor reduced motion. Do not use perpetual decorative motion.
- Prefer a stable deterministic initial state and make parameter changes visibly affect the relevant marks, labels, or readouts.

## Streaming and runtime

- Stream useful structure early: short `<style>` first, content next, scripts last. Avoid comments, hidden sections, loading-like dimming, gradients, blur, glow, and shadows that flash during DOM updates.
- For CDN scripts, use a named initializer and `onload="initChart()"`; keep a fallback `if (window.Chart) initChart()` when applicable. Do not assume a later script has loaded.
- Keep widgets under 2 MB, reduce precision, bin, downsample, or remove unused data. Never use `fetch`, XHR, WebSocket, or other API calls from the widget.
- No nested scrolling. Do not use `position: fixed`; overlays must remain in normal flow and contribute height.
- Current canvas CSP permits inline scripts plus resources from `cdnjs.cloudflare.com`, `esm.sh`, `cdn.jsdelivr.net`, and `unpkg.com`. `connect-src` is `none`; do not depend on network requests. Other origins, frames, objects, forms, and active embedding are not allowed.
- For raw HTML, write a literal fragment with a unique root ID. Do not use `document.currentScript` to find the root. For standalone export, preserve the fragment as source and render it through the project renderer.

## Final check

- Is the main signal visible without explanatory prose?
- Are controls necessary, native, labeled, and keyboard accessible?
- Does it fit from 736px to 320px without clipping or scrolling?
- Are all colors utility/theme-derived and all meanings redundant with text or shape?
- Does the visual remain correct during streaming, theme changes, resize, and reduced motion?
