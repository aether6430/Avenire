## Charts

- Start with the plot for named numeric data. Label axes, units, important values, and chart meaning.
- Use a tooltip only when direct labels would be less clear; mirror important tooltip data in a keyboard-visible fallback.
- Animate transitions between data states, not initial appearance. Never loop chart motion and honor `prefers-reduced-motion`.
- For distributions or multi-metric comparisons, prefer shared-scale facets or small multiples and show requested dimensions together.
- Keep series count small enough to read at chat width. Pair color with labels, shape, or line style.
- Use the primitive `chart` node for ordinary bar, line, and area charts when it clearly fits. Use raw Chart.js only for unsupported chart types, custom plugins, synchronized charts, or imperative annotations.

## Raw Chart.js

- Put `<canvas>` in a wrapper with explicit height and `position: relative`; never set canvas CSS height directly.
- Use `responsive: true` and `maintainAspectRatio: false`.
- Load approved UMD scripts with `onload="initChart()"`, define a named initializer, and keep an `if (window.Chart) initChart()` fallback.
- Use unique IDs for multiple charts. Pad bubble/scatter scales so marks are not clipped.
- Disable the default legend when it hides values; build a semantic utility-based legend outside the canvas.
- Canvas cannot resolve CSS variables. Do not hand-author colors; use Chart.js defaults or the host chart utility contract.
