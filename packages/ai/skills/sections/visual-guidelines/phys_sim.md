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

- Use measured layout, not fixed canvas dimensions. Resize the drawing surface from its wrapper and redraw after `ResizeObserver` changes.
- Read canvas theme variables from the host contract and redraw on `avenire:themechange`. Do not provide fallback palettes or hardcoded colors.
- Keep axes, labels, paths, particles, and controls readable in both themes using utility classes or theme variables.

### Motion and cleanup

- Animate state changes, not initial appearance. Never add perpetual decorative motion and honor `prefers-reduced-motion`.
- Clean up animation frames, timers, observers, and event listeners when the widget is replaced or removed.
- Pause when hidden where possible and keep the simulation understandable at reduced frame rates.

### Quality check

- Is the mechanism visible without reading the chat response?
- Can the user tell what each control changes?
- Are colliders present in both rendering and collision logic?
- Do resize, theme changes, and reduced motion preserve correctness?
