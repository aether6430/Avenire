---
name: first-class-primitives
description: Use the Avenire primitive renderer when it clearly fits the artifact.
---

# Primitive option

The primitive renderer is an optional fast path, not a requirement. Use it when the artifact is mostly structured layout, metrics, tables, callouts, progress, or simple bar/line/area charts. Use raw `code` when custom drawing, controls, animation, maps, simulations, or imperative behavior is the clearer solution.

## Available nodes

- `stack`: vertical composition with `children` and optional `gap`.
- `grid`: responsive peer layout with `children`, optional `columns` 1–4, and `gap`.
- `section`: open grouping with optional `title`, `description`, and `children`.
- `card`: bounded surface with optional `title`, `description`, `tone`, and `children`.
- `stat`: `label`, `value`, optional `delta` and `tone`.
- `heading`, `text`, `badge`, `callout`, `table`, `progress`, `divider`.
- `chart`: bar, line, or area data with `indexKey` and one or more series.

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
