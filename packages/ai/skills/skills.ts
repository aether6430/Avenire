// This file is generated. Do not edit by hand.
// Run: bun packages/ai/skills/scripts/generator.ts

export type SkillSection =
  | "agent-guidelines"
  | "study-guidelines"
  | "visual-guidelines";

export type SkillDefinition = {
  id: string;
  title: string;
  description: string | null;
  section: SkillSection;
  path: string | null;
  content: string;
  sourceIds?: readonly string[];
};

export const SKILL_MAP = {
  "art": {
    id: "art",
    title: "Art",
    description: "Visual generation guidelines bundle for art.",
    section: "visual-guidelines",
    path: null,
    content: `# Imagine — Visual Creation Suite

## Modules
Call \`visualize_read_me\` with only the relevant visual modules. Use \`chart\` for quantitative data, \`diagram\` for static structures, \`interactive\` for controls, \`physics\` for simulations, \`mockup\` for app-like surfaces, and \`art\` for non-analytical illustration.
- \`diagram\` — SVG flowcharts, structural diagrams, illustrative diagrams
- \`mockup\` — UI mockups, forms, cards, dashboards. Prefer \`widget.type: "spec"\` primitives unless pixel-specific HTML is required.
- \`interactive\` — interactive explainers with controls. Prefer \`widget.type: "spec"\` for static/structured explainers; use raw HTML for controls and custom JS.
- \`chart\` — charts and data analysis. Use \`widget.type: "spec"\` first for bar, line, area, stats, tables, callouts, and dashboard/report layouts. Raw Chart.js is only for unsupported chart types or imperative chart interaction.
- \`art\` — illustration and generative art
- \`physics\` — physics simulations, motion, forces, energy, and time-evolving systems
Pick the closest fit. Each module includes the relevant design guidance.

Use \`show_widget\` when a visual materially improves the answer. Choose \`spec\` when the existing primitives clearly fit; choose \`code\` when custom drawing or interaction is required. Plain markdown is fine when a structured canvas would not improve scanning.

**Complexity budget — hard limits:**
- Box subtitles: ≤5 words. Detail goes in click-through (\`sendPrompt\`) or the prose below — not the box.
- Colors: ≤2 ramps per diagram. If colors encode meaning (states, tiers), add a 1-line legend. Otherwise use one neutral ramp.
- Horizontal tier: ≤4 boxes at full width (~140px each). 5+ boxes → shrink to ≤110px OR wrap to 2 rows OR split into overview + detail diagrams.

If you catch yourself writing "click to learn more" in prose, the diagram itself must ACTUALLY be sparse. Don't promise brevity then front-load everything.

You create rich visual content — first-class primitive canvases, SVG diagrams/illustrations, and HTML interactive widgets — that renders inline in conversation. The best output feels like a natural extension of the chat.


## Core visual contract

Create a visual when it materially improves understanding or decision-making. Lead with the visual signal, use only relevant controls, and avoid invented scores, duplicate legends, decorative panels, and card grids that do not explain the data.

### Output choice

- Use \`show_widget\` with \`type: "spec"\` when the artifact clearly fits sections, cards, stats, tables, progress, callouts, or simple bar/line/area charts.
- Use \`type: "code"\` for custom SVG/canvas, maps, simulations, controls, animation, or chart behavior that primitives cannot express.
- Do not force the schema path. Visual clarity and required interaction take priority; \`spec\` is an optional convenience, not the visual language.
- Keep explanations outside the widget. Put only necessary labels, values, legends, and accessible text inside it.

### Composition

- Start with the plot, map, diagram, or dominant visual. Put values and takeaways on marks, axes, annotations, or one compact selected-state detail.
- Use \`.card\` only for a necessary bounded summary or selected-item detail. Never nest cards or wrap the whole visualization in card chrome.
- Use \`.viz-stat\` for a label, value, and at most one short delta; use \`.viz-grid\` only for 2–3 peer metrics or choices.
- Use \`.viz-row\` for wrapping related values/actions and \`.viz-controls\` for controls affecting the same visual.
- Use \`.viz-badge\` for display-only accents, never as a button.
- Keep presentation-only state local. For deliberate drill-down, use \`window.openai.sendFollowUpMessage({ prompt, title })\` with selected values.

### Accessibility and responsiveness

- Use semantic HTML, native tab order, keyboard-accessible controls, concise labels, and browser focus styles. Never add \`tabindex\` or override focus styles.
- Give every chart, SVG, canvas, and widget an accessible name or description using a role, \`<title>\`, \`<desc>\`, fallback text, or \`.sr-only\`.
- Pair color with labels, shape, position, or line style. Meaning must not depend on color alone.
- Design for 736px down to 320px. Reflow by wrapping or stacking; reserve space for the longest label.
- Avoid fixed outer widths, horizontal overflow, internal scrolling, \`position: fixed\`, and viewport-height layouts. The host sizes the frame to in-flow content.
- Keep text, marks, controls, cards, and dynamic content free of clipping and overlap.
- Use \`.text-small\` only for secondary annotations and \`.text-muted\` only for non-essential context. Never go below 11px.

### Motion

- Animate transitions between data states, not initial appearance. Never loop decorative motion and honor \`prefers-reduced-motion\`.
- Keep motion local to the changing visual; do not animate layout properties or unrelated chat chrome.

### Final check

- Is the main signal visible without explanatory prose?
- Are controls necessary, native, labeled, and keyboard accessible?
- Does it fit from 736px to 320px without clipping or scrolling?
- Does it remain correct during streaming, theme changes, resize, and reduced motion?


## Streaming and runtime

- Stream useful structure early: short \`<style>\` first, content next, scripts last. Avoid comments, hidden sections, dim loading states, gradients, blur, glow, and shadows that flash during DOM updates.
- Keep the fragment literal. Use a unique root ID and \`document.getElementById(...)\`; never use \`document.currentScript\` to find the root.
- For CDN scripts, use a named initializer with \`onload="initChart()"\`; add \`if (window.Chart) initChart()\` as a fallback when applicable. Do not assume a later script has loaded.
- Keep widgets under 2 MB. Reduce precision, bin, downsample, or remove unused data. Never use \`fetch\`, XHR, WebSocket, or other API calls.
- No nested scrolling and no \`position: fixed\`; overlays must remain in normal flow and contribute height.
- Current canvas CSP permits inline scripts and resources only from \`cdnjs.cloudflare.com\`, \`esm.sh\`, \`cdn.jsdelivr.net\`, and \`unpkg.com\`. \`connect-src\` is \`none\`. Do not depend on other origins, frames, objects, forms, or active embedding.
- The raw code path runs in an opaque \`allow-scripts\` iframe. Keep capability isolation intact; do not request same-origin, top-navigation, or network access.


## When nothing fits
Pick the closest use case below and adapt. When nothing fits cleanly:
- Default to editorial layout if the content is explanatory
- Default to card layout if the content is a bounded object
- All core design system rules still apply
- Use \`sendPrompt()\` for any action that benefits from Claude thinking

## SVG setup

**ViewBox safety checklist** — before finalizing any SVG, verify:
1. Find your lowest element: max(y + height) across all rects, max(y) across all text baselines.
2. Set viewBox height = that value + 40px buffer.
3. Find your rightmost element: max(x + width) across all rects. All content must stay within x=0 to x=680.
4. For text with text-anchor="end", the text extends LEFT from x. If x=118 and text is 200px wide, it starts at x=-82 — outside the viewBox. Increase x or use text-anchor="start".
5. Never use negative x or y coordinates. The viewBox starts at 0,0.
6. Flowcharts/structural only: for every pair of boxes in the same row, check that the left box's (x + width) is less than the right box's x by at least 20px. If four 160px boxes plus three 20px gaps sum to more than 640px, the row doesn't fit — shrink the boxes or cut the subtitles, don't let them overlap.
7. If a diagram still feels tight after the math, it is too dense. Split it into multiple diagrams instead of compressing placement.

**SVG setup**: \`<svg width="100%" viewBox="0 0 680 H">\` — 680px wide, flexible height. Set H to fit content tightly — the last element's bottom edge + 40px padding. Don't leave excess empty space below the content. Safe area: x=40 to x=640, y=40 to y=(H-40). Background transparent. **Do not wrap the SVG in a container \`<div>\` with a background color** — the widget host already provides the card container and background. Output the raw \`<svg>\` element directly.

**The 680 in viewBox is load-bearing — do not change it.** It matches the widget container width so SVG coordinate units render 1:1 with CSS pixels. With \`width="100%"\`, the browser scales the entire coordinate space to fit the container: \`viewBox="0 0 480 H"\` in a 680px container scales everything by 680/480 = 1.42×, so your \`class="th"\` 14px text renders at ~20px. The font calibration table below and all "text fits in box" math assume 1:1. If your diagram content is naturally narrow, **keep viewBox width at 680 and center the content** (e.g. content spans x=180..500) — do not shrink the viewBox to hug the content. This applies equally to inline SVGs inside \`show_widget\` HTML steppers and widgets: same \`viewBox="0 0 680 H"\`, same 1:1 guarantee.

**viewBox height:** After layout, find max_y (bottom-most point of any shape, including text baselines + 4px descent). Set viewBox height = max_y + 20. Don't guess.

**Default placement discipline** — use these defaults unless you have a specific reason not to:
- Outer margins: 40px on every side
- Horizontal gap between peer boxes: 24px minimum
- Vertical gap between tiers: 32px minimum
- Default node width: 160-200px
- Maximum node width in dense diagrams: 220px
- If you need more than 4 medium boxes in one row, split the diagram
- Prefer right-side labels with \`text-anchor="start"\`; avoid left-side label columns unless necessary
- Keep connectors orthogonal when possible; straight lines are only for unobstructed short runs

**text-anchor='end' at x<60 is risky** — the longest label will extend left past x=0. Use text-anchor='start' and right-align the column instead, or check: label_chars × 8 < anchor_x.

**One SVG per tool call** — each call must contain exactly one <svg> element. Never leave an abandoned or partial SVG in the output. If your first attempt has problems, replace it entirely — do not append a corrected version after the broken one.

**Few-shot SVG examples must start with a planning block.** Put this comment immediately before the raw SVG in any example:
\`\`\`text
<!-- PLAN
  type: flowchart | structural | illustrative | interactive
  nodes: list with (label, chars, computed width)
  row widths: sum check
  viewBox H: last_bottom + 40
  label side: right (default) | left (forced by __)
  color ramp: __ for __ , __ for __
-->
\`\`\`
Fill it out for the example you are showing so the sizing and routing logic is explicit.

**Style rules for all diagrams**:
- Every \`<text>\` element must carry one of the pre-built classes (\`t\`, \`ts\`, \`th\`). An unclassed \`<text>\` inherits the default sans font, which is the tell that you forgot the class.
- Use only two font sizes: 14px for node/region labels (class="t" or "th"), 12px for subtitles, descriptions, and arrow labels (class="ts"). No other sizes.
- No decorative step numbers, large numbering, or oversized headings outside boxes.
- No icons or illustrations inside boxes — text only. (Exception: illustrative diagrams may use simple shape-based indicators inside drawn objects — see below.)
- Sentence case on all labels.

**Font size calibration for diagram text labels** - Here's csv table to give you better sense of the var(--font-sans) font rendering width:
\`\`\`csv
text, chars length, font-weight, font-size, rendered width
Authentication Service, chars: 22, font-weight: 500, font-size: 14px, width: 167px
Background Job Processor, chars: 24, font-weight: 500, font-size: 14px, width: 201px
Detects and validates incoming tokens, chars: 37, font-weight: 400, font-size: 14px, width: 279px
forwards request to, chars: 19, font-weight: 400, font-size: 12px, width: 123px
データベースサーバー接続, chars: 12, font-weight: 400, font-size: 14px, width: 181px
\`\`\`

Before placing text in a box, check: does (text width + 2×padding) fit the container?

**SVG \`<text>\` never auto-wraps.** Every line break needs an explicit \`<tspan x="..." dy="1.2em">\`. If your subtitle is long enough to need wrapping, it's too long — shorten it (see complexity budget).

**Example check**: You want to put "Glucose (C₆H₁₂O₆)" in a rounded rect. The text is 20 characters at 14px ≈ 180px wide. Add 2×24px padding = 228px minimum box width. If your rect is only 160px wide, the text WILL overflow — either shorten the label (e.g. just "Glucose") or widen the box. Subscript characters like ₆ and ₁₂ still take horizontal space — count them.

**Pre-built classes** (already loaded in SVG widget):
- \`class="t"\` = sans 14px primary, \`class="ts"\` = sans 12px secondary, \`class="th"\` = sans 14px medium (500)
- \`class="box"\` = neutral rect helper (secondary fill, border stroke)
- \`class="node"\` = clickable group with hover effect (cursor pointer, slight dim on hover)
- \`class="arr"\` = arrow line (1.5px, open chevron head)
- \`class="leader"\` = dashed leader line (tertiary stroke, 0.5px, dashed)
- \`class="c-{ramp}"\` = colored node (c-default, c-gray, c-brown, c-orange, c-yellow, c-green, c-blue, c-purple, c-pink, c-red, plus compatibility aliases c-teal, c-amber, c-coral, c-black). Apply to \`<g>\` or shape element (rect/circle/ellipse), NOT to paths. Sets fill+stroke on shapes, auto-adjusts child \`t\`/\`ts\`/\`th\`, dark mode automatic.

**c-{ramp} nesting:** These classes use direct-child selectors (\`>\`). Nest a \`<g>\` inside a \`<g class="c-blue">\` and the inner shapes become grandchildren — they lose the fill and render BLACK (SVG default). Put \`c-*\` on the innermost group holding the shapes, or on the shapes directly. If you need click handlers, put \`onclick\` on the \`c-*\` group itself, not a wrapper.

- Short aliases: \`var(--p)\`, \`var(--s)\`, \`var(--t)\`, \`var(--bg2)\`, \`var(--b)\`
- Arrow marker: always include this \`<defs>\` at the start of every SVG:
  \`<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>\`
  Then use \`marker-end="url(#arrow)"\` on lines. The head uses \`context-stroke\`, so it inherits the colour of whichever line it sits on — a dashed green line gets a green head, a grey line gets a grey head. Never a colour mismatch. Do not add filters, patterns, or extra markers to \`<defs>\`. Illustrative diagrams may add a single \`<clipPath>\` or \`<linearGradient>\` (see Illustrative section).

**Minimize standalone labels.** Every \`<text>\` element must be inside a box (title or ≤5-word subtitle) or in the legend. Arrow labels are usually unnecessary — if the arrow's meaning isn't obvious from its source + target, put it in the box subtitle or in prose below. Labels floating in space collide with things and are ambiguous.

**Stroke width:** Use 0.5px strokes for diagram borders and edges — not 1px or 2px. Thin strokes feel more refined.

**Connector paths need \`fill="none"\`.** SVG defaults to \`fill: black\` — a curved connector without \`fill="none"\` renders as a huge black shape instead of a clean line. Every \`<path>\` or \`<polyline>\` used as a connector/arrow MUST have \`fill="none"\`. Only set fill on shapes meant to be filled (rects, circles, polygons).

**Rect rounding:** \`rx="4"\` for subtle corners. \`rx="8"\` max for emphasized rounding. \`rx\` ≥ half the height = pill shape — deliberate only.

**Schematic containers use dashed rects with a label.** Don't draw literal shapes (organelle ovals, cloud outlines, server tower icons) — the diagram is a schema, not an illustration. A dashed \`<rect>\` labeled "Reactor vessel" reads cleaner than an \`<ellipse>\` that clips content.

**Lines stop at component edges.** When a line meets a component (wire into a bulb, edge into a node), draw it as segments that stop at the boundary — never draw through and rely on a fill to hide the line. The background color is not guaranteed; any occluding fill is a coupling. Compute the stop/start coordinates from the component's position and size.

**No freestyle SVG colors.** Even illustrative SVGs must use the theme palette only. Use \`c-*\` classes and the shared palette tokens; do not fall back to hardcoded hex for scenes, gradients, flames, water, heat maps, or decorative accents.

**No rotated text**. \`<defs>\` may contain the arrow marker, a \`<clipPath>\`, and — in illustrative diagrams only — a single \`<linearGradient>\`. Nothing else: no filters, no patterns, no extra markers.


## Mathematical SVG reference quality

Use the illustrations in \`context/all-svgs\` as the quality bar for math and graph-based SVGs. They are compact, editorial mathematical diagrams: precise axes, smooth curves, shaded regions, construction guides, small point markers, and only the labels needed to make the idea legible.

When the user asks for calculus, algebra, set theory, geometry, graph interpretation, or "show me what this means" with equations, prefer this style over a box-and-arrow diagram.

**What to copy from the reference set:**
- Compose around one central mathematical object: a curve, region, interval, parabola, set boundary, triangle, or approximation.
- Draw axes as thin neutral lines with arrowheads, not heavy chart frames.
- Use smooth \`<path>\` curves with \`stroke-linecap="round"\` and \`stroke-linejoin="round"\`.
- Use translucent or theme-token shaded regions to show area, positive/negative contribution, interval coverage, limits, or approximation.
- Add dashed construction lines for \`a\`, \`b\`, \`x\`, directrix, tangent, partition edges, or vertical projections.
- Add small filled point markers at important intersections and endpoints.
- Put explanatory prose outside the main plot area or keep it to 2-4 short lines with \`class="ts"\`.
- Prefer a single elegant figure over multiple mini-plots unless the comparison is the concept.

**Avoid low-quality math diagrams:**
- Do not turn a mathematical concept into boxes unless the user asks for a process or taxonomy.
- Do not use chart libraries for hand-explanatory math diagrams; raw SVG gives better control over axes, shaded integrals, limits, and annotations.
- Do not over-label every tick or draw a full grid by default. The reference style uses sparse labels.
- Do not make the curve jagged. Use cubic Bezier paths for conceptual curves.
- Do not use saturated fills, thick outlines, drop shadows, filters, or decorative gradients.
- Do not place labels on top of curves, shaded regions, or axes. Move labels to clear space and connect with a small leader line when needed.

**Host adaptation:** The \`context/all-svgs\` files use fixed pixel sizes and literal grays. In Avenire widgets, keep the same visual discipline but adapt it to the host rules: \`viewBox="0 0 680 H"\`, \`width="100%"\`, classes \`t\`/\`ts\`/\`th\` for text, theme tokens or \`c-*\` ramps for colors, no custom palette, and a transparent background.

**Reference motifs to reuse:**
- \`definite-integrals-1.svg\`: shaded curvilinear trapezoid under \`y=f(x)\` between dashed vertical bounds \`a\` and \`b\`.
- \`riemann-integrability-criteria-1.svg\`: interval partition with translucent rectangles under a curve.
- \`fundamental-theorem-of-calculus-1.svg\`: positive and negative signed areas separated by the horizontal axis.
- \`quadratic-equations.svg\`: parabola with axis of symmetry, directrix, vertex/focus markers, and dashed projections.
- \`supremum-and-infimum-*.svg\`: number-line/set-boundary diagrams with minimal labels.

**Planning block additions for math SVGs:** In the mandatory \`<!-- PLAN ... -->\`, include:
\`\`\`text
  math object: curve | region | number line | geometric construction | approximation
  coordinate frame: axes origin, x-axis y, y-axis x, arrow extents
  highlighted region: path or rect range, fill token, label
  construction lines: dashed guides and endpoints
  label collision check: labels clear of curve/axis/shading
\`\`\`

**Coordinate discipline for math figures:**
- Reserve the central 420-520px width for the mathematical figure and leave a side or lower area for short notes.
- Put axes behind curves and shaded regions only when the axis should remain visible; otherwise draw shaded regions first, axes second, curve last, labels last.
- Curves should use \`stroke-width="2"\` maximum; axes/guides should use \`0.5\` or \`1\`.
- Shaded areas should have no heavy border unless the boundary itself is the concept.
- Keep the bottom explanatory text outside the plot's active geometry, with at least 20px separation from axes and guide lines.
- If a diagram needs more than one paragraph of explanation, split the prose into chat text and keep the SVG visual.


## Art and illustration
*"Draw me a sunset" / "Create a geometric pattern"*

Use \`show_widget\` with raw SVG. Same technical rules (viewBox, safe area) but the aesthetic is different:
- Fill the canvas — art should feel rich, not sparse
- Use the existing semantic ramps and classes only. Do not introduce freestyle colors.
- Do not add custom \`<style>\` color blocks or your own palette.
- Layer overlapping opaque shapes for depth
- Organic forms with \`<path>\` curves, \`<ellipse>\`, \`<circle>\`
- Texture via repetition (parallel lines, dots, hatching) not raster effects
- Geometric patterns with \`<g transform="rotate()">\` for radial symmetry
- If you include a raw SVG few-shot example here, prepend the mandatory \`<!-- PLAN ... -->\` block first.

`,
    sourceIds: ["preamble","modules","core-design-system","streaming-runtime","when-nothing-fits","svg-setup","mathematical-svg-reference","art-and-illustration"] as const,
  },
  "art-and-illustration": {
    id: "art-and-illustration",
    title: "Art And Illustration",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/art_and_illustration.md",
    content: `## Art and illustration
*"Draw me a sunset" / "Create a geometric pattern"*

Use \`show_widget\` with raw SVG. Same technical rules (viewBox, safe area) but the aesthetic is different:
- Fill the canvas — art should feel rich, not sparse
- Use the existing semantic ramps and classes only. Do not introduce freestyle colors.
- Do not add custom \`<style>\` color blocks or your own palette.
- Layer overlapping opaque shapes for depth
- Organic forms with \`<path>\` curves, \`<ellipse>\`, \`<circle>\`
- Texture via repetition (parallel lines, dots, hatching) not raster effects
- Geometric patterns with \`<g transform="rotate()">\` for radial symmetry
- If you include a raw SVG few-shot example here, prepend the mandatory \`<!-- PLAN ... -->\` block first.
`,
  },
  "auto-llm-example": {
    id: "auto-llm-example",
    title: "Autonomous LLM Research Agent Flow",
    description: "Reference example showing an autonomous LLM research agent flowchart.",
    section: "study-guidelines",
    path: "sections/study-guidelines/examples/auto-llm.md",
    content: `---
name: auto-llm-example
description: Reference example showing an autonomous LLM research agent flowchart.
---

# Autonomous LLM Research Agent Flow

A multi-section flowchart showing Karpathy's autoresearch framework: human-agent handoff, the autonomous experiment loop with keep/discard decision branching, and the modifiable training pipeline.

## Reference Patterns

- Three-section layout
- Neutral dashed containers for loops and pipelines
- Decision branching with convergence
- Loop-back arrow for repetition
- Semantic color for outcomes
- Highlighted training step
- Horizontal pipeline flow

`,
  },
  "chart": {
    id: "chart",
    title: "Chart",
    description: "Visual generation guidelines bundle for chart.",
    section: "visual-guidelines",
    path: null,
    content: `# Imagine — Visual Creation Suite

## Modules
Call \`visualize_read_me\` with only the relevant visual modules. Use \`chart\` for quantitative data, \`diagram\` for static structures, \`interactive\` for controls, \`physics\` for simulations, \`mockup\` for app-like surfaces, and \`art\` for non-analytical illustration.
- \`diagram\` — SVG flowcharts, structural diagrams, illustrative diagrams
- \`mockup\` — UI mockups, forms, cards, dashboards. Prefer \`widget.type: "spec"\` primitives unless pixel-specific HTML is required.
- \`interactive\` — interactive explainers with controls. Prefer \`widget.type: "spec"\` for static/structured explainers; use raw HTML for controls and custom JS.
- \`chart\` — charts and data analysis. Use \`widget.type: "spec"\` first for bar, line, area, stats, tables, callouts, and dashboard/report layouts. Raw Chart.js is only for unsupported chart types or imperative chart interaction.
- \`art\` — illustration and generative art
- \`physics\` — physics simulations, motion, forces, energy, and time-evolving systems
Pick the closest fit. Each module includes the relevant design guidance.

Use \`show_widget\` when a visual materially improves the answer. Choose \`spec\` when the existing primitives clearly fit; choose \`code\` when custom drawing or interaction is required. Plain markdown is fine when a structured canvas would not improve scanning.

**Complexity budget — hard limits:**
- Box subtitles: ≤5 words. Detail goes in click-through (\`sendPrompt\`) or the prose below — not the box.
- Colors: ≤2 ramps per diagram. If colors encode meaning (states, tiers), add a 1-line legend. Otherwise use one neutral ramp.
- Horizontal tier: ≤4 boxes at full width (~140px each). 5+ boxes → shrink to ≤110px OR wrap to 2 rows OR split into overview + detail diagrams.

If you catch yourself writing "click to learn more" in prose, the diagram itself must ACTUALLY be sparse. Don't promise brevity then front-load everything.

You create rich visual content — first-class primitive canvases, SVG diagrams/illustrations, and HTML interactive widgets — that renders inline in conversation. The best output feels like a natural extension of the chat.


## Core visual contract

Create a visual when it materially improves understanding or decision-making. Lead with the visual signal, use only relevant controls, and avoid invented scores, duplicate legends, decorative panels, and card grids that do not explain the data.

### Output choice

- Use \`show_widget\` with \`type: "spec"\` when the artifact clearly fits sections, cards, stats, tables, progress, callouts, or simple bar/line/area charts.
- Use \`type: "code"\` for custom SVG/canvas, maps, simulations, controls, animation, or chart behavior that primitives cannot express.
- Do not force the schema path. Visual clarity and required interaction take priority; \`spec\` is an optional convenience, not the visual language.
- Keep explanations outside the widget. Put only necessary labels, values, legends, and accessible text inside it.

### Composition

- Start with the plot, map, diagram, or dominant visual. Put values and takeaways on marks, axes, annotations, or one compact selected-state detail.
- Use \`.card\` only for a necessary bounded summary or selected-item detail. Never nest cards or wrap the whole visualization in card chrome.
- Use \`.viz-stat\` for a label, value, and at most one short delta; use \`.viz-grid\` only for 2–3 peer metrics or choices.
- Use \`.viz-row\` for wrapping related values/actions and \`.viz-controls\` for controls affecting the same visual.
- Use \`.viz-badge\` for display-only accents, never as a button.
- Keep presentation-only state local. For deliberate drill-down, use \`window.openai.sendFollowUpMessage({ prompt, title })\` with selected values.

### Accessibility and responsiveness

- Use semantic HTML, native tab order, keyboard-accessible controls, concise labels, and browser focus styles. Never add \`tabindex\` or override focus styles.
- Give every chart, SVG, canvas, and widget an accessible name or description using a role, \`<title>\`, \`<desc>\`, fallback text, or \`.sr-only\`.
- Pair color with labels, shape, position, or line style. Meaning must not depend on color alone.
- Design for 736px down to 320px. Reflow by wrapping or stacking; reserve space for the longest label.
- Avoid fixed outer widths, horizontal overflow, internal scrolling, \`position: fixed\`, and viewport-height layouts. The host sizes the frame to in-flow content.
- Keep text, marks, controls, cards, and dynamic content free of clipping and overlap.
- Use \`.text-small\` only for secondary annotations and \`.text-muted\` only for non-essential context. Never go below 11px.

### Motion

- Animate transitions between data states, not initial appearance. Never loop decorative motion and honor \`prefers-reduced-motion\`.
- Keep motion local to the changing visual; do not animate layout properties or unrelated chat chrome.

### Final check

- Is the main signal visible without explanatory prose?
- Are controls necessary, native, labeled, and keyboard accessible?
- Does it fit from 736px to 320px without clipping or scrolling?
- Does it remain correct during streaming, theme changes, resize, and reduced motion?


## Streaming and runtime

- Stream useful structure early: short \`<style>\` first, content next, scripts last. Avoid comments, hidden sections, dim loading states, gradients, blur, glow, and shadows that flash during DOM updates.
- Keep the fragment literal. Use a unique root ID and \`document.getElementById(...)\`; never use \`document.currentScript\` to find the root.
- For CDN scripts, use a named initializer with \`onload="initChart()"\`; add \`if (window.Chart) initChart()\` as a fallback when applicable. Do not assume a later script has loaded.
- Keep widgets under 2 MB. Reduce precision, bin, downsample, or remove unused data. Never use \`fetch\`, XHR, WebSocket, or other API calls.
- No nested scrolling and no \`position: fixed\`; overlays must remain in normal flow and contribute height.
- Current canvas CSP permits inline scripts and resources only from \`cdnjs.cloudflare.com\`, \`esm.sh\`, \`cdn.jsdelivr.net\`, and \`unpkg.com\`. \`connect-src\` is \`none\`. Do not depend on other origins, frames, objects, forms, or active embedding.
- The raw code path runs in an opaque \`allow-scripts\` iframe. Keep capability isolation intact; do not request same-origin, top-navigation, or network access.


## When nothing fits
Pick the closest use case below and adapt. When nothing fits cleanly:
- Default to editorial layout if the content is explanatory
- Default to card layout if the content is a bounded object
- All core design system rules still apply
- Use \`sendPrompt()\` for any action that benefits from Claude thinking

---
name: first-class-primitives
description: Use the Avenire primitive renderer when it clearly fits the artifact.
---

# Primitive option

The primitive renderer is an optional fast path, not a requirement. Use it when the artifact is mostly structured layout, metrics, tables, callouts, progress, or simple bar/line/area charts. Use raw \`code\` when custom drawing, controls, animation, maps, simulations, or imperative behavior is the clearer solution.

## Available nodes

- \`stack\`: vertical composition with \`children\` and optional \`gap\`.
- \`grid\`: responsive peer layout with \`children\`, optional \`columns\` 1–4, and \`gap\`.
- \`section\`: open grouping with optional \`title\`, \`description\`, and \`children\`.
- \`card\`: bounded surface with optional \`title\`, \`description\`, \`tone\`, and \`children\`.
- \`stat\`: \`label\`, \`value\`, optional \`delta\` and \`tone\`.
- \`heading\`, \`text\`, \`badge\`, \`callout\`, \`table\`, \`progress\`, \`divider\`.
- \`chart\`: bar, line, or area data with \`indexKey\` and one or more series.

## Rules

- Lead with the artifact’s answer and the strongest visual.
- Prefer one strong chart plus a compact table over several tiny charts.
- Use open sections for grouping; use cards only for bounded objects.
- Keep card titles short, sentence case, and useful.
- Keep tables to 3–6 columns and fewer than 20 rows when possible.
- Round every displayed number.
- Use semantic tones only when they carry meaning.
- Do not use raw HTML for a simple card, metric, table, badge, progress row, or chart.
- Do not force a stat grid or card row when a plot or diagram alone answers the request.


## Utility components

Use host utilities for geometry, surfaces, controls, typography, and interaction. Do not add custom component skins, borders, radii, shadows, gradients, or pseudo-element states.

### Layout and surfaces

- \`.card\`: the only card-like surface. Use it for a necessary bounded summary, selected item, or interactive field. Keep charts, maps, diagrams, tables, controls, and the whole visualization transparent and unframed.
- \`.viz-stat\`: one muted label, one \`.viz-stat-value\`, and at most one short context/delta line.
- \`.viz-grid\`: peer metrics or choices. Keep groups to 2–3 columns at 736px and stack at narrow widths.
- \`.viz-row\`: wrapping horizontal group for related values or inline actions.
- \`.viz-tile\`: selectable dense-grid \`.btn\`; it stretches to its cell and uses the utility-selected state. Do not add another border, outline, shadow, or pressed rule.
- \`.viz-badge\`: compact display-only status/category accent; never use it as a button.

### Controls

- Use native \`button\`, \`input\`, \`select\`, and \`textarea\` with \`.btn\`, \`.btn-primary\`, \`.btn-ghost\`, \`.btn-block\`, \`.form-label\`, \`.form-check\`, \`.form-switch\`, \`.form-control\`, \`.form-select\`, and \`.form-range\` where provided by the host.
- Use \`.viz-controls\` as a wrapping row for controls affecting the same visual. Keep fields to two columns at most and stack them when narrow.
- Use visible labels for icon-only controls through \`aria-label\`; keep native focus styles and tab order.
- Keep filters, selections, and presentation-only interactions local. Use \`window.openai.sendFollowUpMessage\` only for an explicit investigation or explanation request.

### Text and numbers

- Use \`.text-small\` only for secondary labels and \`.text-muted\` only for non-essential context. Never go below 11px.
- Use \`.text-destructive\` only for actionable errors. Use \`.sr-only\` for accessible descriptions and keyboard fallbacks.
- Round every displayed number; use sensible integer, decimal, percentage, or currency precision.

### Examples

For concrete compositions, load the relevant examples from \`examples/\` only when needed. Do not copy incidental spacing or content from an example when the user’s artifact differs.


## Theme and color contract

The model must not invent a palette. Never write hex, RGB, HSL, Tailwind color literals, white/black panel colors, or hardcoded light/dark colors.

- Use provided utility classes for surfaces, controls, selected states, chart marks, and semantic states.
- Use \`currentColor\` inside SVG. Every SVG \`<text>\` must use the documented text class.
- Use series utilities/tokens only for meaningful persistent series, categories, or status identity. Keep mappings stable.
- Use series color on marks and legend swatches, never on labels or values. Pair color with text, shape, position, or line style.
- Keep structural lines, inactive marks, grids, and borders neutral and thin. Keep large-area fills subtle.
- Use the utility-selected state for pressed/selected controls; do not repaint controls in widget code.

### Canvas contract

The host exposes theme variables to raw canvas widgets, including \`--background\`, \`--foreground\`, \`--card\`, \`--muted\`, \`--muted-foreground\`, \`--border\`, \`--input\`, \`--primary\`, \`--primary-foreground\`, \`--accent\`, and \`--ring\`. Read them through utility classes or \`var(...)\` only when the canvas contract requires it; do not choose replacement values.

### SVG contract

Use the host SVG classes \`t\`, \`ts\`, \`th\`, \`box\`, \`node\`, \`arr\`, \`leader\`, and semantic ramp classes where supplied. Do not write a \`<style>\` block to define a new color system.


## Charts

- Start with the plot for named numeric data. Label axes, units, important values, and chart meaning.
- Use a tooltip only when direct labels would be less clear; mirror important tooltip data in a keyboard-visible fallback.
- Animate transitions between data states, not initial appearance. Never loop chart motion and honor \`prefers-reduced-motion\`.
- For distributions or multi-metric comparisons, prefer shared-scale facets or small multiples and show requested dimensions together.
- Keep series count small enough to read at chat width. Pair color with labels, shape, or line style.
- Use the primitive \`chart\` node for ordinary bar, line, and area charts when it clearly fits. Use raw Chart.js only for unsupported chart types, custom plugins, synchronized charts, or imperative annotations.

## Raw Chart.js

- Put \`<canvas>\` in a wrapper with explicit height and \`position: relative\`; never set canvas CSS height directly.
- Use \`responsive: true\` and \`maintainAspectRatio: false\`.
- Load approved UMD scripts with \`onload="initChart()"\`, define a named initializer, and keep an \`if (window.Chart) initChart()\` fallback.
- Use unique IDs for multiple charts. Pad bubble/scatter scales so marks are not clipped.
- Disable the default legend when it hides values; build a semantic utility-based legend outside the canvas.
- Canvas cannot resolve CSS variables. Do not hand-author colors; use Chart.js defaults or the host chart utility contract.


## Interactive chart example

Use a literal fragment with one root ID, native controls, and one dominant visual:

\`\`\`html
<div id="chart-root">
  <div class="viz-controls">
    <label class="form-label" for="period">Period</label>
    <select class="form-select" id="period">
      <option>30 days</option>
      <option>90 days</option>
    </select>
  </div>
  <div role="img" aria-label="Trend over time" id="chart"></div>
</div>
<script>
  const root = document.getElementById("chart-root");
  const period = root.querySelector("#period");
  period.addEventListener("change", () => render(period.value));
  render(period.value);
</script>
\`\`\`

Keep selection local, update the visual rather than adding a second panel, and keep the first render useful before any input changes.

`,
    sourceIds: ["preamble","modules","core-design-system","streaming-runtime","when-nothing-fits","first-class-primitives","ui-components","color-palette","charts-chart-js","interactive-chart"] as const,
  },
  "charts-chart-js": {
    id: "charts-chart-js",
    title: "Charts Chart Js",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/charts_chart_js.md",
    content: `## Charts

- Start with the plot for named numeric data. Label axes, units, important values, and chart meaning.
- Use a tooltip only when direct labels would be less clear; mirror important tooltip data in a keyboard-visible fallback.
- Animate transitions between data states, not initial appearance. Never loop chart motion and honor \`prefers-reduced-motion\`.
- For distributions or multi-metric comparisons, prefer shared-scale facets or small multiples and show requested dimensions together.
- Keep series count small enough to read at chat width. Pair color with labels, shape, or line style.
- Use the primitive \`chart\` node for ordinary bar, line, and area charts when it clearly fits. Use raw Chart.js only for unsupported chart types, custom plugins, synchronized charts, or imperative annotations.

## Raw Chart.js

- Put \`<canvas>\` in a wrapper with explicit height and \`position: relative\`; never set canvas CSS height directly.
- Use \`responsive: true\` and \`maintainAspectRatio: false\`.
- Load approved UMD scripts with \`onload="initChart()"\`, define a named initializer, and keep an \`if (window.Chart) initChart()\` fallback.
- Use unique IDs for multiple charts. Pad bubble/scatter scales so marks are not clipped.
- Disable the default legend when it hides values; build a semantic utility-based legend outside the canvas.
- Canvas cannot resolve CSS variables. Do not hand-author colors; use Chart.js defaults or the host chart utility contract.
`,
  },
  "color-palette": {
    id: "color-palette",
    title: "Color Palette",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/color_palette.md",
    content: `## Theme and color contract

The model must not invent a palette. Never write hex, RGB, HSL, Tailwind color literals, white/black panel colors, or hardcoded light/dark colors.

- Use provided utility classes for surfaces, controls, selected states, chart marks, and semantic states.
- Use \`currentColor\` inside SVG. Every SVG \`<text>\` must use the documented text class.
- Use series utilities/tokens only for meaningful persistent series, categories, or status identity. Keep mappings stable.
- Use series color on marks and legend swatches, never on labels or values. Pair color with text, shape, position, or line style.
- Keep structural lines, inactive marks, grids, and borders neutral and thin. Keep large-area fills subtle.
- Use the utility-selected state for pressed/selected controls; do not repaint controls in widget code.

### Canvas contract

The host exposes theme variables to raw canvas widgets, including \`--background\`, \`--foreground\`, \`--card\`, \`--muted\`, \`--muted-foreground\`, \`--border\`, \`--input\`, \`--primary\`, \`--primary-foreground\`, \`--accent\`, and \`--ring\`. Read them through utility classes or \`var(...)\` only when the canvas contract requires it; do not choose replacement values.

### SVG contract

Use the host SVG classes \`t\`, \`ts\`, \`th\`, \`box\`, \`node\`, \`arr\`, \`leader\`, and semantic ramp classes where supplied. Do not write a \`<style>\` block to define a new color system.
`,
  },
  "concept-explainer": {
    id: "concept-explainer",
    title: "Concept Explainer",
    description: "ELI5-style explanations with analogies and multiple examples. Explains concepts at different levels (ELI5, high school, undergraduate, graduate). Uses real-world analogies and visual metaphors. Use when explaining difficult concepts, clarifying confusing topics, or learning new subjects. Triggers - explain concept, ELI5, explain like I'm 5, what is, how does, why does, analogy for, simple explanation.",
    section: "study-guidelines",
    path: "sections/study-guidelines/concept-explainer.md",
    content: `---
name: concept-explainer
description: ELI5-style explanations with analogies and multiple examples. Explains concepts at different levels (ELI5, high school, undergraduate, graduate). Uses real-world analogies and visual metaphors. Use when explaining difficult concepts, clarifying confusing topics, or learning new subjects. Triggers - explain concept, ELI5, explain like I'm 5, what is, how does, why does, analogy for, simple explanation.
---
 
# Concept Explainer
 
Clear explanations with analogies and examples at multiple difficulty levels.
 
## Explanation Levels
 
| Level | Audience | Style |
|-------|----------|-------|
| ELI5 | Complete beginner | Simple words, everyday analogies |
| High School | Some background | Basic terminology, clear examples |
| Undergraduate | Foundational knowledge | Technical terms, detailed mechanisms |
| Graduate | Advanced understanding | Nuances, edge cases, research context |
 
---
 
## Explanation Framework
 
\`\`\`mermaid
flowchart TB
    A[Concept] --> B[One-Sentence Summary]
    B --> C[Core Analogy]
    C --> D[How It Works]
    D --> E[Examples]
    E --> F[Common Misconceptions]
\`\`\`
 
---
 
## Template: Standard Explanation
 
\`\`\`markdown
# [Concept Name]
 
## In One Sentence
[Concept] is [simple definition] that [what it does/why it matters].
 
## The Analogy
Think of [concept] like [familiar thing]. Just as [familiar thing does X], [concept] does [Y].
 
## How It Actually Works
[More detailed explanation with proper terminology]
 
### Key Components
1. **Component 1:** What it is and what it does
2. **Component 2:** What it is and what it does
3. **Component 3:** How they work together
 
## Examples
 
### Example 1: [Simple]
[Everyday example with the concept]
 
### Example 2: [Applied]
[Real-world application]
 
### Example 3: [Advanced]
[Complex scenario]
 
## Common Misconceptions
- ❌ **Myth:** [Wrong belief]
  - ✅ **Reality:** [Correct understanding]
 
## Related Concepts
- [Concept A] - [How it relates]
- [Concept B] - [How it relates]
\`\`\`
 
---
 
## Analogy Patterns
 
### Structure Analogy
"[Concept] is like a [familiar object] where [component A] is like [part 1] and [component B] is like [part 2]."
 
**Example:** "A cell is like a factory where the nucleus is the control room and mitochondria are the power plants."
 
### Process Analogy
"[Concept] works like [familiar process]. First, [step 1 comparison], then [step 2 comparison]."
 
**Example:** "Osmosis works like crowds at a concert. People naturally spread from crowded areas to less crowded areas."
 
### Scale Analogy
"If [large/small thing] were the size of [familiar object], then [other element] would be..."
 
**Example:** "If an atom were the size of a football stadium, the nucleus would be a marble at the center."
 
---
 
## Level Adjustments
 
### ELI5 Techniques
- No jargon
- 1-2 sentence explanations
- Everyday objects as analogies
- "Imagine if..." scenarios
- Avoid numbers unless simple
 
### High School Level
- Introduce key terms with definitions
- Simple diagrams
- Concrete examples
- Cause and effect clear
 
### Undergraduate Level
- Technical vocabulary expected
- Mathematical relationships
- Mechanism details
- Multiple interconnected concepts
 
### Graduate Level
- Assumptions and limitations
- Historical development
- Current research questions
- Edge cases and exceptions
 
---
 
## Example: Explaining "Entropy" at Multiple Levels
 
### ELI5
"Entropy is messiness. Your room wants to get messy by itself, but you have to work to clean it up."
 
### High School
"Entropy measures disorder in a system. In nature, things tend to become more disordered over time - ice melts, buildings crumble, things mix together."
 
### Undergraduate
"Entropy (S) is a thermodynamic quantity measuring the number of microscopic configurations (microstates) available to a system. ΔS = Q/T for reversible processes. The Second Law states entropy of an isolated system never decreases."
 
### Graduate
"Entropy connects to information theory through Boltzmann's equation S = k ln Ω. Maximum entropy methods provide principled uncertainty quantification. Non-equilibrium thermodynamics extends these concepts to systems with entropy production."
 
---
 
## Quality Checklist

- [ ] Opens with simple one-liner
- [ ] Includes relatable analogy
- [ ] Provides 2-3 examples at different scales
- [ ] Addresses common misconceptions
- [ ] Builds from simple to complex
- [ ] Uses consistent terminology
- [ ] Connects to related concepts
- [ ] Any equations are written inline with \`$...$\` or display with \`$$...$$\`, never fenced as \`\`\`latex
`,
  },
  "core-design-system": {
    id: "core-design-system",
    title: "Core Design System",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/core_design_system.md",
    content: `## Core visual contract

Create a visual when it materially improves understanding or decision-making. Lead with the visual signal, use only relevant controls, and avoid invented scores, duplicate legends, decorative panels, and card grids that do not explain the data.

### Output choice

- Use \`show_widget\` with \`type: "spec"\` when the artifact clearly fits sections, cards, stats, tables, progress, callouts, or simple bar/line/area charts.
- Use \`type: "code"\` for custom SVG/canvas, maps, simulations, controls, animation, or chart behavior that primitives cannot express.
- Do not force the schema path. Visual clarity and required interaction take priority; \`spec\` is an optional convenience, not the visual language.
- Keep explanations outside the widget. Put only necessary labels, values, legends, and accessible text inside it.

### Composition

- Start with the plot, map, diagram, or dominant visual. Put values and takeaways on marks, axes, annotations, or one compact selected-state detail.
- Use \`.card\` only for a necessary bounded summary or selected-item detail. Never nest cards or wrap the whole visualization in card chrome.
- Use \`.viz-stat\` for a label, value, and at most one short delta; use \`.viz-grid\` only for 2–3 peer metrics or choices.
- Use \`.viz-row\` for wrapping related values/actions and \`.viz-controls\` for controls affecting the same visual.
- Use \`.viz-badge\` for display-only accents, never as a button.
- Keep presentation-only state local. For deliberate drill-down, use \`window.openai.sendFollowUpMessage({ prompt, title })\` with selected values.

### Accessibility and responsiveness

- Use semantic HTML, native tab order, keyboard-accessible controls, concise labels, and browser focus styles. Never add \`tabindex\` or override focus styles.
- Give every chart, SVG, canvas, and widget an accessible name or description using a role, \`<title>\`, \`<desc>\`, fallback text, or \`.sr-only\`.
- Pair color with labels, shape, position, or line style. Meaning must not depend on color alone.
- Design for 736px down to 320px. Reflow by wrapping or stacking; reserve space for the longest label.
- Avoid fixed outer widths, horizontal overflow, internal scrolling, \`position: fixed\`, and viewport-height layouts. The host sizes the frame to in-flow content.
- Keep text, marks, controls, cards, and dynamic content free of clipping and overlap.
- Use \`.text-small\` only for secondary annotations and \`.text-muted\` only for non-essential context. Never go below 11px.

### Motion

- Animate transitions between data states, not initial appearance. Never loop decorative motion and honor \`prefers-reduced-motion\`.
- Keep motion local to the changing visual; do not animate layout properties or unrelated chat chrome.

### Final check

- Is the main signal visible without explanatory prose?
- Are controls necessary, native, labeled, and keyboard accessible?
- Does it fit from 736px to 320px without clipping or scrolling?
- Does it remain correct during streaming, theme changes, resize, and reduced motion?
`,
  },
  "create-learning-path": {
    id: "create-learning-path",
    title: "Create a learning path",
    description: "Build a personalized learning roadmap with milestones and practice checkpoints.",
    section: "agent-guidelines",
    path: "sections/agent-guidelines/create-learning-path.md",
    content: `---
name: create-learning-path
description: Build a personalized learning roadmap with milestones and practice checkpoints.
---

# Create a learning path

Call \`get_teaching_workspace\` first to discover bounded metadata. Then use \`read_teaching_artifact\` for the mission and relevant existing learning records, references, lessons, notes, and resources before creating the roadmap. Save the resulting roadmap as a \`reference\` or \`lesson\` artifact, not as a visible workspace file.

1. Assess the learner's baseline and target outcome.
2. Sequence the smallest set of topics from fundamentals to applied practice.
3. Define achievable milestones, practice tasks, feedback criteria, and time-boxed checkpoints.
4. Include reflection in every phase and limit the resource list.
5. End with a measurable next milestone.

Completion means the roadmap names the target, order, practice, feedback, timing, and next checkpoint.
`,
  },
  "dashboard": {
    id: "dashboard",
    title: "Dashboard",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/examples/dashboard.md",
    content: `## Dashboard example

Use this shape for a user-requested operating map, report, or dashboard:

1. One concise heading and one-line scope.
2. A 2–3 column \`.viz-grid\` only if the metrics explain the requested decision.
3. One dominant chart, map, or timeline.
4. A compact \`.viz-controls\` row only for requested filters or views.
5. A small table or \`.viz-badge\` legend only when it removes ambiguity.

Do not add a second chart, status score, decorative card, or explanatory panel just to fill space.
`,
  },
  "diagram": {
    id: "diagram",
    title: "Diagram",
    description: "Visual generation guidelines bundle for diagram.",
    section: "visual-guidelines",
    path: null,
    content: `# Imagine — Visual Creation Suite

## Modules
Call \`visualize_read_me\` with only the relevant visual modules. Use \`chart\` for quantitative data, \`diagram\` for static structures, \`interactive\` for controls, \`physics\` for simulations, \`mockup\` for app-like surfaces, and \`art\` for non-analytical illustration.
- \`diagram\` — SVG flowcharts, structural diagrams, illustrative diagrams
- \`mockup\` — UI mockups, forms, cards, dashboards. Prefer \`widget.type: "spec"\` primitives unless pixel-specific HTML is required.
- \`interactive\` — interactive explainers with controls. Prefer \`widget.type: "spec"\` for static/structured explainers; use raw HTML for controls and custom JS.
- \`chart\` — charts and data analysis. Use \`widget.type: "spec"\` first for bar, line, area, stats, tables, callouts, and dashboard/report layouts. Raw Chart.js is only for unsupported chart types or imperative chart interaction.
- \`art\` — illustration and generative art
- \`physics\` — physics simulations, motion, forces, energy, and time-evolving systems
Pick the closest fit. Each module includes the relevant design guidance.

Use \`show_widget\` when a visual materially improves the answer. Choose \`spec\` when the existing primitives clearly fit; choose \`code\` when custom drawing or interaction is required. Plain markdown is fine when a structured canvas would not improve scanning.

**Complexity budget — hard limits:**
- Box subtitles: ≤5 words. Detail goes in click-through (\`sendPrompt\`) or the prose below — not the box.
- Colors: ≤2 ramps per diagram. If colors encode meaning (states, tiers), add a 1-line legend. Otherwise use one neutral ramp.
- Horizontal tier: ≤4 boxes at full width (~140px each). 5+ boxes → shrink to ≤110px OR wrap to 2 rows OR split into overview + detail diagrams.

If you catch yourself writing "click to learn more" in prose, the diagram itself must ACTUALLY be sparse. Don't promise brevity then front-load everything.

You create rich visual content — first-class primitive canvases, SVG diagrams/illustrations, and HTML interactive widgets — that renders inline in conversation. The best output feels like a natural extension of the chat.


## Core visual contract

Create a visual when it materially improves understanding or decision-making. Lead with the visual signal, use only relevant controls, and avoid invented scores, duplicate legends, decorative panels, and card grids that do not explain the data.

### Output choice

- Use \`show_widget\` with \`type: "spec"\` when the artifact clearly fits sections, cards, stats, tables, progress, callouts, or simple bar/line/area charts.
- Use \`type: "code"\` for custom SVG/canvas, maps, simulations, controls, animation, or chart behavior that primitives cannot express.
- Do not force the schema path. Visual clarity and required interaction take priority; \`spec\` is an optional convenience, not the visual language.
- Keep explanations outside the widget. Put only necessary labels, values, legends, and accessible text inside it.

### Composition

- Start with the plot, map, diagram, or dominant visual. Put values and takeaways on marks, axes, annotations, or one compact selected-state detail.
- Use \`.card\` only for a necessary bounded summary or selected-item detail. Never nest cards or wrap the whole visualization in card chrome.
- Use \`.viz-stat\` for a label, value, and at most one short delta; use \`.viz-grid\` only for 2–3 peer metrics or choices.
- Use \`.viz-row\` for wrapping related values/actions and \`.viz-controls\` for controls affecting the same visual.
- Use \`.viz-badge\` for display-only accents, never as a button.
- Keep presentation-only state local. For deliberate drill-down, use \`window.openai.sendFollowUpMessage({ prompt, title })\` with selected values.

### Accessibility and responsiveness

- Use semantic HTML, native tab order, keyboard-accessible controls, concise labels, and browser focus styles. Never add \`tabindex\` or override focus styles.
- Give every chart, SVG, canvas, and widget an accessible name or description using a role, \`<title>\`, \`<desc>\`, fallback text, or \`.sr-only\`.
- Pair color with labels, shape, position, or line style. Meaning must not depend on color alone.
- Design for 736px down to 320px. Reflow by wrapping or stacking; reserve space for the longest label.
- Avoid fixed outer widths, horizontal overflow, internal scrolling, \`position: fixed\`, and viewport-height layouts. The host sizes the frame to in-flow content.
- Keep text, marks, controls, cards, and dynamic content free of clipping and overlap.
- Use \`.text-small\` only for secondary annotations and \`.text-muted\` only for non-essential context. Never go below 11px.

### Motion

- Animate transitions between data states, not initial appearance. Never loop decorative motion and honor \`prefers-reduced-motion\`.
- Keep motion local to the changing visual; do not animate layout properties or unrelated chat chrome.

### Final check

- Is the main signal visible without explanatory prose?
- Are controls necessary, native, labeled, and keyboard accessible?
- Does it fit from 736px to 320px without clipping or scrolling?
- Does it remain correct during streaming, theme changes, resize, and reduced motion?


## Streaming and runtime

- Stream useful structure early: short \`<style>\` first, content next, scripts last. Avoid comments, hidden sections, dim loading states, gradients, blur, glow, and shadows that flash during DOM updates.
- Keep the fragment literal. Use a unique root ID and \`document.getElementById(...)\`; never use \`document.currentScript\` to find the root.
- For CDN scripts, use a named initializer with \`onload="initChart()"\`; add \`if (window.Chart) initChart()\` as a fallback when applicable. Do not assume a later script has loaded.
- Keep widgets under 2 MB. Reduce precision, bin, downsample, or remove unused data. Never use \`fetch\`, XHR, WebSocket, or other API calls.
- No nested scrolling and no \`position: fixed\`; overlays must remain in normal flow and contribute height.
- Current canvas CSP permits inline scripts and resources only from \`cdnjs.cloudflare.com\`, \`esm.sh\`, \`cdn.jsdelivr.net\`, and \`unpkg.com\`. \`connect-src\` is \`none\`. Do not depend on other origins, frames, objects, forms, or active embedding.
- The raw code path runs in an opaque \`allow-scripts\` iframe. Keep capability isolation intact; do not request same-origin, top-navigation, or network access.


## When nothing fits
Pick the closest use case below and adapt. When nothing fits cleanly:
- Default to editorial layout if the content is explanatory
- Default to card layout if the content is a bounded object
- All core design system rules still apply
- Use \`sendPrompt()\` for any action that benefits from Claude thinking

## Theme and color contract

The model must not invent a palette. Never write hex, RGB, HSL, Tailwind color literals, white/black panel colors, or hardcoded light/dark colors.

- Use provided utility classes for surfaces, controls, selected states, chart marks, and semantic states.
- Use \`currentColor\` inside SVG. Every SVG \`<text>\` must use the documented text class.
- Use series utilities/tokens only for meaningful persistent series, categories, or status identity. Keep mappings stable.
- Use series color on marks and legend swatches, never on labels or values. Pair color with text, shape, position, or line style.
- Keep structural lines, inactive marks, grids, and borders neutral and thin. Keep large-area fills subtle.
- Use the utility-selected state for pressed/selected controls; do not repaint controls in widget code.

### Canvas contract

The host exposes theme variables to raw canvas widgets, including \`--background\`, \`--foreground\`, \`--card\`, \`--muted\`, \`--muted-foreground\`, \`--border\`, \`--input\`, \`--primary\`, \`--primary-foreground\`, \`--accent\`, and \`--ring\`. Read them through utility classes or \`var(...)\` only when the canvas contract requires it; do not choose replacement values.

### SVG contract

Use the host SVG classes \`t\`, \`ts\`, \`th\`, \`box\`, \`node\`, \`arr\`, \`leader\`, and semantic ramp classes where supplied. Do not write a \`<style>\` block to define a new color system.


## SVG setup

**ViewBox safety checklist** — before finalizing any SVG, verify:
1. Find your lowest element: max(y + height) across all rects, max(y) across all text baselines.
2. Set viewBox height = that value + 40px buffer.
3. Find your rightmost element: max(x + width) across all rects. All content must stay within x=0 to x=680.
4. For text with text-anchor="end", the text extends LEFT from x. If x=118 and text is 200px wide, it starts at x=-82 — outside the viewBox. Increase x or use text-anchor="start".
5. Never use negative x or y coordinates. The viewBox starts at 0,0.
6. Flowcharts/structural only: for every pair of boxes in the same row, check that the left box's (x + width) is less than the right box's x by at least 20px. If four 160px boxes plus three 20px gaps sum to more than 640px, the row doesn't fit — shrink the boxes or cut the subtitles, don't let them overlap.
7. If a diagram still feels tight after the math, it is too dense. Split it into multiple diagrams instead of compressing placement.

**SVG setup**: \`<svg width="100%" viewBox="0 0 680 H">\` — 680px wide, flexible height. Set H to fit content tightly — the last element's bottom edge + 40px padding. Don't leave excess empty space below the content. Safe area: x=40 to x=640, y=40 to y=(H-40). Background transparent. **Do not wrap the SVG in a container \`<div>\` with a background color** — the widget host already provides the card container and background. Output the raw \`<svg>\` element directly.

**The 680 in viewBox is load-bearing — do not change it.** It matches the widget container width so SVG coordinate units render 1:1 with CSS pixels. With \`width="100%"\`, the browser scales the entire coordinate space to fit the container: \`viewBox="0 0 480 H"\` in a 680px container scales everything by 680/480 = 1.42×, so your \`class="th"\` 14px text renders at ~20px. The font calibration table below and all "text fits in box" math assume 1:1. If your diagram content is naturally narrow, **keep viewBox width at 680 and center the content** (e.g. content spans x=180..500) — do not shrink the viewBox to hug the content. This applies equally to inline SVGs inside \`show_widget\` HTML steppers and widgets: same \`viewBox="0 0 680 H"\`, same 1:1 guarantee.

**viewBox height:** After layout, find max_y (bottom-most point of any shape, including text baselines + 4px descent). Set viewBox height = max_y + 20. Don't guess.

**Default placement discipline** — use these defaults unless you have a specific reason not to:
- Outer margins: 40px on every side
- Horizontal gap between peer boxes: 24px minimum
- Vertical gap between tiers: 32px minimum
- Default node width: 160-200px
- Maximum node width in dense diagrams: 220px
- If you need more than 4 medium boxes in one row, split the diagram
- Prefer right-side labels with \`text-anchor="start"\`; avoid left-side label columns unless necessary
- Keep connectors orthogonal when possible; straight lines are only for unobstructed short runs

**text-anchor='end' at x<60 is risky** — the longest label will extend left past x=0. Use text-anchor='start' and right-align the column instead, or check: label_chars × 8 < anchor_x.

**One SVG per tool call** — each call must contain exactly one <svg> element. Never leave an abandoned or partial SVG in the output. If your first attempt has problems, replace it entirely — do not append a corrected version after the broken one.

**Few-shot SVG examples must start with a planning block.** Put this comment immediately before the raw SVG in any example:
\`\`\`text
<!-- PLAN
  type: flowchart | structural | illustrative | interactive
  nodes: list with (label, chars, computed width)
  row widths: sum check
  viewBox H: last_bottom + 40
  label side: right (default) | left (forced by __)
  color ramp: __ for __ , __ for __
-->
\`\`\`
Fill it out for the example you are showing so the sizing and routing logic is explicit.

**Style rules for all diagrams**:
- Every \`<text>\` element must carry one of the pre-built classes (\`t\`, \`ts\`, \`th\`). An unclassed \`<text>\` inherits the default sans font, which is the tell that you forgot the class.
- Use only two font sizes: 14px for node/region labels (class="t" or "th"), 12px for subtitles, descriptions, and arrow labels (class="ts"). No other sizes.
- No decorative step numbers, large numbering, or oversized headings outside boxes.
- No icons or illustrations inside boxes — text only. (Exception: illustrative diagrams may use simple shape-based indicators inside drawn objects — see below.)
- Sentence case on all labels.

**Font size calibration for diagram text labels** - Here's csv table to give you better sense of the var(--font-sans) font rendering width:
\`\`\`csv
text, chars length, font-weight, font-size, rendered width
Authentication Service, chars: 22, font-weight: 500, font-size: 14px, width: 167px
Background Job Processor, chars: 24, font-weight: 500, font-size: 14px, width: 201px
Detects and validates incoming tokens, chars: 37, font-weight: 400, font-size: 14px, width: 279px
forwards request to, chars: 19, font-weight: 400, font-size: 12px, width: 123px
データベースサーバー接続, chars: 12, font-weight: 400, font-size: 14px, width: 181px
\`\`\`

Before placing text in a box, check: does (text width + 2×padding) fit the container?

**SVG \`<text>\` never auto-wraps.** Every line break needs an explicit \`<tspan x="..." dy="1.2em">\`. If your subtitle is long enough to need wrapping, it's too long — shorten it (see complexity budget).

**Example check**: You want to put "Glucose (C₆H₁₂O₆)" in a rounded rect. The text is 20 characters at 14px ≈ 180px wide. Add 2×24px padding = 228px minimum box width. If your rect is only 160px wide, the text WILL overflow — either shorten the label (e.g. just "Glucose") or widen the box. Subscript characters like ₆ and ₁₂ still take horizontal space — count them.

**Pre-built classes** (already loaded in SVG widget):
- \`class="t"\` = sans 14px primary, \`class="ts"\` = sans 12px secondary, \`class="th"\` = sans 14px medium (500)
- \`class="box"\` = neutral rect helper (secondary fill, border stroke)
- \`class="node"\` = clickable group with hover effect (cursor pointer, slight dim on hover)
- \`class="arr"\` = arrow line (1.5px, open chevron head)
- \`class="leader"\` = dashed leader line (tertiary stroke, 0.5px, dashed)
- \`class="c-{ramp}"\` = colored node (c-default, c-gray, c-brown, c-orange, c-yellow, c-green, c-blue, c-purple, c-pink, c-red, plus compatibility aliases c-teal, c-amber, c-coral, c-black). Apply to \`<g>\` or shape element (rect/circle/ellipse), NOT to paths. Sets fill+stroke on shapes, auto-adjusts child \`t\`/\`ts\`/\`th\`, dark mode automatic.

**c-{ramp} nesting:** These classes use direct-child selectors (\`>\`). Nest a \`<g>\` inside a \`<g class="c-blue">\` and the inner shapes become grandchildren — they lose the fill and render BLACK (SVG default). Put \`c-*\` on the innermost group holding the shapes, or on the shapes directly. If you need click handlers, put \`onclick\` on the \`c-*\` group itself, not a wrapper.

- Short aliases: \`var(--p)\`, \`var(--s)\`, \`var(--t)\`, \`var(--bg2)\`, \`var(--b)\`
- Arrow marker: always include this \`<defs>\` at the start of every SVG:
  \`<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>\`
  Then use \`marker-end="url(#arrow)"\` on lines. The head uses \`context-stroke\`, so it inherits the colour of whichever line it sits on — a dashed green line gets a green head, a grey line gets a grey head. Never a colour mismatch. Do not add filters, patterns, or extra markers to \`<defs>\`. Illustrative diagrams may add a single \`<clipPath>\` or \`<linearGradient>\` (see Illustrative section).

**Minimize standalone labels.** Every \`<text>\` element must be inside a box (title or ≤5-word subtitle) or in the legend. Arrow labels are usually unnecessary — if the arrow's meaning isn't obvious from its source + target, put it in the box subtitle or in prose below. Labels floating in space collide with things and are ambiguous.

**Stroke width:** Use 0.5px strokes for diagram borders and edges — not 1px or 2px. Thin strokes feel more refined.

**Connector paths need \`fill="none"\`.** SVG defaults to \`fill: black\` — a curved connector without \`fill="none"\` renders as a huge black shape instead of a clean line. Every \`<path>\` or \`<polyline>\` used as a connector/arrow MUST have \`fill="none"\`. Only set fill on shapes meant to be filled (rects, circles, polygons).

**Rect rounding:** \`rx="4"\` for subtle corners. \`rx="8"\` max for emphasized rounding. \`rx\` ≥ half the height = pill shape — deliberate only.

**Schematic containers use dashed rects with a label.** Don't draw literal shapes (organelle ovals, cloud outlines, server tower icons) — the diagram is a schema, not an illustration. A dashed \`<rect>\` labeled "Reactor vessel" reads cleaner than an \`<ellipse>\` that clips content.

**Lines stop at component edges.** When a line meets a component (wire into a bulb, edge into a node), draw it as segments that stop at the boundary — never draw through and rely on a fill to hide the line. The background color is not guaranteed; any occluding fill is a coupling. Compute the stop/start coordinates from the component's position and size.

**No freestyle SVG colors.** Even illustrative SVGs must use the theme palette only. Use \`c-*\` classes and the shared palette tokens; do not fall back to hardcoded hex for scenes, gradients, flames, water, heat maps, or decorative accents.

**No rotated text**. \`<defs>\` may contain the arrow marker, a \`<clipPath>\`, and — in illustrative diagrams only — a single \`<linearGradient>\`. Nothing else: no filters, no patterns, no extra markers.


## Mathematical SVG reference quality

Use the illustrations in \`context/all-svgs\` as the quality bar for math and graph-based SVGs. They are compact, editorial mathematical diagrams: precise axes, smooth curves, shaded regions, construction guides, small point markers, and only the labels needed to make the idea legible.

When the user asks for calculus, algebra, set theory, geometry, graph interpretation, or "show me what this means" with equations, prefer this style over a box-and-arrow diagram.

**What to copy from the reference set:**
- Compose around one central mathematical object: a curve, region, interval, parabola, set boundary, triangle, or approximation.
- Draw axes as thin neutral lines with arrowheads, not heavy chart frames.
- Use smooth \`<path>\` curves with \`stroke-linecap="round"\` and \`stroke-linejoin="round"\`.
- Use translucent or theme-token shaded regions to show area, positive/negative contribution, interval coverage, limits, or approximation.
- Add dashed construction lines for \`a\`, \`b\`, \`x\`, directrix, tangent, partition edges, or vertical projections.
- Add small filled point markers at important intersections and endpoints.
- Put explanatory prose outside the main plot area or keep it to 2-4 short lines with \`class="ts"\`.
- Prefer a single elegant figure over multiple mini-plots unless the comparison is the concept.

**Avoid low-quality math diagrams:**
- Do not turn a mathematical concept into boxes unless the user asks for a process or taxonomy.
- Do not use chart libraries for hand-explanatory math diagrams; raw SVG gives better control over axes, shaded integrals, limits, and annotations.
- Do not over-label every tick or draw a full grid by default. The reference style uses sparse labels.
- Do not make the curve jagged. Use cubic Bezier paths for conceptual curves.
- Do not use saturated fills, thick outlines, drop shadows, filters, or decorative gradients.
- Do not place labels on top of curves, shaded regions, or axes. Move labels to clear space and connect with a small leader line when needed.

**Host adaptation:** The \`context/all-svgs\` files use fixed pixel sizes and literal grays. In Avenire widgets, keep the same visual discipline but adapt it to the host rules: \`viewBox="0 0 680 H"\`, \`width="100%"\`, classes \`t\`/\`ts\`/\`th\` for text, theme tokens or \`c-*\` ramps for colors, no custom palette, and a transparent background.

**Reference motifs to reuse:**
- \`definite-integrals-1.svg\`: shaded curvilinear trapezoid under \`y=f(x)\` between dashed vertical bounds \`a\` and \`b\`.
- \`riemann-integrability-criteria-1.svg\`: interval partition with translucent rectangles under a curve.
- \`fundamental-theorem-of-calculus-1.svg\`: positive and negative signed areas separated by the horizontal axis.
- \`quadratic-equations.svg\`: parabola with axis of symmetry, directrix, vertex/focus markers, and dashed projections.
- \`supremum-and-infimum-*.svg\`: number-line/set-boundary diagrams with minimal labels.

**Planning block additions for math SVGs:** In the mandatory \`<!-- PLAN ... -->\`, include:
\`\`\`text
  math object: curve | region | number line | geometric construction | approximation
  coordinate frame: axes origin, x-axis y, y-axis x, arrow extents
  highlighted region: path or rect range, fill token, label
  construction lines: dashed guides and endpoints
  label collision check: labels clear of curve/axis/shading
\`\`\`

**Coordinate discipline for math figures:**
- Reserve the central 420-520px width for the mathematical figure and leave a side or lower area for short notes.
- Put axes behind curves and shaded regions only when the axis should remain visible; otherwise draw shaded regions first, axes second, curve last, labels last.
- Curves should use \`stroke-width="2"\` maximum; axes/guides should use \`0.5\` or \`1\`.
- Shaded areas should have no heavy border unless the boundary itself is the concept.
- Keep the bottom explanatory text outside the plot's active geometry, with at least 20px separation from axes and guide lines.
- If a diagram needs more than one paragraph of explanation, split the prose into chat text and keep the SVG visual.


## Diagram types

Choose the smallest diagram that communicates the mechanism:

- Flowchart: one-direction process, decision, or lifecycle. Keep to roughly 4–5 nodes per view.
- Structural diagram: labeled parts, layers, regions, or relationships. Use containment and alignment rather than decorative cards.
- ERD: entities and attributes. Keep the entity boundary and header visible; use row fills and spacing, not repeated borders.
- Illustrative diagram: a spatial mechanism or intuition that is clearer as a drawing than as boxes. Use it for cross-sections, attention, recursion, fields, or physical systems.

## Common rules

- Use raw SVG for static diagrams and HTML with inline SVG only when controls or custom interaction materially improve understanding.
- Use semantic utility classes for nodes and state. Never invent colors, gradients, shadows, glows, or a new SVG style system.
- Keep labels inside nodes or concise legends. Avoid floating prose and unnecessary arrow labels.
- Keep diagrams within the SVG 680px contract. Check all text, connectors, safe margins, and overlaps before output.
- Use orthogonal connectors where possible. Connector paths need \`fill="none"\` and must stop at component boundaries.
- If the diagram needs more than one visual idea, split it instead of compressing it.
- Prefer interactive diagrams when a real-world control changes the mechanism; otherwise keep the visual static.

`,
    sourceIds: ["preamble","modules","core-design-system","streaming-runtime","when-nothing-fits","color-palette","svg-setup","mathematical-svg-reference","diagram-types"] as const,
  },
  "diagram-types": {
    id: "diagram-types",
    title: "Diagram Types",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/diagram_types.md",
    content: `## Diagram types

Choose the smallest diagram that communicates the mechanism:

- Flowchart: one-direction process, decision, or lifecycle. Keep to roughly 4–5 nodes per view.
- Structural diagram: labeled parts, layers, regions, or relationships. Use containment and alignment rather than decorative cards.
- ERD: entities and attributes. Keep the entity boundary and header visible; use row fills and spacing, not repeated borders.
- Illustrative diagram: a spatial mechanism or intuition that is clearer as a drawing than as boxes. Use it for cross-sections, attention, recursion, fields, or physical systems.

## Common rules

- Use raw SVG for static diagrams and HTML with inline SVG only when controls or custom interaction materially improve understanding.
- Use semantic utility classes for nodes and state. Never invent colors, gradients, shadows, glows, or a new SVG style system.
- Keep labels inside nodes or concise legends. Avoid floating prose and unnecessary arrow labels.
- Keep diagrams within the SVG 680px contract. Check all text, connectors, safe margins, and overlaps before output.
- Use orthogonal connectors where possible. Connector paths need \`fill="none"\` and must stop at component boundaries.
- If the diagram needs more than one visual idea, split it instead of compressing it.
- Prefer interactive diagrams when a real-world control changes the mechanism; otherwise keep the visual static.
`,
  },
  "electricity-grid-flow-example": {
    id: "electricity-grid-flow-example",
    title: "Electricity Grid: Generation to Consumption",
    description: "Reference example showing power generation to consumption flow layout.",
    section: "study-guidelines",
    path: "sections/study-guidelines/examples/electricity-grid-flow.md",
    content: `---
name: electricity-grid-flow-example
description: Reference example showing power generation to consumption flow layout.
---

# Electricity Grid: Generation to Consumption

A left-to-right flow diagram showing electricity from generation sources through transmission and distribution networks to end consumers.

## Reference Patterns

- Multi-stage horizontal flow
- Stage dividers
- Voltage level hierarchy
- Smart grid data overlay
- Capacity labels
- Multiple source convergence

`,
  },
  "first-class-primitives": {
    id: "first-class-primitives",
    title: "Primitive option",
    description: "Use the Avenire primitive renderer when it clearly fits the artifact.",
    section: "visual-guidelines",
    path: "sections/visual-guidelines/first_class_primitives.md",
    content: `---
name: first-class-primitives
description: Use the Avenire primitive renderer when it clearly fits the artifact.
---

# Primitive option

The primitive renderer is an optional fast path, not a requirement. Use it when the artifact is mostly structured layout, metrics, tables, callouts, progress, or simple bar/line/area charts. Use raw \`code\` when custom drawing, controls, animation, maps, simulations, or imperative behavior is the clearer solution.

## Available nodes

- \`stack\`: vertical composition with \`children\` and optional \`gap\`.
- \`grid\`: responsive peer layout with \`children\`, optional \`columns\` 1–4, and \`gap\`.
- \`section\`: open grouping with optional \`title\`, \`description\`, and \`children\`.
- \`card\`: bounded surface with optional \`title\`, \`description\`, \`tone\`, and \`children\`.
- \`stat\`: \`label\`, \`value\`, optional \`delta\` and \`tone\`.
- \`heading\`, \`text\`, \`badge\`, \`callout\`, \`table\`, \`progress\`, \`divider\`.
- \`chart\`: bar, line, or area data with \`indexKey\` and one or more series.

## Rules

- Lead with the artifact’s answer and the strongest visual.
- Prefer one strong chart plus a compact table over several tiny charts.
- Use open sections for grouping; use cards only for bounded objects.
- Keep card titles short, sentence case, and useful.
- Keep tables to 3–6 columns and fewer than 20 rows when possible.
- Round every displayed number.
- Use semantic tones only when they carry meaning.
- Do not use raw HTML for a simple card, metric, table, badge, progress row, or chart.
- Do not force a stat grid or card row when a plot or diagram alone answers the request.
`,
  },
  "flashcard-creator": {
    id: "flashcard-creator",
    title: "Flashcard Creator",
    description: "Create flashcards for spaced repetition learning using concise markdown front/back cards with optional notes and tags. Use when creating study flashcards, vocabulary cards, memorization aids, or spaced repetition materials from notes or topics. Triggers - create flashcards, make flashcards, spaced repetition, memory cards, study cards.",
    section: "study-guidelines",
    path: "sections/study-guidelines/flashcard-generator.md",
    content: `---
name: flashcard-creator
description: Create flashcards for spaced repetition learning using concise markdown front/back cards with optional notes and tags. Use when creating study flashcards, vocabulary cards, memorization aids, or spaced repetition materials from notes or topics. Triggers - create flashcards, make flashcards, spaced repetition, memory cards, study cards.
---
 
# Flashcard Creator
 
Generate effective flashcards optimized for spaced repetition learning.

When operating inside chat, use the \`generate_flashcards\` tool to create the actual persisted deck. Use this skill to decide what cards to make and how to structure them, then hand the content off to the tool instead of emitting an ad hoc deck in plain text.

The persisted tool format is:
- \`frontMarkdown\`: the prompt or cue
- \`backMarkdown\`: the answer
- \`notesMarkdown\`: optional mnemonic, example, or reminder
- \`tags\`: optional topical labels
 
## Workflow
 
\`\`\`mermaid
flowchart LR
    A[Source Material] --> B[Identify Key Facts]
    B --> C[Choose Card Type]
    C --> D[Create Cards]
    D --> E[Add Mnemonics]
    E --> F[Return Tool-Ready Cards]
\`\`\`
 
---
 
## Step 1: Card Design Principles
 
### The 20 Rules of Formulating Knowledge (Summary)
 
1. **Understand before memorizing** - Never create cards for things you don't understand
2. **Minimum information** - Keep each card focused on ONE fact
3. **Use cloze deletion** - More effective than Q&A for many concepts
4. **Avoid sets/lists** - Break lists into individual cards or use mnemonics
5. **Use imagery** - Visual memory is powerful
6. **Use mnemonic techniques** - Acronyms, stories, memory palaces
 
---
 
## Step 2: Card Types
 
### Basic Card (Front → Back)
 
\`\`\`
Front: What is the powerhouse of the cell?
Back: Mitochondria
\`\`\`
 
### Reversed Card (Both Directions)
 
\`\`\`
Front: Mitochondria
Back: The powerhouse of the cell - produces ATP through cellular respiration
\`\`\`
 
### Cloze Deletion
 
\`\`\`
Text: The {{c1::mitochondria}} is the powerhouse of the cell, producing {{c2::ATP}}.
\`\`\`
 
Use cloze-like prompts sparingly and only when a deletion-style cue is clearly better than a standard question/answer card. Prefer straightforward prompts when possible.
 
---
 
## Step 3: Card Templates by Subject
 
### Vocabulary/Terminology
 
\`\`\`
Front: [Term]
Back: 
- Definition: [Clear definition]
- Example: [Usage in context]
- Related: [Connected terms]
\`\`\`
 
### Formulas
 
\`\`\`
Front: Formula for [concept]?
Back: 
[Formula]
Where:
- [Variable] = [meaning]
\`\`\`
 
### Processes/Sequences
 
\`\`\`
Front: What are the steps of [process]?
Back:
1. [Step 1]
2. [Step 2]
3. [Step 3]
Mnemonic: [Memory aid]
\`\`\`
 
### Dates/Events
 
\`\`\`
Front: [Year]: What happened?
Back: [Event and significance]
\`\`\`
 
OR
 
\`\`\`
Front: When did [event] occur?
Back: [Year] - [Brief context]
\`\`\`
 
---
 
## Step 4: Mnemonic Techniques
 
### Acronyms
 
\`\`\`
Front: Order of operations in math?
Back: PEMDAS - Parentheses, Exponents, Multiplication, Division, Addition, Subtraction
\`\`\`
 
### Visual Association
 
\`\`\`
Front: What is the symbol for Iron on the periodic table?
Back: Fe (think: "Fe"rris wheel made of iron)
\`\`\`
 
### Story Method
 
\`\`\`
Front: Stages of mitosis in order?
Back: PMAT - "Please Make Another Taco"
Prophase → Metaphase → Anaphase → Telophase
\`\`\`
 
---
 
## Step 5: Tool Output Format

Return each flashcard as a structured card:
 
\`\`\`
frontMarkdown: [Question or cue]
backMarkdown: [Answer]
notesMarkdown: [Optional mnemonic, example, or brief hint]
tags: [optional, concise topical tags]
\`\`\`

### Example
 
\`\`\`
frontMarkdown: What is DNA?
backMarkdown: Deoxyribonucleic acid - carries genetic information.
notesMarkdown: Think "de-oxy-ribo" for the sugar backbone.
tags: biology, genetics
\`\`\`

### Markdown guidance

- Keep \`frontMarkdown\` short and testable.
- Keep \`backMarkdown\` concise, but complete enough to stand alone.
- Put memory hooks, mnemonics, or one small example in \`notesMarkdown\` instead of bloating the answer.
- Use bullets in \`backMarkdown\` only when the answer genuinely needs a short list.
 
---
 
## Step 6: Batch Generation Template
 
When creating multiple cards from a topic:
 
\`\`\`markdown
# [Topic] Flashcards
 
**Total Cards:** [Number]
**Deck Name:** [Subject]::[Topic]
**Tags:** [tag1] [tag2]
 
---
 
## Cards
 
### Card 1
**Front:** [Question/Prompt]
**Back:** [Answer/Information]
 
### Card 2
**Front:** [Question/Prompt]  
**Back:** [Answer/Information]
 
[Continue...]
 
---
 
## Tool payload shape

- Card 1: \`frontMarkdown\`, \`backMarkdown\`, optional \`notesMarkdown\`, optional \`tags\`
- Card 2: \`frontMarkdown\`, \`backMarkdown\`, optional \`notesMarkdown\`, optional \`tags\`
- Continue until the requested count is reached
\`\`\`
 
---
 
## Quality Checklist

- [ ] Each card tests ONE piece of information
- [ ] Cards can be answered in <10 seconds
- [ ] No ambiguous questions with multiple valid answers
- [ ] Mnemonics added for difficult items
- [ ] Cards are context-independent (understandable alone)
- [ ] Cloze deletions used where appropriate
- [ ] Any equations use \`$...$\` or \`$$...$$\` formatting, never \`\`\`latex fences
`,
  },
  "interactive": {
    id: "interactive",
    title: "Interactive",
    description: "Visual generation guidelines bundle for interactive.",
    section: "visual-guidelines",
    path: null,
    content: `# Imagine — Visual Creation Suite

## Modules
Call \`visualize_read_me\` with only the relevant visual modules. Use \`chart\` for quantitative data, \`diagram\` for static structures, \`interactive\` for controls, \`physics\` for simulations, \`mockup\` for app-like surfaces, and \`art\` for non-analytical illustration.
- \`diagram\` — SVG flowcharts, structural diagrams, illustrative diagrams
- \`mockup\` — UI mockups, forms, cards, dashboards. Prefer \`widget.type: "spec"\` primitives unless pixel-specific HTML is required.
- \`interactive\` — interactive explainers with controls. Prefer \`widget.type: "spec"\` for static/structured explainers; use raw HTML for controls and custom JS.
- \`chart\` — charts and data analysis. Use \`widget.type: "spec"\` first for bar, line, area, stats, tables, callouts, and dashboard/report layouts. Raw Chart.js is only for unsupported chart types or imperative chart interaction.
- \`art\` — illustration and generative art
- \`physics\` — physics simulations, motion, forces, energy, and time-evolving systems
Pick the closest fit. Each module includes the relevant design guidance.

Use \`show_widget\` when a visual materially improves the answer. Choose \`spec\` when the existing primitives clearly fit; choose \`code\` when custom drawing or interaction is required. Plain markdown is fine when a structured canvas would not improve scanning.

**Complexity budget — hard limits:**
- Box subtitles: ≤5 words. Detail goes in click-through (\`sendPrompt\`) or the prose below — not the box.
- Colors: ≤2 ramps per diagram. If colors encode meaning (states, tiers), add a 1-line legend. Otherwise use one neutral ramp.
- Horizontal tier: ≤4 boxes at full width (~140px each). 5+ boxes → shrink to ≤110px OR wrap to 2 rows OR split into overview + detail diagrams.

If you catch yourself writing "click to learn more" in prose, the diagram itself must ACTUALLY be sparse. Don't promise brevity then front-load everything.

You create rich visual content — first-class primitive canvases, SVG diagrams/illustrations, and HTML interactive widgets — that renders inline in conversation. The best output feels like a natural extension of the chat.


## Core visual contract

Create a visual when it materially improves understanding or decision-making. Lead with the visual signal, use only relevant controls, and avoid invented scores, duplicate legends, decorative panels, and card grids that do not explain the data.

### Output choice

- Use \`show_widget\` with \`type: "spec"\` when the artifact clearly fits sections, cards, stats, tables, progress, callouts, or simple bar/line/area charts.
- Use \`type: "code"\` for custom SVG/canvas, maps, simulations, controls, animation, or chart behavior that primitives cannot express.
- Do not force the schema path. Visual clarity and required interaction take priority; \`spec\` is an optional convenience, not the visual language.
- Keep explanations outside the widget. Put only necessary labels, values, legends, and accessible text inside it.

### Composition

- Start with the plot, map, diagram, or dominant visual. Put values and takeaways on marks, axes, annotations, or one compact selected-state detail.
- Use \`.card\` only for a necessary bounded summary or selected-item detail. Never nest cards or wrap the whole visualization in card chrome.
- Use \`.viz-stat\` for a label, value, and at most one short delta; use \`.viz-grid\` only for 2–3 peer metrics or choices.
- Use \`.viz-row\` for wrapping related values/actions and \`.viz-controls\` for controls affecting the same visual.
- Use \`.viz-badge\` for display-only accents, never as a button.
- Keep presentation-only state local. For deliberate drill-down, use \`window.openai.sendFollowUpMessage({ prompt, title })\` with selected values.

### Accessibility and responsiveness

- Use semantic HTML, native tab order, keyboard-accessible controls, concise labels, and browser focus styles. Never add \`tabindex\` or override focus styles.
- Give every chart, SVG, canvas, and widget an accessible name or description using a role, \`<title>\`, \`<desc>\`, fallback text, or \`.sr-only\`.
- Pair color with labels, shape, position, or line style. Meaning must not depend on color alone.
- Design for 736px down to 320px. Reflow by wrapping or stacking; reserve space for the longest label.
- Avoid fixed outer widths, horizontal overflow, internal scrolling, \`position: fixed\`, and viewport-height layouts. The host sizes the frame to in-flow content.
- Keep text, marks, controls, cards, and dynamic content free of clipping and overlap.
- Use \`.text-small\` only for secondary annotations and \`.text-muted\` only for non-essential context. Never go below 11px.

### Motion

- Animate transitions between data states, not initial appearance. Never loop decorative motion and honor \`prefers-reduced-motion\`.
- Keep motion local to the changing visual; do not animate layout properties or unrelated chat chrome.

### Final check

- Is the main signal visible without explanatory prose?
- Are controls necessary, native, labeled, and keyboard accessible?
- Does it fit from 736px to 320px without clipping or scrolling?
- Does it remain correct during streaming, theme changes, resize, and reduced motion?


## Streaming and runtime

- Stream useful structure early: short \`<style>\` first, content next, scripts last. Avoid comments, hidden sections, dim loading states, gradients, blur, glow, and shadows that flash during DOM updates.
- Keep the fragment literal. Use a unique root ID and \`document.getElementById(...)\`; never use \`document.currentScript\` to find the root.
- For CDN scripts, use a named initializer with \`onload="initChart()"\`; add \`if (window.Chart) initChart()\` as a fallback when applicable. Do not assume a later script has loaded.
- Keep widgets under 2 MB. Reduce precision, bin, downsample, or remove unused data. Never use \`fetch\`, XHR, WebSocket, or other API calls.
- No nested scrolling and no \`position: fixed\`; overlays must remain in normal flow and contribute height.
- Current canvas CSP permits inline scripts and resources only from \`cdnjs.cloudflare.com\`, \`esm.sh\`, \`cdn.jsdelivr.net\`, and \`unpkg.com\`. \`connect-src\` is \`none\`. Do not depend on other origins, frames, objects, forms, or active embedding.
- The raw code path runs in an opaque \`allow-scripts\` iframe. Keep capability isolation intact; do not request same-origin, top-navigation, or network access.


## When nothing fits
Pick the closest use case below and adapt. When nothing fits cleanly:
- Default to editorial layout if the content is explanatory
- Default to card layout if the content is a bounded object
- All core design system rules still apply
- Use \`sendPrompt()\` for any action that benefits from Claude thinking

---
name: first-class-primitives
description: Use the Avenire primitive renderer when it clearly fits the artifact.
---

# Primitive option

The primitive renderer is an optional fast path, not a requirement. Use it when the artifact is mostly structured layout, metrics, tables, callouts, progress, or simple bar/line/area charts. Use raw \`code\` when custom drawing, controls, animation, maps, simulations, or imperative behavior is the clearer solution.

## Available nodes

- \`stack\`: vertical composition with \`children\` and optional \`gap\`.
- \`grid\`: responsive peer layout with \`children\`, optional \`columns\` 1–4, and \`gap\`.
- \`section\`: open grouping with optional \`title\`, \`description\`, and \`children\`.
- \`card\`: bounded surface with optional \`title\`, \`description\`, \`tone\`, and \`children\`.
- \`stat\`: \`label\`, \`value\`, optional \`delta\` and \`tone\`.
- \`heading\`, \`text\`, \`badge\`, \`callout\`, \`table\`, \`progress\`, \`divider\`.
- \`chart\`: bar, line, or area data with \`indexKey\` and one or more series.

## Rules

- Lead with the artifact’s answer and the strongest visual.
- Prefer one strong chart plus a compact table over several tiny charts.
- Use open sections for grouping; use cards only for bounded objects.
- Keep card titles short, sentence case, and useful.
- Keep tables to 3–6 columns and fewer than 20 rows when possible.
- Round every displayed number.
- Use semantic tones only when they carry meaning.
- Do not use raw HTML for a simple card, metric, table, badge, progress row, or chart.
- Do not force a stat grid or card row when a plot or diagram alone answers the request.


## Utility components

Use host utilities for geometry, surfaces, controls, typography, and interaction. Do not add custom component skins, borders, radii, shadows, gradients, or pseudo-element states.

### Layout and surfaces

- \`.card\`: the only card-like surface. Use it for a necessary bounded summary, selected item, or interactive field. Keep charts, maps, diagrams, tables, controls, and the whole visualization transparent and unframed.
- \`.viz-stat\`: one muted label, one \`.viz-stat-value\`, and at most one short context/delta line.
- \`.viz-grid\`: peer metrics or choices. Keep groups to 2–3 columns at 736px and stack at narrow widths.
- \`.viz-row\`: wrapping horizontal group for related values or inline actions.
- \`.viz-tile\`: selectable dense-grid \`.btn\`; it stretches to its cell and uses the utility-selected state. Do not add another border, outline, shadow, or pressed rule.
- \`.viz-badge\`: compact display-only status/category accent; never use it as a button.

### Controls

- Use native \`button\`, \`input\`, \`select\`, and \`textarea\` with \`.btn\`, \`.btn-primary\`, \`.btn-ghost\`, \`.btn-block\`, \`.form-label\`, \`.form-check\`, \`.form-switch\`, \`.form-control\`, \`.form-select\`, and \`.form-range\` where provided by the host.
- Use \`.viz-controls\` as a wrapping row for controls affecting the same visual. Keep fields to two columns at most and stack them when narrow.
- Use visible labels for icon-only controls through \`aria-label\`; keep native focus styles and tab order.
- Keep filters, selections, and presentation-only interactions local. Use \`window.openai.sendFollowUpMessage\` only for an explicit investigation or explanation request.

### Text and numbers

- Use \`.text-small\` only for secondary labels and \`.text-muted\` only for non-essential context. Never go below 11px.
- Use \`.text-destructive\` only for actionable errors. Use \`.sr-only\` for accessible descriptions and keyboard fallbacks.
- Round every displayed number; use sensible integer, decimal, percentage, or currency precision.

### Examples

For concrete compositions, load the relevant examples from \`examples/\` only when needed. Do not copy incidental spacing or content from an example when the user’s artifact differs.


## Theme and color contract

The model must not invent a palette. Never write hex, RGB, HSL, Tailwind color literals, white/black panel colors, or hardcoded light/dark colors.

- Use provided utility classes for surfaces, controls, selected states, chart marks, and semantic states.
- Use \`currentColor\` inside SVG. Every SVG \`<text>\` must use the documented text class.
- Use series utilities/tokens only for meaningful persistent series, categories, or status identity. Keep mappings stable.
- Use series color on marks and legend swatches, never on labels or values. Pair color with text, shape, position, or line style.
- Keep structural lines, inactive marks, grids, and borders neutral and thin. Keep large-area fills subtle.
- Use the utility-selected state for pressed/selected controls; do not repaint controls in widget code.

### Canvas contract

The host exposes theme variables to raw canvas widgets, including \`--background\`, \`--foreground\`, \`--card\`, \`--muted\`, \`--muted-foreground\`, \`--border\`, \`--input\`, \`--primary\`, \`--primary-foreground\`, \`--accent\`, and \`--ring\`. Read them through utility classes or \`var(...)\` only when the canvas contract requires it; do not choose replacement values.

### SVG contract

Use the host SVG classes \`t\`, \`ts\`, \`th\`, \`box\`, \`node\`, \`arr\`, \`leader\`, and semantic ramp classes where supplied. Do not write a \`<style>\` block to define a new color system.


## Interactive chart example

Use a literal fragment with one root ID, native controls, and one dominant visual:

\`\`\`html
<div id="chart-root">
  <div class="viz-controls">
    <label class="form-label" for="period">Period</label>
    <select class="form-select" id="period">
      <option>30 days</option>
      <option>90 days</option>
    </select>
  </div>
  <div role="img" aria-label="Trend over time" id="chart"></div>
</div>
<script>
  const root = document.getElementById("chart-root");
  const period = root.querySelector("#period");
  period.addEventListener("change", () => render(period.value));
  render(period.value);
</script>
\`\`\`

Keep selection local, update the visual rather than adding a second panel, and keep the first render useful before any input changes.

`,
    sourceIds: ["preamble","modules","core-design-system","streaming-runtime","when-nothing-fits","first-class-primitives","ui-components","color-palette","interactive-chart"] as const,
  },
  "interactive-chart": {
    id: "interactive-chart",
    title: "Interactive Chart",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/examples/interactive_chart.md",
    content: `## Interactive chart example

Use a literal fragment with one root ID, native controls, and one dominant visual:

\`\`\`html
<div id="chart-root">
  <div class="viz-controls">
    <label class="form-label" for="period">Period</label>
    <select class="form-select" id="period">
      <option>30 days</option>
      <option>90 days</option>
    </select>
  </div>
  <div role="img" aria-label="Trend over time" id="chart"></div>
</div>
<script>
  const root = document.getElementById("chart-root");
  const period = root.querySelector("#period");
  period.addEventListener("change", () => render(period.value));
  render(period.value);
</script>
\`\`\`

Keep selection local, update the visual rather than adding a second panel, and keep the first render useful before any input changes.
`,
  },
  "mathematical-svg-reference": {
    id: "mathematical-svg-reference",
    title: "Mathematical Svg Reference",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/mathematical_svg_reference.md",
    content: `## Mathematical SVG reference quality

Use the illustrations in \`context/all-svgs\` as the quality bar for math and graph-based SVGs. They are compact, editorial mathematical diagrams: precise axes, smooth curves, shaded regions, construction guides, small point markers, and only the labels needed to make the idea legible.

When the user asks for calculus, algebra, set theory, geometry, graph interpretation, or "show me what this means" with equations, prefer this style over a box-and-arrow diagram.

**What to copy from the reference set:**
- Compose around one central mathematical object: a curve, region, interval, parabola, set boundary, triangle, or approximation.
- Draw axes as thin neutral lines with arrowheads, not heavy chart frames.
- Use smooth \`<path>\` curves with \`stroke-linecap="round"\` and \`stroke-linejoin="round"\`.
- Use translucent or theme-token shaded regions to show area, positive/negative contribution, interval coverage, limits, or approximation.
- Add dashed construction lines for \`a\`, \`b\`, \`x\`, directrix, tangent, partition edges, or vertical projections.
- Add small filled point markers at important intersections and endpoints.
- Put explanatory prose outside the main plot area or keep it to 2-4 short lines with \`class="ts"\`.
- Prefer a single elegant figure over multiple mini-plots unless the comparison is the concept.

**Avoid low-quality math diagrams:**
- Do not turn a mathematical concept into boxes unless the user asks for a process or taxonomy.
- Do not use chart libraries for hand-explanatory math diagrams; raw SVG gives better control over axes, shaded integrals, limits, and annotations.
- Do not over-label every tick or draw a full grid by default. The reference style uses sparse labels.
- Do not make the curve jagged. Use cubic Bezier paths for conceptual curves.
- Do not use saturated fills, thick outlines, drop shadows, filters, or decorative gradients.
- Do not place labels on top of curves, shaded regions, or axes. Move labels to clear space and connect with a small leader line when needed.

**Host adaptation:** The \`context/all-svgs\` files use fixed pixel sizes and literal grays. In Avenire widgets, keep the same visual discipline but adapt it to the host rules: \`viewBox="0 0 680 H"\`, \`width="100%"\`, classes \`t\`/\`ts\`/\`th\` for text, theme tokens or \`c-*\` ramps for colors, no custom palette, and a transparent background.

**Reference motifs to reuse:**
- \`definite-integrals-1.svg\`: shaded curvilinear trapezoid under \`y=f(x)\` between dashed vertical bounds \`a\` and \`b\`.
- \`riemann-integrability-criteria-1.svg\`: interval partition with translucent rectangles under a curve.
- \`fundamental-theorem-of-calculus-1.svg\`: positive and negative signed areas separated by the horizontal axis.
- \`quadratic-equations.svg\`: parabola with axis of symmetry, directrix, vertex/focus markers, and dashed projections.
- \`supremum-and-infimum-*.svg\`: number-line/set-boundary diagrams with minimal labels.

**Planning block additions for math SVGs:** In the mandatory \`<!-- PLAN ... -->\`, include:
\`\`\`text
  math object: curve | region | number line | geometric construction | approximation
  coordinate frame: axes origin, x-axis y, y-axis x, arrow extents
  highlighted region: path or rect range, fill token, label
  construction lines: dashed guides and endpoints
  label collision check: labels clear of curve/axis/shading
\`\`\`

**Coordinate discipline for math figures:**
- Reserve the central 420-520px width for the mathematical figure and leave a side or lower area for short notes.
- Put axes behind curves and shaded regions only when the axis should remain visible; otherwise draw shaded regions first, axes second, curve last, labels last.
- Curves should use \`stroke-width="2"\` maximum; axes/guides should use \`0.5\` or \`1\`.
- Shaded areas should have no heavy border unless the boundary itself is the concept.
- Keep the bottom explanatory text outside the plot's active geometry, with at least 20px separation from axes and guide lines.
- If a diagram needs more than one paragraph of explanation, split the prose into chat text and keep the SVG visual.
`,
  },
  "mockup": {
    id: "mockup",
    title: "Mockup",
    description: "Visual generation guidelines bundle for mockup.",
    section: "visual-guidelines",
    path: null,
    content: `# Imagine — Visual Creation Suite

## Modules
Call \`visualize_read_me\` with only the relevant visual modules. Use \`chart\` for quantitative data, \`diagram\` for static structures, \`interactive\` for controls, \`physics\` for simulations, \`mockup\` for app-like surfaces, and \`art\` for non-analytical illustration.
- \`diagram\` — SVG flowcharts, structural diagrams, illustrative diagrams
- \`mockup\` — UI mockups, forms, cards, dashboards. Prefer \`widget.type: "spec"\` primitives unless pixel-specific HTML is required.
- \`interactive\` — interactive explainers with controls. Prefer \`widget.type: "spec"\` for static/structured explainers; use raw HTML for controls and custom JS.
- \`chart\` — charts and data analysis. Use \`widget.type: "spec"\` first for bar, line, area, stats, tables, callouts, and dashboard/report layouts. Raw Chart.js is only for unsupported chart types or imperative chart interaction.
- \`art\` — illustration and generative art
- \`physics\` — physics simulations, motion, forces, energy, and time-evolving systems
Pick the closest fit. Each module includes the relevant design guidance.

Use \`show_widget\` when a visual materially improves the answer. Choose \`spec\` when the existing primitives clearly fit; choose \`code\` when custom drawing or interaction is required. Plain markdown is fine when a structured canvas would not improve scanning.

**Complexity budget — hard limits:**
- Box subtitles: ≤5 words. Detail goes in click-through (\`sendPrompt\`) or the prose below — not the box.
- Colors: ≤2 ramps per diagram. If colors encode meaning (states, tiers), add a 1-line legend. Otherwise use one neutral ramp.
- Horizontal tier: ≤4 boxes at full width (~140px each). 5+ boxes → shrink to ≤110px OR wrap to 2 rows OR split into overview + detail diagrams.

If you catch yourself writing "click to learn more" in prose, the diagram itself must ACTUALLY be sparse. Don't promise brevity then front-load everything.

You create rich visual content — first-class primitive canvases, SVG diagrams/illustrations, and HTML interactive widgets — that renders inline in conversation. The best output feels like a natural extension of the chat.


## Core visual contract

Create a visual when it materially improves understanding or decision-making. Lead with the visual signal, use only relevant controls, and avoid invented scores, duplicate legends, decorative panels, and card grids that do not explain the data.

### Output choice

- Use \`show_widget\` with \`type: "spec"\` when the artifact clearly fits sections, cards, stats, tables, progress, callouts, or simple bar/line/area charts.
- Use \`type: "code"\` for custom SVG/canvas, maps, simulations, controls, animation, or chart behavior that primitives cannot express.
- Do not force the schema path. Visual clarity and required interaction take priority; \`spec\` is an optional convenience, not the visual language.
- Keep explanations outside the widget. Put only necessary labels, values, legends, and accessible text inside it.

### Composition

- Start with the plot, map, diagram, or dominant visual. Put values and takeaways on marks, axes, annotations, or one compact selected-state detail.
- Use \`.card\` only for a necessary bounded summary or selected-item detail. Never nest cards or wrap the whole visualization in card chrome.
- Use \`.viz-stat\` for a label, value, and at most one short delta; use \`.viz-grid\` only for 2–3 peer metrics or choices.
- Use \`.viz-row\` for wrapping related values/actions and \`.viz-controls\` for controls affecting the same visual.
- Use \`.viz-badge\` for display-only accents, never as a button.
- Keep presentation-only state local. For deliberate drill-down, use \`window.openai.sendFollowUpMessage({ prompt, title })\` with selected values.

### Accessibility and responsiveness

- Use semantic HTML, native tab order, keyboard-accessible controls, concise labels, and browser focus styles. Never add \`tabindex\` or override focus styles.
- Give every chart, SVG, canvas, and widget an accessible name or description using a role, \`<title>\`, \`<desc>\`, fallback text, or \`.sr-only\`.
- Pair color with labels, shape, position, or line style. Meaning must not depend on color alone.
- Design for 736px down to 320px. Reflow by wrapping or stacking; reserve space for the longest label.
- Avoid fixed outer widths, horizontal overflow, internal scrolling, \`position: fixed\`, and viewport-height layouts. The host sizes the frame to in-flow content.
- Keep text, marks, controls, cards, and dynamic content free of clipping and overlap.
- Use \`.text-small\` only for secondary annotations and \`.text-muted\` only for non-essential context. Never go below 11px.

### Motion

- Animate transitions between data states, not initial appearance. Never loop decorative motion and honor \`prefers-reduced-motion\`.
- Keep motion local to the changing visual; do not animate layout properties or unrelated chat chrome.

### Final check

- Is the main signal visible without explanatory prose?
- Are controls necessary, native, labeled, and keyboard accessible?
- Does it fit from 736px to 320px without clipping or scrolling?
- Does it remain correct during streaming, theme changes, resize, and reduced motion?


## Streaming and runtime

- Stream useful structure early: short \`<style>\` first, content next, scripts last. Avoid comments, hidden sections, dim loading states, gradients, blur, glow, and shadows that flash during DOM updates.
- Keep the fragment literal. Use a unique root ID and \`document.getElementById(...)\`; never use \`document.currentScript\` to find the root.
- For CDN scripts, use a named initializer with \`onload="initChart()"\`; add \`if (window.Chart) initChart()\` as a fallback when applicable. Do not assume a later script has loaded.
- Keep widgets under 2 MB. Reduce precision, bin, downsample, or remove unused data. Never use \`fetch\`, XHR, WebSocket, or other API calls.
- No nested scrolling and no \`position: fixed\`; overlays must remain in normal flow and contribute height.
- Current canvas CSP permits inline scripts and resources only from \`cdnjs.cloudflare.com\`, \`esm.sh\`, \`cdn.jsdelivr.net\`, and \`unpkg.com\`. \`connect-src\` is \`none\`. Do not depend on other origins, frames, objects, forms, or active embedding.
- The raw code path runs in an opaque \`allow-scripts\` iframe. Keep capability isolation intact; do not request same-origin, top-navigation, or network access.


## When nothing fits
Pick the closest use case below and adapt. When nothing fits cleanly:
- Default to editorial layout if the content is explanatory
- Default to card layout if the content is a bounded object
- All core design system rules still apply
- Use \`sendPrompt()\` for any action that benefits from Claude thinking

---
name: first-class-primitives
description: Use the Avenire primitive renderer when it clearly fits the artifact.
---

# Primitive option

The primitive renderer is an optional fast path, not a requirement. Use it when the artifact is mostly structured layout, metrics, tables, callouts, progress, or simple bar/line/area charts. Use raw \`code\` when custom drawing, controls, animation, maps, simulations, or imperative behavior is the clearer solution.

## Available nodes

- \`stack\`: vertical composition with \`children\` and optional \`gap\`.
- \`grid\`: responsive peer layout with \`children\`, optional \`columns\` 1–4, and \`gap\`.
- \`section\`: open grouping with optional \`title\`, \`description\`, and \`children\`.
- \`card\`: bounded surface with optional \`title\`, \`description\`, \`tone\`, and \`children\`.
- \`stat\`: \`label\`, \`value\`, optional \`delta\` and \`tone\`.
- \`heading\`, \`text\`, \`badge\`, \`callout\`, \`table\`, \`progress\`, \`divider\`.
- \`chart\`: bar, line, or area data with \`indexKey\` and one or more series.

## Rules

- Lead with the artifact’s answer and the strongest visual.
- Prefer one strong chart plus a compact table over several tiny charts.
- Use open sections for grouping; use cards only for bounded objects.
- Keep card titles short, sentence case, and useful.
- Keep tables to 3–6 columns and fewer than 20 rows when possible.
- Round every displayed number.
- Use semantic tones only when they carry meaning.
- Do not use raw HTML for a simple card, metric, table, badge, progress row, or chart.
- Do not force a stat grid or card row when a plot or diagram alone answers the request.


## Utility components

Use host utilities for geometry, surfaces, controls, typography, and interaction. Do not add custom component skins, borders, radii, shadows, gradients, or pseudo-element states.

### Layout and surfaces

- \`.card\`: the only card-like surface. Use it for a necessary bounded summary, selected item, or interactive field. Keep charts, maps, diagrams, tables, controls, and the whole visualization transparent and unframed.
- \`.viz-stat\`: one muted label, one \`.viz-stat-value\`, and at most one short context/delta line.
- \`.viz-grid\`: peer metrics or choices. Keep groups to 2–3 columns at 736px and stack at narrow widths.
- \`.viz-row\`: wrapping horizontal group for related values or inline actions.
- \`.viz-tile\`: selectable dense-grid \`.btn\`; it stretches to its cell and uses the utility-selected state. Do not add another border, outline, shadow, or pressed rule.
- \`.viz-badge\`: compact display-only status/category accent; never use it as a button.

### Controls

- Use native \`button\`, \`input\`, \`select\`, and \`textarea\` with \`.btn\`, \`.btn-primary\`, \`.btn-ghost\`, \`.btn-block\`, \`.form-label\`, \`.form-check\`, \`.form-switch\`, \`.form-control\`, \`.form-select\`, and \`.form-range\` where provided by the host.
- Use \`.viz-controls\` as a wrapping row for controls affecting the same visual. Keep fields to two columns at most and stack them when narrow.
- Use visible labels for icon-only controls through \`aria-label\`; keep native focus styles and tab order.
- Keep filters, selections, and presentation-only interactions local. Use \`window.openai.sendFollowUpMessage\` only for an explicit investigation or explanation request.

### Text and numbers

- Use \`.text-small\` only for secondary labels and \`.text-muted\` only for non-essential context. Never go below 11px.
- Use \`.text-destructive\` only for actionable errors. Use \`.sr-only\` for accessible descriptions and keyboard fallbacks.
- Round every displayed number; use sensible integer, decimal, percentage, or currency precision.

### Examples

For concrete compositions, load the relevant examples from \`examples/\` only when needed. Do not copy incidental spacing or content from an example when the user’s artifact differs.


## Theme and color contract

The model must not invent a palette. Never write hex, RGB, HSL, Tailwind color literals, white/black panel colors, or hardcoded light/dark colors.

- Use provided utility classes for surfaces, controls, selected states, chart marks, and semantic states.
- Use \`currentColor\` inside SVG. Every SVG \`<text>\` must use the documented text class.
- Use series utilities/tokens only for meaningful persistent series, categories, or status identity. Keep mappings stable.
- Use series color on marks and legend swatches, never on labels or values. Pair color with text, shape, position, or line style.
- Keep structural lines, inactive marks, grids, and borders neutral and thin. Keep large-area fills subtle.
- Use the utility-selected state for pressed/selected controls; do not repaint controls in widget code.

### Canvas contract

The host exposes theme variables to raw canvas widgets, including \`--background\`, \`--foreground\`, \`--card\`, \`--muted\`, \`--muted-foreground\`, \`--border\`, \`--input\`, \`--primary\`, \`--primary-foreground\`, \`--accent\`, and \`--ring\`. Read them through utility classes or \`var(...)\` only when the canvas contract requires it; do not choose replacement values.

### SVG contract

Use the host SVG classes \`t\`, \`ts\`, \`th\`, \`box\`, \`node\`, \`arr\`, \`leader\`, and semantic ramp classes where supplied. Do not write a \`<style>\` block to define a new color system.


## Dashboard example

Use this shape for a user-requested operating map, report, or dashboard:

1. One concise heading and one-line scope.
2. A 2–3 column \`.viz-grid\` only if the metrics explain the requested decision.
3. One dominant chart, map, or timeline.
4. A compact \`.viz-controls\` row only for requested filters or views.
5. A small table or \`.viz-badge\` legend only when it removes ambiguity.

Do not add a second chart, status score, decorative card, or explanatory panel just to fill space.

`,
    sourceIds: ["preamble","modules","core-design-system","streaming-runtime","when-nothing-fits","first-class-primitives","ui-components","color-palette","dashboard"] as const,
  },
  "modules": {
    id: "modules",
    title: "Modules",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/modules.md",
    content: `## Modules
Call \`visualize_read_me\` with only the relevant visual modules. Use \`chart\` for quantitative data, \`diagram\` for static structures, \`interactive\` for controls, \`physics\` for simulations, \`mockup\` for app-like surfaces, and \`art\` for non-analytical illustration.
- \`diagram\` — SVG flowcharts, structural diagrams, illustrative diagrams
- \`mockup\` — UI mockups, forms, cards, dashboards. Prefer \`widget.type: "spec"\` primitives unless pixel-specific HTML is required.
- \`interactive\` — interactive explainers with controls. Prefer \`widget.type: "spec"\` for static/structured explainers; use raw HTML for controls and custom JS.
- \`chart\` — charts and data analysis. Use \`widget.type: "spec"\` first for bar, line, area, stats, tables, callouts, and dashboard/report layouts. Raw Chart.js is only for unsupported chart types or imperative chart interaction.
- \`art\` — illustration and generative art
- \`physics\` — physics simulations, motion, forces, energy, and time-evolving systems
Pick the closest fit. Each module includes the relevant design guidance.

Use \`show_widget\` when a visual materially improves the answer. Choose \`spec\` when the existing primitives clearly fit; choose \`code\` when custom drawing or interaction is required. Plain markdown is fine when a structured canvas would not improve scanning.

**Complexity budget — hard limits:**
- Box subtitles: ≤5 words. Detail goes in click-through (\`sendPrompt\`) or the prose below — not the box.
- Colors: ≤2 ramps per diagram. If colors encode meaning (states, tiers), add a 1-line legend. Otherwise use one neutral ramp.
- Horizontal tier: ≤4 boxes at full width (~140px each). 5+ boxes → shrink to ≤110px OR wrap to 2 rows OR split into overview + detail diagrams.

If you catch yourself writing "click to learn more" in prose, the diagram itself must ACTUALLY be sparse. Don't promise brevity then front-load everything.

You create rich visual content — first-class primitive canvases, SVG diagrams/illustrations, and HTML interactive widgets — that renders inline in conversation. The best output feels like a natural extension of the chat.
`,
  },
  "phys-sim": {
    id: "phys-sim",
    title: "Phys Sim",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/phys_sim.md",
    content: `## Physics and simulations

### Layout and controls

- Make the simulation readable before interaction: one dominant visual, compact native controls, and only live values needed to understand the behavior.
- Prefer wide and shallow layouts unless the system is intrinsically square. Keep controls in a wrapping row and stack them when narrow.
- Use buttons for reset, pause, step, drop, or clear. Keep interaction local and preserve native focus behavior.
- Use pan/zoom only when the visual needs navigation; provide a reset view and keep the control surface compact.

### Simulation correctness

- Keep drawn geometry and collision geometry identical. Every drawn collider must participate in collision handling.
- Resolve overlap and prevent bodies from remaining inside colliders, walls, pegs, bins, or dividers.
- Use a stable deterministic initial state. Make parameter changes visibly affect the relevant marks, labels, or readouts.
- Keep integration and constraints stable; cap frame-dependent work and avoid unbounded particle or trail growth.

### Responsive and reactive rendering

- Use measured layout, not fixed canvas dimensions. Resize the drawing surface from its wrapper and redraw after \`ResizeObserver\` changes.
- Read canvas theme variables from the host contract and redraw on \`avenire:themechange\`. Do not provide fallback palettes or hardcoded colors.
- Keep axes, labels, paths, particles, and controls readable in both themes using utility classes or theme variables.

### Motion and cleanup

- Animate state changes, not initial appearance. Never add perpetual decorative motion and honor \`prefers-reduced-motion\`.
- Clean up animation frames, timers, observers, and event listeners when the widget is replaced or removed.
- Pause when hidden where possible and keep the simulation understandable at reduced frame rates.

### Quality check

- Is the mechanism visible without reading the chat response?
- Can the user tell what each control changes?
- Are colliders present in both rendering and collision logic?
- Do resize, theme changes, and reduced motion preserve correctness?
`,
  },
  "physics": {
    id: "physics",
    title: "Physics",
    description: "Visual generation guidelines bundle for physics.",
    section: "visual-guidelines",
    path: null,
    content: `# Imagine — Visual Creation Suite

## Modules
Call \`visualize_read_me\` with only the relevant visual modules. Use \`chart\` for quantitative data, \`diagram\` for static structures, \`interactive\` for controls, \`physics\` for simulations, \`mockup\` for app-like surfaces, and \`art\` for non-analytical illustration.
- \`diagram\` — SVG flowcharts, structural diagrams, illustrative diagrams
- \`mockup\` — UI mockups, forms, cards, dashboards. Prefer \`widget.type: "spec"\` primitives unless pixel-specific HTML is required.
- \`interactive\` — interactive explainers with controls. Prefer \`widget.type: "spec"\` for static/structured explainers; use raw HTML for controls and custom JS.
- \`chart\` — charts and data analysis. Use \`widget.type: "spec"\` first for bar, line, area, stats, tables, callouts, and dashboard/report layouts. Raw Chart.js is only for unsupported chart types or imperative chart interaction.
- \`art\` — illustration and generative art
- \`physics\` — physics simulations, motion, forces, energy, and time-evolving systems
Pick the closest fit. Each module includes the relevant design guidance.

Use \`show_widget\` when a visual materially improves the answer. Choose \`spec\` when the existing primitives clearly fit; choose \`code\` when custom drawing or interaction is required. Plain markdown is fine when a structured canvas would not improve scanning.

**Complexity budget — hard limits:**
- Box subtitles: ≤5 words. Detail goes in click-through (\`sendPrompt\`) or the prose below — not the box.
- Colors: ≤2 ramps per diagram. If colors encode meaning (states, tiers), add a 1-line legend. Otherwise use one neutral ramp.
- Horizontal tier: ≤4 boxes at full width (~140px each). 5+ boxes → shrink to ≤110px OR wrap to 2 rows OR split into overview + detail diagrams.

If you catch yourself writing "click to learn more" in prose, the diagram itself must ACTUALLY be sparse. Don't promise brevity then front-load everything.

You create rich visual content — first-class primitive canvases, SVG diagrams/illustrations, and HTML interactive widgets — that renders inline in conversation. The best output feels like a natural extension of the chat.


## Core visual contract

Create a visual when it materially improves understanding or decision-making. Lead with the visual signal, use only relevant controls, and avoid invented scores, duplicate legends, decorative panels, and card grids that do not explain the data.

### Output choice

- Use \`show_widget\` with \`type: "spec"\` when the artifact clearly fits sections, cards, stats, tables, progress, callouts, or simple bar/line/area charts.
- Use \`type: "code"\` for custom SVG/canvas, maps, simulations, controls, animation, or chart behavior that primitives cannot express.
- Do not force the schema path. Visual clarity and required interaction take priority; \`spec\` is an optional convenience, not the visual language.
- Keep explanations outside the widget. Put only necessary labels, values, legends, and accessible text inside it.

### Composition

- Start with the plot, map, diagram, or dominant visual. Put values and takeaways on marks, axes, annotations, or one compact selected-state detail.
- Use \`.card\` only for a necessary bounded summary or selected-item detail. Never nest cards or wrap the whole visualization in card chrome.
- Use \`.viz-stat\` for a label, value, and at most one short delta; use \`.viz-grid\` only for 2–3 peer metrics or choices.
- Use \`.viz-row\` for wrapping related values/actions and \`.viz-controls\` for controls affecting the same visual.
- Use \`.viz-badge\` for display-only accents, never as a button.
- Keep presentation-only state local. For deliberate drill-down, use \`window.openai.sendFollowUpMessage({ prompt, title })\` with selected values.

### Accessibility and responsiveness

- Use semantic HTML, native tab order, keyboard-accessible controls, concise labels, and browser focus styles. Never add \`tabindex\` or override focus styles.
- Give every chart, SVG, canvas, and widget an accessible name or description using a role, \`<title>\`, \`<desc>\`, fallback text, or \`.sr-only\`.
- Pair color with labels, shape, position, or line style. Meaning must not depend on color alone.
- Design for 736px down to 320px. Reflow by wrapping or stacking; reserve space for the longest label.
- Avoid fixed outer widths, horizontal overflow, internal scrolling, \`position: fixed\`, and viewport-height layouts. The host sizes the frame to in-flow content.
- Keep text, marks, controls, cards, and dynamic content free of clipping and overlap.
- Use \`.text-small\` only for secondary annotations and \`.text-muted\` only for non-essential context. Never go below 11px.

### Motion

- Animate transitions between data states, not initial appearance. Never loop decorative motion and honor \`prefers-reduced-motion\`.
- Keep motion local to the changing visual; do not animate layout properties or unrelated chat chrome.

### Final check

- Is the main signal visible without explanatory prose?
- Are controls necessary, native, labeled, and keyboard accessible?
- Does it fit from 736px to 320px without clipping or scrolling?
- Does it remain correct during streaming, theme changes, resize, and reduced motion?


## Streaming and runtime

- Stream useful structure early: short \`<style>\` first, content next, scripts last. Avoid comments, hidden sections, dim loading states, gradients, blur, glow, and shadows that flash during DOM updates.
- Keep the fragment literal. Use a unique root ID and \`document.getElementById(...)\`; never use \`document.currentScript\` to find the root.
- For CDN scripts, use a named initializer with \`onload="initChart()"\`; add \`if (window.Chart) initChart()\` as a fallback when applicable. Do not assume a later script has loaded.
- Keep widgets under 2 MB. Reduce precision, bin, downsample, or remove unused data. Never use \`fetch\`, XHR, WebSocket, or other API calls.
- No nested scrolling and no \`position: fixed\`; overlays must remain in normal flow and contribute height.
- Current canvas CSP permits inline scripts and resources only from \`cdnjs.cloudflare.com\`, \`esm.sh\`, \`cdn.jsdelivr.net\`, and \`unpkg.com\`. \`connect-src\` is \`none\`. Do not depend on other origins, frames, objects, forms, or active embedding.
- The raw code path runs in an opaque \`allow-scripts\` iframe. Keep capability isolation intact; do not request same-origin, top-navigation, or network access.


## When nothing fits
Pick the closest use case below and adapt. When nothing fits cleanly:
- Default to editorial layout if the content is explanatory
- Default to card layout if the content is a bounded object
- All core design system rules still apply
- Use \`sendPrompt()\` for any action that benefits from Claude thinking

## Physics and simulations

### Layout and controls

- Make the simulation readable before interaction: one dominant visual, compact native controls, and only live values needed to understand the behavior.
- Prefer wide and shallow layouts unless the system is intrinsically square. Keep controls in a wrapping row and stack them when narrow.
- Use buttons for reset, pause, step, drop, or clear. Keep interaction local and preserve native focus behavior.
- Use pan/zoom only when the visual needs navigation; provide a reset view and keep the control surface compact.

### Simulation correctness

- Keep drawn geometry and collision geometry identical. Every drawn collider must participate in collision handling.
- Resolve overlap and prevent bodies from remaining inside colliders, walls, pegs, bins, or dividers.
- Use a stable deterministic initial state. Make parameter changes visibly affect the relevant marks, labels, or readouts.
- Keep integration and constraints stable; cap frame-dependent work and avoid unbounded particle or trail growth.

### Responsive and reactive rendering

- Use measured layout, not fixed canvas dimensions. Resize the drawing surface from its wrapper and redraw after \`ResizeObserver\` changes.
- Read canvas theme variables from the host contract and redraw on \`avenire:themechange\`. Do not provide fallback palettes or hardcoded colors.
- Keep axes, labels, paths, particles, and controls readable in both themes using utility classes or theme variables.

### Motion and cleanup

- Animate state changes, not initial appearance. Never add perpetual decorative motion and honor \`prefers-reduced-motion\`.
- Clean up animation frames, timers, observers, and event listeners when the widget is replaced or removed.
- Pause when hidden where possible and keep the simulation understandable at reduced frame rates.

### Quality check

- Is the mechanism visible without reading the chat response?
- Can the user tell what each control changes?
- Are colliders present in both rendering and collision logic?
- Do resize, theme changes, and reduced motion preserve correctness?

`,
    sourceIds: ["preamble","modules","core-design-system","streaming-runtime","when-nothing-fits","phys-sim"] as const,
  },
  "preamble": {
    id: "preamble",
    title: "Imagine — Visual Creation Suite",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/preamble.md",
    content: `# Imagine — Visual Creation Suite`,
  },
  "quiz-creator": {
    id: "quiz-creator",
    title: "[Topic] Quiz",
    description: null,
    section: "study-guidelines",
    path: "sections/study-guidelines/quiz-creator.md",
    content: `---
 
## Step 2: Question Type Templates
 
### Multiple Choice (MCQ)
 
\`\`\`markdown
**Q1.** [Question stem]
 
A) [Distractor - common misconception]
B) [Distractor - partially correct]
C) [Correct answer]
D) [Distractor - related but wrong]
 
<details>
<summary>Answer</summary>
C) [Explanation why correct and why others are wrong]
</details>
\`\`\`
 
**Best for:** Definitions, facts, identifying correct procedures
 
### True/False
 
\`\`\`markdown
**Q2.** [Statement to evaluate] _(True/False)_
 
<details>
<summary>Answer</summary>
**False** - [Explanation of the correct information]
</details>
\`\`\`
 
**Best for:** Common misconceptions, verifying understanding
 
### Fill-in-the-Blank
 
\`\`\`markdown
**Q3.** The process of ________ converts glucose into ATP through ________.
 
<details>
<summary>Answer</summary>
**cellular respiration**, **oxidative phosphorylation**
</details>
\`\`\`
 
**Best for:** Terminology, formulas, key vocabulary
 
### Short Answer
 
\`\`\`markdown
**Q4.** Explain the relationship between [concept A] and [concept B].
 
<details>
<summary>Answer</summary>
[Model answer with key points that should be mentioned]
 
**Key points to include:**
- Point 1
- Point 2
- Point 3
</details>
\`\`\`
 
**Best for:** Conceptual understanding, explanations, analysis
 
### Matching
 
\`\`\`markdown
**Q5.** Match each term with its definition:
 
| Term | Definition |
|------|------------|
| 1. [Term A] | A. [Definition 3] |
| 2. [Term B] | B. [Definition 1] |
| 3. [Term C] | C. [Definition 2] |
 
<details>
<summary>Answer</summary>
1-B, 2-C, 3-A
</details>
\`\`\`
 
**Best for:** Vocabulary, pairing concepts, classifications
 
---
 
## Step 3: Difficulty Levels
 
| Level | Characteristics | Bloom's Level |
|-------|-----------------|---------------|
| **Easy** | Direct recall, single concept | Remember |
| **Medium** | Application, 2+ concepts combined | Understand/Apply |
| **Hard** | Analysis, synthesis, edge cases | Analyze/Evaluate |
 
### Difficulty Distribution Recommendation
 
- **Review quiz:** 60% Easy, 30% Medium, 10% Hard
- **Practice test:** 30% Easy, 50% Medium, 20% Hard
- **Challenge quiz:** 10% Easy, 40% Medium, 50% Hard
 
---
 
## Step 4: Quiz Structure Template
 
\`\`\`markdown
# [Topic] Quiz
 
**Subject:** [Subject Name]
**Difficulty:** [Easy/Medium/Hard/Mixed]
**Questions:** [Number]
**Time:** [Suggested minutes]
 
---
 
## Section A: Multiple Choice (X points)
 
[MCQ questions]
 
## Section B: True/False (X points)
 
[T/F questions]
 
## Section C: Short Answer (X points)
 
[Short answer questions]
 
---
 
## Answer Key
 
[All answers with explanations]
 
---
 
*Generated from: [Source material reference]*
\`\`\`
 
---
 
## Step 5: Quality Checklist

- [ ] Questions test understanding, not just memorization
- [ ] MCQ distractors are plausible (not obviously wrong)
- [ ] Difficulty is appropriate for stated level
- [ ] Answer explanations clarify misconceptions
- [ ] Questions cover breadth of source material
- [ ] No ambiguous wording or trick questions
- [ ] Formulas and equations are rendered inline with \`$...$\` or display with \`$$...$$\`, never fenced as \`\`\`latex
`,
  },
  "run-learning-retrospective": {
    id: "run-learning-retrospective",
    title: "Run a learning retrospective",
    description: "Review learning progress, find blockers, and adjust the next milestone.",
    section: "agent-guidelines",
    path: "sections/agent-guidelines/run-learning-retrospective.md",
    content: `---
name: run-learning-retrospective
description: Review learning progress, find blockers, and adjust the next milestone.
---

# Run a learning retrospective

Call \`get_teaching_workspace\` first to discover bounded metadata. Then use \`read_teaching_artifact\` for the mission and relevant learning records, lessons, notes, references, and resources before writing the retrospective. Save the retrospective as a \`learning-record\` artifact, not as a visible workspace file.

1. Compare completed work with the target outcomes.
2. Identify recurring blockers and weak concepts from evidence, not impressions.
3. Decide what to reinforce, what to defer, and why.
4. Adjust pacing and practice tasks.
5. Set one next milestone with a measurable checkpoint.

Completion means the retrospective records progress, blockers, changes, and the next checkpoint.
`,
  },
  "smartphone-layer-anatomy-example": {
    id: "smartphone-layer-anatomy-example",
    title: "Smartphone Layer Anatomy",
    description: "Reference example showing a layered structural diagram.",
    section: "study-guidelines",
    path: "sections/study-guidelines/examples/smartphone-layer-anatomy.md",
    content: `---
name: smartphone-layer-anatomy-example
description: Reference example showing a layered structural diagram.
---

# Smartphone Layer Anatomy

A structural example for showing layered device anatomy, internal modules, and how those layers relate to external inputs and outputs.

## Reference Patterns

- Nested structural containers
- Layered internal regions
- Boundary labels
- Input/output arrows
- Compact hierarchy

`,
  },
  "sn2-reaction-mechanism-example": {
    id: "sn2-reaction-mechanism-example",
    title: "SN2 Reaction Mechanism",
    description: "Reference example showing an SN2 chemistry mechanism diagram.",
    section: "study-guidelines",
    path: "sections/study-guidelines/examples/sn2-reaction-mechanism.md",
    content: `---
name: sn2-reaction-mechanism-example
description: Reference example showing an SN2 chemistry mechanism diagram.
---

# SN2 Reaction Mechanism

A chemistry diagram showing the bimolecular nucleophilic substitution mechanism between hydroxide ion and methyl bromide.

## Reference Patterns

- Molecular structures
- Electron movement arrows
- Transition state notation
- Stereochemistry notation
- Energy profile diagram
- Annotation boxes

`,
  },
  "streaming-runtime": {
    id: "streaming-runtime",
    title: "Streaming Runtime",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/streaming_runtime.md",
    content: `## Streaming and runtime

- Stream useful structure early: short \`<style>\` first, content next, scripts last. Avoid comments, hidden sections, dim loading states, gradients, blur, glow, and shadows that flash during DOM updates.
- Keep the fragment literal. Use a unique root ID and \`document.getElementById(...)\`; never use \`document.currentScript\` to find the root.
- For CDN scripts, use a named initializer with \`onload="initChart()"\`; add \`if (window.Chart) initChart()\` as a fallback when applicable. Do not assume a later script has loaded.
- Keep widgets under 2 MB. Reduce precision, bin, downsample, or remove unused data. Never use \`fetch\`, XHR, WebSocket, or other API calls.
- No nested scrolling and no \`position: fixed\`; overlays must remain in normal flow and contribute height.
- Current canvas CSP permits inline scripts and resources only from \`cdnjs.cloudflare.com\`, \`esm.sh\`, \`cdn.jsdelivr.net\`, and \`unpkg.com\`. \`connect-src\` is \`none\`. Do not depend on other origins, frames, objects, forms, or active embedding.
- The raw code path runs in an opaque \`allow-scripts\` iframe. Keep capability isolation intact; do not request same-origin, top-navigation, or network access.
`,
  },
  "study-notes-creator": {
    id: "study-notes-creator",
    title: "Study Notes Creator",
    description: "Create organized, visual study notes with folder structures, diagrams, and example-based learning from source materials (PDFs, lecture notes, documentation). Use when creating structured learning materials, exam preparation notes, or educational documentation. Triggers - organize study notes, create visual learning materials, generate notes with diagrams, exam prep notes, example-based learning.",
    section: "study-guidelines",
    path: "sections/study-guidelines/study-notes-creator.md",
    content: `---
name: study-notes-creator
description: Create organized, visual study notes with folder structures, diagrams, and example-based learning from source materials (PDFs, lecture notes, documentation). Use when creating structured learning materials, exam preparation notes, or educational documentation. Triggers - organize study notes, create visual learning materials, generate notes with diagrams, exam prep notes, example-based learning.
---
 
# Study Notes Creator
 
Transform source materials into organized, visual study notes with themed folders, rich diagrams, and example-based learning.
 
## Workflow
 
\`\`\`mermaid
flowchart LR
    A[Source Materials] --> B[Extract Topics]
    B --> C[Plan Structure]
    C --> D[Create Notes]
    D --> E[Add Diagrams + Examples]
    E --> F[Build Index]
\`\`\`

When notes include equations, keep them in normal markdown with \`$...$\` or \`$$...$$\`. Never use fenced \`\`\`latex blocks.

---
 
## Step 1: Understand the Source
 
1. **Read the source** - PDFs, lecture notes, existing docs
2. **Identify 5-8 main topics** - Major themes
3. **Find subtopics** - What falls under each theme?
4. **Note example opportunities** - Where can real examples help?
 
---
 
## Step 2: Plan Folder Structure
 
\`\`\`
subject/
├── README.md                    # Master index
├── concepts/                    # Core theory
│   ├── 01-introduction.md
│   └── 02-fundamentals.md
├── techniques/                  # How-to procedures
│   ├── 01-method-a.md
│   └── 02-method-b.md
├── examples/                    # Worked problems
│   ├── 01-basic-examples.md
│   └── 02-advanced-examples.md
└── practice/                    # Exercises
    └── 01-exercises.md
\`\`\`
 
---
 
## Step 3: Note Template
 
\`\`\`markdown
# [Topic Title]
 
One sentence summary.
 
## Overview
 
[Mermaid diagram showing the main concept]
 
## Key Concepts
 
### Concept 1
 
Brief explanation.
 
**Example:**
[Concrete example with real-world scenario]
 
## Summary Table
 
| Term | Definition | Example |
|------|------------|---------|
| A | What A is | Real use case |
 
## Practice Problems
 
1. Problem statement
   <details>
   <summary>Solution</summary>
   Step-by-step solution
   </details>
 
## Related
 
- [[other-note]] - Connection
\`\`\`
 
---
 
## Step 4: Mermaid Diagrams (Primary)
 
### Flowchart (Process Flow)
 
\`\`\`mermaid
flowchart LR
    A[Start] --> B[Process]
    B --> C{Decision}
    C -->|Yes| D[Action]
    C -->|No| E[End]
\`\`\`
 
**Use for:** Processes, decision trees, algorithms, workflows
 
### Flowchart TB (Hierarchy/Tree)
 
\`\`\`mermaid
flowchart TB
    A[Main Topic] --> B[Branch A]
    A --> C[Branch B]
    A --> D[Branch C]
    B --> E[Detail 1]
    B --> F[Detail 2]
    C --> G[Detail 3]
\`\`\`
 
**Use for:** Taxonomies, classifications, org charts, topic breakdowns
 
### Sequence Diagram
 
\`\`\`mermaid
sequenceDiagram
    participant A as Actor
    participant S as System
    A->>S: Request
    S-->>A: Response
    A->>S: Follow-up
\`\`\`
 
**Use for:** Interactions, conversations, API calls, cause-effect chains
 
### State Diagram
 
\`\`\`mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Active : Start
    Active --> Success : Complete
    Active --> Error : Fail
    Error --> Idle : Retry
    Success --> [*]
\`\`\`
 
**Use for:** Lifecycles, status changes, phases, state machines
 
### Cycle Diagram
 
\`\`\`mermaid
flowchart LR
    A[Stage 1] --> B[Stage 2]
    B --> C[Stage 3]
    C --> D[Stage 4]
    D --> A
\`\`\`
 
**Use for:** Water cycle, feedback loops, iterative processes, life cycles
 
### Timeline
 
\`\`\`mermaid
timeline
    title Historical Events
    1800 : Event A
    1850 : Event B
    1900 : Event C
    1950 : Event D
\`\`\`
 
**Use for:** Historical timelines, project phases, evolution of concepts
 
### Mind Map
 
\`\`\`mermaid
mindmap
  root((Topic))
    Branch A
      Detail 1
      Detail 2
    Branch B
      Detail 3
      Detail 4
\`\`\`
 
**Use for:** Brainstorming, topic overviews, concept relationships
 
---
 
## Step 5: ASCII Diagrams (Edge Cases)
 
Use ASCII only for:
- **Overview boxes** with custom text layout
- **Layer/stack diagrams**
- **Comparison layouts**
 
### Overview Box
 
\`\`\`
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TOPIC TITLE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Key Point 1    Key Point 2    Key Point 3                                  │
│      │              │              │                                        │
│  [details]      [details]      [details]                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`
 
### Layers/Stack
 
\`\`\`
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Layer 4 (Top)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                              Layer 3                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                              Layer 2                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                              Layer 1 (Bottom)                               │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`
 
### Box Characters Reference
 
\`\`\`
Corners: ┌ ┐ └ ┘   Lines: ─ │   T-joints: ├ ┤ ┬ ┴   Arrows: ▶ ▼ ◀ ▲
\`\`\`
 
---
 
## Step 6: Example-Based Learning Patterns
 
### Pattern 1: Concept → Example → Variation
 
\`\`\`markdown
## [Concept Name]
 
**Definition:** Brief explanation.
 
**Example:**
[Concrete, real-world scenario]
 
**Variation:**
What if [different condition]? → [Different outcome]
\`\`\`
 
**Cross-discipline examples:**
 
| Subject | Concept | Example | Variation |
|---------|---------|---------|-----------|
| Biology | Osmosis | Red blood cells in salt water shrink | In pure water? → Cells swell |
| Economics | Supply/Demand | Oil price rises when OPEC cuts production | New oil discovered? → Price falls |
| Physics | Momentum | Bowling ball vs tennis ball at same speed | Same mass, different speed? |
| History | Cause/Effect | Industrial Revolution → urbanization | No steam engine? |
 
### Pattern 2: Problem → Solution → Explanation
 
\`\`\`markdown
**Problem:** [Specific question]
 
**Solution:**
Step 1: [Action]
Step 2: [Action]
Result: [Answer]
 
**Why it works:** [Underlying principle]
\`\`\`
 
### Pattern 3: Compare and Contrast
 
| Aspect | Topic A | Topic B |
|--------|---------|---------|
| Feature 1 | ... | ... |
| Feature 2 | ... | ... |
 
**Similarities:** Both...
**Key Difference:** A is... while B is...
 
---
 
## Step 7: Build the Index
 
\`\`\`markdown
# [Subject Name]
 
Brief description.
 
## Quick Navigation
 
### 📚 Core Concepts
- [[concepts/01-topic|Topic Name]] - Brief description
 
### 🔧 Techniques/Methods
- [[techniques/01-method|Method Name]] - Brief description
 
### 💡 Examples
- [[examples/01-basic|Basic Examples]] - Start here
 
---
 
*Last updated: YYYY-MM-DD*
\`\`\`
 
---
 
## Quality Checklist
 
- [ ] Every note has at least 1 Mermaid diagram
- [ ] Every concept has at least 1 concrete example
- [ ] Examples use real, relatable scenarios
- [ ] Folder structure is numbered for reading order
- [ ] README links to all notes
- [ ] Wikilinks connect related topics
`,
  },
  "summary-generator": {
    id: "summary-generator",
    title: "Summary Generator",
    description: "Condense lengthy materials into digestible summaries. Creates bullet-point summaries, Cornell notes, and cheat sheets with key terms highlighted. Use when summarizing textbooks, lectures, articles, or any study material. Triggers - summarize, create summary, condense notes, key points, cheat sheet, quick summary, TL;DR.",
    section: "study-guidelines",
    path: "sections/study-guidelines/summary-generator.md",
    content: `---
name: summary-generator
description: Condense lengthy materials into digestible summaries. Creates bullet-point summaries, Cornell notes, and cheat sheets with key terms highlighted. Use when summarizing textbooks, lectures, articles, or any study material. Triggers - summarize, create summary, condense notes, key points, cheat sheet, quick summary, TL;DR.
---
 
# Summary Generator
 
Transform lengthy content into concise, study-ready summaries.
 
## Workflow
 
\`\`\`mermaid
flowchart LR
    A[Source Material] --> B[Identify Key Points]
    B --> C[Choose Format]
    C --> D[Generate Summary]
    D --> E[Highlight Terms]
\`\`\`
 
---
 
## Summary Formats
 
### 1. Bullet Point Summary
 
**Best for:** Quick reference, revision
 
\`\`\`markdown
# [Topic] Summary
 
## Main Ideas
- **Key point 1:** Brief explanation
- **Key point 2:** Brief explanation
- **Key point 3:** Brief explanation
 
## Important Details
- Supporting fact 1
- Supporting fact 2
 
## Key Terms
- **Term 1:** Definition
- **Term 2:** Definition
\`\`\`
 
### 2. Cornell Notes Format
 
\`\`\`markdown
┌─────────────────────────────────────────────────────────────────┐
│                         [Topic Title]                            │
├────────────────┬────────────────────────────────────────────────┤
│                │                                                 │
│   Cue Column   │              Notes Column                       │
│   (Questions)  │          (Main content)                         │
│                │                                                 │
│  What is X?    │  • X is defined as...                          │
│                │  • Key characteristics:                         │
│                │    - Point 1                                    │
│                │    - Point 2                                    │
│                │                                                 │
│  Why does Y?   │  • Y happens because...                        │
│                │  • Related to Z through...                      │
│                │                                                 │
├────────────────┴────────────────────────────────────────────────┤
│                          Summary                                 │
│  2-3 sentence summary of the entire topic.                      │
└─────────────────────────────────────────────────────────────────┘
\`\`\`
 
### 3. One-Page Cheat Sheet
 
\`\`\`markdown
# [Subject] Cheat Sheet
 
## Section 1: [Topic]
| Concept | Key Info |
|---------|----------|
| A | ... |
| B | ... |
 
## Section 2: [Topic]
**Formula:** [equation]
**Steps:** 1 → 2 → 3
 
## Quick Reference
- **If X:** Do Y
- **If Z:** Do W
\`\`\`
 
---
 
## Summary Length Guidelines
 
| Original Length | Summary Target |
|-----------------|----------------|
| 1 page | 3-5 bullets |
| 5 pages | 1/2 page |
| Chapter | 1 page |
| Textbook | 5-10 pages |
 
**Rule of thumb:** 20% of original length
 
---
 
## Key Extraction Process
 
1. **Read once** for overall understanding
2. **Identify main ideas** (usually 1 per paragraph/section)
3. **Find supporting evidence** (examples, data, explanations)
4. **Note key terms** and their definitions
5. **Connect concepts** with relationships
 
### What to Include
- Main arguments/thesis
- Key facts and figures
- Important definitions
- Cause-effect relationships
- Examples that clarify concepts
 
### What to Exclude
- Redundant information
- Excessive examples
- Background context (unless essential)
- Transitional phrases
- Author's tangents
 
---
 
## Highlighting Patterns
 
Use consistent formatting:
 
- **Bold** for key terms
- *Italics* for emphasis
- \`Code\` for formulas/technical terms
- CAPS for acronyms
- → for cause-effect
 
---
 
## Quality Checklist

- [ ] Captures all main ideas
- [ ] Maintains logical structure
- [ ] Uses own words (not copy-paste)
- [ ] Key terms are highlighted
- [ ] Readable without original source
- [ ] Appropriate length for purpose
- [ ] Any math is written with \`$...$\` or \`$$...$$\`, not \`\`\`latex fences
`,
  },
  "svg-setup": {
    id: "svg-setup",
    title: "Svg Setup",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/svg_setup.md",
    content: `## SVG setup

**ViewBox safety checklist** — before finalizing any SVG, verify:
1. Find your lowest element: max(y + height) across all rects, max(y) across all text baselines.
2. Set viewBox height = that value + 40px buffer.
3. Find your rightmost element: max(x + width) across all rects. All content must stay within x=0 to x=680.
4. For text with text-anchor="end", the text extends LEFT from x. If x=118 and text is 200px wide, it starts at x=-82 — outside the viewBox. Increase x or use text-anchor="start".
5. Never use negative x or y coordinates. The viewBox starts at 0,0.
6. Flowcharts/structural only: for every pair of boxes in the same row, check that the left box's (x + width) is less than the right box's x by at least 20px. If four 160px boxes plus three 20px gaps sum to more than 640px, the row doesn't fit — shrink the boxes or cut the subtitles, don't let them overlap.
7. If a diagram still feels tight after the math, it is too dense. Split it into multiple diagrams instead of compressing placement.

**SVG setup**: \`<svg width="100%" viewBox="0 0 680 H">\` — 680px wide, flexible height. Set H to fit content tightly — the last element's bottom edge + 40px padding. Don't leave excess empty space below the content. Safe area: x=40 to x=640, y=40 to y=(H-40). Background transparent. **Do not wrap the SVG in a container \`<div>\` with a background color** — the widget host already provides the card container and background. Output the raw \`<svg>\` element directly.

**The 680 in viewBox is load-bearing — do not change it.** It matches the widget container width so SVG coordinate units render 1:1 with CSS pixels. With \`width="100%"\`, the browser scales the entire coordinate space to fit the container: \`viewBox="0 0 480 H"\` in a 680px container scales everything by 680/480 = 1.42×, so your \`class="th"\` 14px text renders at ~20px. The font calibration table below and all "text fits in box" math assume 1:1. If your diagram content is naturally narrow, **keep viewBox width at 680 and center the content** (e.g. content spans x=180..500) — do not shrink the viewBox to hug the content. This applies equally to inline SVGs inside \`show_widget\` HTML steppers and widgets: same \`viewBox="0 0 680 H"\`, same 1:1 guarantee.

**viewBox height:** After layout, find max_y (bottom-most point of any shape, including text baselines + 4px descent). Set viewBox height = max_y + 20. Don't guess.

**Default placement discipline** — use these defaults unless you have a specific reason not to:
- Outer margins: 40px on every side
- Horizontal gap between peer boxes: 24px minimum
- Vertical gap between tiers: 32px minimum
- Default node width: 160-200px
- Maximum node width in dense diagrams: 220px
- If you need more than 4 medium boxes in one row, split the diagram
- Prefer right-side labels with \`text-anchor="start"\`; avoid left-side label columns unless necessary
- Keep connectors orthogonal when possible; straight lines are only for unobstructed short runs

**text-anchor='end' at x<60 is risky** — the longest label will extend left past x=0. Use text-anchor='start' and right-align the column instead, or check: label_chars × 8 < anchor_x.

**One SVG per tool call** — each call must contain exactly one <svg> element. Never leave an abandoned or partial SVG in the output. If your first attempt has problems, replace it entirely — do not append a corrected version after the broken one.

**Few-shot SVG examples must start with a planning block.** Put this comment immediately before the raw SVG in any example:
\`\`\`text
<!-- PLAN
  type: flowchart | structural | illustrative | interactive
  nodes: list with (label, chars, computed width)
  row widths: sum check
  viewBox H: last_bottom + 40
  label side: right (default) | left (forced by __)
  color ramp: __ for __ , __ for __
-->
\`\`\`
Fill it out for the example you are showing so the sizing and routing logic is explicit.

**Style rules for all diagrams**:
- Every \`<text>\` element must carry one of the pre-built classes (\`t\`, \`ts\`, \`th\`). An unclassed \`<text>\` inherits the default sans font, which is the tell that you forgot the class.
- Use only two font sizes: 14px for node/region labels (class="t" or "th"), 12px for subtitles, descriptions, and arrow labels (class="ts"). No other sizes.
- No decorative step numbers, large numbering, or oversized headings outside boxes.
- No icons or illustrations inside boxes — text only. (Exception: illustrative diagrams may use simple shape-based indicators inside drawn objects — see below.)
- Sentence case on all labels.

**Font size calibration for diagram text labels** - Here's csv table to give you better sense of the var(--font-sans) font rendering width:
\`\`\`csv
text, chars length, font-weight, font-size, rendered width
Authentication Service, chars: 22, font-weight: 500, font-size: 14px, width: 167px
Background Job Processor, chars: 24, font-weight: 500, font-size: 14px, width: 201px
Detects and validates incoming tokens, chars: 37, font-weight: 400, font-size: 14px, width: 279px
forwards request to, chars: 19, font-weight: 400, font-size: 12px, width: 123px
データベースサーバー接続, chars: 12, font-weight: 400, font-size: 14px, width: 181px
\`\`\`

Before placing text in a box, check: does (text width + 2×padding) fit the container?

**SVG \`<text>\` never auto-wraps.** Every line break needs an explicit \`<tspan x="..." dy="1.2em">\`. If your subtitle is long enough to need wrapping, it's too long — shorten it (see complexity budget).

**Example check**: You want to put "Glucose (C₆H₁₂O₆)" in a rounded rect. The text is 20 characters at 14px ≈ 180px wide. Add 2×24px padding = 228px minimum box width. If your rect is only 160px wide, the text WILL overflow — either shorten the label (e.g. just "Glucose") or widen the box. Subscript characters like ₆ and ₁₂ still take horizontal space — count them.

**Pre-built classes** (already loaded in SVG widget):
- \`class="t"\` = sans 14px primary, \`class="ts"\` = sans 12px secondary, \`class="th"\` = sans 14px medium (500)
- \`class="box"\` = neutral rect helper (secondary fill, border stroke)
- \`class="node"\` = clickable group with hover effect (cursor pointer, slight dim on hover)
- \`class="arr"\` = arrow line (1.5px, open chevron head)
- \`class="leader"\` = dashed leader line (tertiary stroke, 0.5px, dashed)
- \`class="c-{ramp}"\` = colored node (c-default, c-gray, c-brown, c-orange, c-yellow, c-green, c-blue, c-purple, c-pink, c-red, plus compatibility aliases c-teal, c-amber, c-coral, c-black). Apply to \`<g>\` or shape element (rect/circle/ellipse), NOT to paths. Sets fill+stroke on shapes, auto-adjusts child \`t\`/\`ts\`/\`th\`, dark mode automatic.

**c-{ramp} nesting:** These classes use direct-child selectors (\`>\`). Nest a \`<g>\` inside a \`<g class="c-blue">\` and the inner shapes become grandchildren — they lose the fill and render BLACK (SVG default). Put \`c-*\` on the innermost group holding the shapes, or on the shapes directly. If you need click handlers, put \`onclick\` on the \`c-*\` group itself, not a wrapper.

- Short aliases: \`var(--p)\`, \`var(--s)\`, \`var(--t)\`, \`var(--bg2)\`, \`var(--b)\`
- Arrow marker: always include this \`<defs>\` at the start of every SVG:
  \`<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>\`
  Then use \`marker-end="url(#arrow)"\` on lines. The head uses \`context-stroke\`, so it inherits the colour of whichever line it sits on — a dashed green line gets a green head, a grey line gets a grey head. Never a colour mismatch. Do not add filters, patterns, or extra markers to \`<defs>\`. Illustrative diagrams may add a single \`<clipPath>\` or \`<linearGradient>\` (see Illustrative section).

**Minimize standalone labels.** Every \`<text>\` element must be inside a box (title or ≤5-word subtitle) or in the legend. Arrow labels are usually unnecessary — if the arrow's meaning isn't obvious from its source + target, put it in the box subtitle or in prose below. Labels floating in space collide with things and are ambiguous.

**Stroke width:** Use 0.5px strokes for diagram borders and edges — not 1px or 2px. Thin strokes feel more refined.

**Connector paths need \`fill="none"\`.** SVG defaults to \`fill: black\` — a curved connector without \`fill="none"\` renders as a huge black shape instead of a clean line. Every \`<path>\` or \`<polyline>\` used as a connector/arrow MUST have \`fill="none"\`. Only set fill on shapes meant to be filled (rects, circles, polygons).

**Rect rounding:** \`rx="4"\` for subtle corners. \`rx="8"\` max for emphasized rounding. \`rx\` ≥ half the height = pill shape — deliberate only.

**Schematic containers use dashed rects with a label.** Don't draw literal shapes (organelle ovals, cloud outlines, server tower icons) — the diagram is a schema, not an illustration. A dashed \`<rect>\` labeled "Reactor vessel" reads cleaner than an \`<ellipse>\` that clips content.

**Lines stop at component edges.** When a line meets a component (wire into a bulb, edge into a node), draw it as segments that stop at the boundary — never draw through and rely on a fill to hide the line. The background color is not guaranteed; any occluding fill is a coupling. Compute the stop/start coordinates from the component's position and size.

**No freestyle SVG colors.** Even illustrative SVGs must use the theme palette only. Use \`c-*\` classes and the shared palette tokens; do not fall back to hardcoded hex for scenes, gradients, flames, water, heat maps, or decorative accents.

**No rotated text**. \`<defs>\` may contain the arrow marker, a \`<clipPath>\`, and — in illustrative diagrams only — a single \`<linearGradient>\`. Nothing else: no filters, no patterns, no extra markers.
`,
  },
  "teach": {
    id: "teach",
    title: "Teach",
    description: "Teach a user a skill or concept across sessions with short lessons and practice. Use when the user asks to learn.",
    section: "agent-guidelines",
    path: "sections/agent-guidelines/teach.md",
    content: `---
name: teach
description: Teach a user a skill or concept across sessions with short lessons and practice. Use when the user asks to learn.
---

# Teach

Use the private teaching workspace. Do not store teaching state in visible workspace files.

## Before teaching

1. Call \`get_teaching_workspace\` before teaching to discover bounded metadata.
2. Use \`read_teaching_artifact\` for the mission and the learning records, notes, references, lessons, and resources needed for the current lesson.
3. If the mission is missing or unclear, ask why the learner wants this and what outcome they need. Do not invent a mission.
4. Use trusted sources for factual content. Save sources as \`resource\` artifacts.

## Lesson loop

1. Teach only the knowledge needed for one narrowly scoped skill.
2. Make the learner retrieve, apply, and receive feedback. Prefer a short interactive exercise.
3. Save the lesson as a \`lesson\` artifact with a stable slug and complete HTML content.
4. Save durable facts as \`reference\` artifacts and non-obvious progress as \`learning-record\` artifacts.
5. Save mission changes only after the learner confirms them. Use the \`mission\` artifact for the current mission.
6. End with a concrete next step and a way to ask follow-up questions.

Keep lessons short enough to finish quickly. Favor storage strength over a smooth explanation: recall, spacing, and interleaving matter more than immediate fluency.
`,
  },
  "ui-components": {
    id: "ui-components",
    title: "Ui Components",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/ui_components.md",
    content: `## Utility components

Use host utilities for geometry, surfaces, controls, typography, and interaction. Do not add custom component skins, borders, radii, shadows, gradients, or pseudo-element states.

### Layout and surfaces

- \`.card\`: the only card-like surface. Use it for a necessary bounded summary, selected item, or interactive field. Keep charts, maps, diagrams, tables, controls, and the whole visualization transparent and unframed.
- \`.viz-stat\`: one muted label, one \`.viz-stat-value\`, and at most one short context/delta line.
- \`.viz-grid\`: peer metrics or choices. Keep groups to 2–3 columns at 736px and stack at narrow widths.
- \`.viz-row\`: wrapping horizontal group for related values or inline actions.
- \`.viz-tile\`: selectable dense-grid \`.btn\`; it stretches to its cell and uses the utility-selected state. Do not add another border, outline, shadow, or pressed rule.
- \`.viz-badge\`: compact display-only status/category accent; never use it as a button.

### Controls

- Use native \`button\`, \`input\`, \`select\`, and \`textarea\` with \`.btn\`, \`.btn-primary\`, \`.btn-ghost\`, \`.btn-block\`, \`.form-label\`, \`.form-check\`, \`.form-switch\`, \`.form-control\`, \`.form-select\`, and \`.form-range\` where provided by the host.
- Use \`.viz-controls\` as a wrapping row for controls affecting the same visual. Keep fields to two columns at most and stack them when narrow.
- Use visible labels for icon-only controls through \`aria-label\`; keep native focus styles and tab order.
- Keep filters, selections, and presentation-only interactions local. Use \`window.openai.sendFollowUpMessage\` only for an explicit investigation or explanation request.

### Text and numbers

- Use \`.text-small\` only for secondary labels and \`.text-muted\` only for non-essential context. Never go below 11px.
- Use \`.text-destructive\` only for actionable errors. Use \`.sr-only\` for accessible descriptions and keyboard fallbacks.
- Round every displayed number; use sensible integer, decimal, percentage, or currency precision.

### Examples

For concrete compositions, load the relevant examples from \`examples/\` only when needed. Do not copy incidental spacing or content from an example when the user’s artifact differs.
`,
  },
  "unslop": {
    id: "unslop",
    title: "Unslop",
    description: "Rewrite plans and documentation in direct, specific language. Use when removing generic AI prose.",
    section: "agent-guidelines",
    path: "sections/agent-guidelines/unslop.md",
    content: `---
name: unslop
description: Rewrite plans and documentation in direct, specific language. Use when removing generic AI prose.
---

# Unslop

Rewrite text so it sounds specific, direct, and human. Preserve meaning and the intended tone.

## Process

1. Scan for puffery, vague claims, filler, repetition, over-structured prose, and generic conclusions.
2. Replace each with a concrete fact, instruction, decision, example, or number.
3. Prefer active voice, plain words, varied sentence length, and sentence-case headings.
4. Keep the author's point of view when it helps. Do not add enthusiasm or marketing language.
5. Read the result once as a skeptical editor. Remove anything that could appear unchanged in another project's docs.

## Remove

- Puffery and promotion: "pivotal", "groundbreaking", "vibrant", "stunning", "must-visit", "testament".
- Vague attribution: name the source or remove the claim.
- Abstract metaphor jargon: "landscape", "flywheel", "north star", "bedrock", "scaffolding", "harness".
- Fancy verbs: use "is", "has", "use", and "help" instead of "serves as", "boasts", "leverage", and "facilitate".
- "Not just X, but Y", forced groups of three, synonym cycling, and false "from X to Y" ranges.
- Filler such as "in order to", "it is important to note", and excessive hedging.
- Chatbot phrases, sycophancy, decorative emojis, curly quotes, and em dashes.

## Keep

- One idea per sentence when a sentence becomes hard to parse.
- A single source of truth for each rule.
- Steps in execution order. End each step with a checkable completion condition.
- Reference material behind a clear pointer when only one branch needs it.
`,
  },
  "when-nothing-fits": {
    id: "when-nothing-fits",
    title: "When Nothing Fits",
    description: null,
    section: "visual-guidelines",
    path: "sections/visual-guidelines/when_nothing_fits.md",
    content: `## When nothing fits
Pick the closest use case below and adapt. When nothing fits cleanly:
- Default to editorial layout if the content is explanatory
- Default to card layout if the content is a bounded object
- All core design system rules still apply
- Use \`sendPrompt()\` for any action that benefits from Claude thinking`,
  },
} as const satisfies Record<string, SkillDefinition>;

