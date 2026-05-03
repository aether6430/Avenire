---
name: first-class-primitives
description: Use structured first-class widget primitives for polished canvas artifacts rendered with the Avenire shadcn UI system.
---

# First-class widget primitives

Prefer `widget_spec` for canvas-style artifacts: debugging reports, docs canvases, learning dashboards, comparison cards, metric summaries, tables, charts, timelines, and structured explanations. The app renders `widget_spec` with first-class React components backed by `@avenire/ui` shadcn primitives, so the result inherits the host theme, spacing, cards, tables, badges, progress bars, and chart styling.

Use raw `widget_code` only when the visual needs custom SVG geometry, canvas drawing, imperative animation, DOM event handling, sliders, steppers, simulations, mermaid, or third-party libraries. If the artifact is mostly layout, text, metrics, tables, cards, or simple charts, use `widget_spec`.

## Tool shape

Call `show_widget` with either `widget_spec` or `widget_code`. For primitive widgets, omit `widget_code`.

```json
{
  "i_have_seen_read_me": true,
  "title": "Websocket pool leak debug",
  "widget_spec": {
    "title": "Websocket pool leak debug",
    "description": "Incident view with request, connection, memory, and milestone evidence.",
    "root": {
      "type": "stack",
      "gap": "lg",
      "children": []
    }
  }
}
```

## Available nodes

- `stack`: vertical composition. Fields: `children`, optional `gap` (`xs`, `sm`, `md`, `lg`, `xl`).
- `grid`: responsive grid. Fields: `children`, optional `columns` (1-4), optional `gap`.
- `section`: open section with optional `title`, `description`, and `children`. Use to avoid a wall of identical cards.
- `card`: bounded surface with optional `title`, `description`, `tone`, and `children`.
- `stat`: metric card. Fields: `label`, `value`, optional `delta`, optional `tone`.
- `heading`: text heading. Fields: `text`, optional `level` (`1`, `2`, `3`).
- `text`: paragraph. Fields: `text`, optional `tone`, optional `weight` (`regular`, `medium`).
- `badge`: compact label. Fields: `text`, optional `tone`.
- `callout`: highlighted note. Fields: optional `title`, `text`, `tone`, `children`.
- `table`: data table. Fields: `headers`, `rows`, optional `caption`.
- `chart`: Recharts-backed chart. Fields: `chartType` (`bar`, `line`, `area`), `data`, `indexKey`, `series`, optional `title`.
- `progress`: progress row. Fields: `value` from 0-100, optional `label`.
- `divider`: horizontal separator.
- `code`: code block. Fields: `code`, optional `language`.
- `html`: final escape hatch for a small trusted fragment inside a primitive composition. Prefer not to use it.

Tones: `default`, `muted`, `info`, `success`, `warning`, `danger`.

## Composition rules

- Lead with the artifact's answer: a title, a one-line description, then the most important metric, chart, or table.
- Mix open sections with cards. Do not wrap every block in a card.
- Use `grid` for 2-4 stats or option cards. Use `stack` for narrative flow.
- Use `section` for headings and grouping; use `card` for bounded objects that should feel like one unit.
- Keep card titles short and sentence case.
- Prefer one strong chart plus a compact table over several tiny charts.
- Round all displayed numbers before putting them into the JSON.
- Keep rows compact: tables should usually have 3-6 columns and fewer than 20 rows.
- Use semantic tones sparingly. Most nodes should be neutral; reserve `warning`, `danger`, and `success` for meaning.

## Good pattern

```json
{
  "title": "Resource leak incident",
  "description": "Connections climb after deploy, then recover after rollback.",
  "root": {
    "type": "stack",
    "gap": "lg",
    "children": [
      {
        "type": "grid",
        "columns": 3,
        "children": [
          { "type": "stat", "label": "Peak open connections", "value": "8.4k", "delta": "+6.1k after deploy", "tone": "warning" },
          { "type": "stat", "label": "Failed requests", "value": "1.5k/hr", "delta": "Recovered after rollback", "tone": "danger" },
          { "type": "stat", "label": "Memory at baseline", "value": "08:08", "delta": "Hotfix stable", "tone": "success" }
        ]
      },
      {
        "type": "chart",
        "title": "Failed requests per hour",
        "chartType": "area",
        "indexKey": "time",
        "series": [{ "dataKey": "failed", "label": "Failed requests" }],
        "data": [
          { "time": "07:00", "failed": 0 },
          { "time": "07:16", "failed": 240 },
          { "time": "07:20", "failed": 1480 },
          { "time": "08:08", "failed": 12 }
        ]
      },
      {
        "type": "section",
        "title": "Milestones",
        "children": [
          {
            "type": "table",
            "headers": ["Time", "Event", "Interpretation"],
            "rows": [
              ["07:10", "Deploy v2.14.0", "Connections begin rising"],
              ["07:16", "Alert fired", "Errors and p99 diverge"],
              ["07:20", "Rollback", "Connections and memory fall"]
            ]
          }
        ]
      }
    ]
  }
}
```

## Bad pattern

- Do not put a single sentence into a card by itself.
- Do not create a vertical stack of five identical cards.
- Do not use raw HTML for tables, badges, metric cards, or simple charts.
- Do not use decorative tones just to make the canvas colorful.
- Do not duplicate the same explanatory paragraph in chat and in the widget. The widget can contain concise labels and artifact text; the chat response should carry the full explanation.
