## Mathematical SVG reference quality

Use the illustrations in `context/all-svgs` as the quality bar for math and graph-based SVGs. They are compact, editorial mathematical diagrams: precise axes, smooth curves, shaded regions, construction guides, small point markers, and only the labels needed to make the idea legible.

When the user asks for calculus, algebra, set theory, geometry, graph interpretation, or "show me what this means" with equations, prefer this style over a box-and-arrow diagram.

**What to copy from the reference set:**
- Compose around one central mathematical object: a curve, region, interval, parabola, set boundary, triangle, or approximation.
- Draw axes as thin neutral lines with arrowheads, not heavy chart frames.
- Use smooth `<path>` curves with `stroke-linecap="round"` and `stroke-linejoin="round"`.
- Use translucent or theme-token shaded regions to show area, positive/negative contribution, interval coverage, limits, or approximation.
- Add dashed construction lines for `a`, `b`, `x`, directrix, tangent, partition edges, or vertical projections.
- Add small filled point markers at important intersections and endpoints.
- Put explanatory prose outside the main plot area or keep it to 2-4 short lines with `class="ts"`.
- Prefer a single elegant figure over multiple mini-plots unless the comparison is the concept.

**Avoid low-quality math diagrams:**
- Do not turn a mathematical concept into boxes unless the user asks for a process or taxonomy.
- Do not use chart libraries for hand-explanatory math diagrams; raw SVG gives better control over axes, shaded integrals, limits, and annotations.
- Do not over-label every tick or draw a full grid by default. The reference style uses sparse labels.
- Do not make the curve jagged. Use cubic Bezier paths for conceptual curves.
- Do not use saturated fills, thick outlines, drop shadows, filters, or decorative gradients.
- Do not place labels on top of curves, shaded regions, or axes. Move labels to clear space and connect with a small leader line when needed.

**Host adaptation:** The `context/all-svgs` files use fixed pixel sizes and literal grays. In Avenire widgets, keep the same visual discipline but adapt it to the host rules: `viewBox="0 0 680 H"`, `width="100%"`, classes `t`/`ts`/`th` for text, theme tokens or `c-*` ramps for colors, no custom palette, and a transparent background.

**Reference motifs to reuse:**
- `definite-integrals-1.svg`: shaded curvilinear trapezoid under `y=f(x)` between dashed vertical bounds `a` and `b`.
- `riemann-integrability-criteria-1.svg`: interval partition with translucent rectangles under a curve.
- `fundamental-theorem-of-calculus-1.svg`: positive and negative signed areas separated by the horizontal axis.
- `quadratic-equations.svg`: parabola with axis of symmetry, directrix, vertex/focus markers, and dashed projections.
- `supremum-and-infimum-*.svg`: number-line/set-boundary diagrams with minimal labels.

**Planning block additions for math SVGs:** In the mandatory `<!-- PLAN ... -->`, include:
```text
  math object: curve | region | number line | geometric construction | approximation
  coordinate frame: axes origin, x-axis y, y-axis x, arrow extents
  highlighted region: path or rect range, fill token, label
  construction lines: dashed guides and endpoints
  label collision check: labels clear of curve/axis/shading
```

**Coordinate discipline for math figures:**
- Reserve the central 420-520px width for the mathematical figure and leave a side or lower area for short notes.
- Put axes behind curves and shaded regions only when the axis should remain visible; otherwise draw shaded regions first, axes second, curve last, labels last.
- Curves should use `stroke-width="2"` maximum; axes/guides should use `0.5` or `1`.
- Shaded areas should have no heavy border unless the boundary itself is the concept.
- Keep the bottom explanatory text outside the plot's active geometry, with at least 20px separation from axes and guide lines.
- If a diagram needs more than one paragraph of explanation, split the prose into chat text and keep the SVG visual.