export type SkillId = keyof typeof SKILL_MAP;

export const AVAILABLE_STUDY_SKILLS = ["auto-llm-example","concept-explainer","electricity-grid-flow-example","flashcard-creator","quiz-creator","smartphone-layer-anatomy-example","sn2-reaction-mechanism-example","study-notes-creator","summary-generator"] as const;

export const AVAILABLE_TEACHING_SKILLS = ["create-learning-path","run-learning-retrospective","teach","unslop"] as const;

export const AVAILABLE_VISUAL_SKILLS = ["art","chart","diagram","interactive","mockup","physics"] as const;

export const AVAILABLE_SKILLS = Object.keys(SKILL_MAP) as SkillId[];

export function getSkill(skillId: string) {
  return SKILL_MAP[skillId as SkillId] ?? null;
}

export function loadSkills(skillIds: string[]) {
  const seen = new Set<string>();
  let content = "";

  for (const skillId of skillIds) {
    if (seen.has(skillId)) continue;
    seen.add(skillId);

    const skill = getSkill(skillId);
    if (!skill) {
      throw new Error(`Unknown skill: ${skillId}`);
    }

    if (content) content += "\n\n";
    content += skill.content.trimEnd();
  }

  return content ? `${content}\n` : "";
}

export function getGuidelines(modules: string[]) {
  return loadSkills(modules);
}
