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
- Use orthogonal connectors where possible. Connector paths need `fill="none"` and must stop at component boundaries.
- If the diagram needs more than one visual idea, split it instead of compressing it.
- Prefer interactive diagrams when a real-world control changes the mechanism; otherwise keep the visual static.
