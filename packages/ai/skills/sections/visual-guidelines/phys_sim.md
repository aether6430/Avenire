## Physics Simulation Module

Use this module for simulations where motion over time is the point: orbits, pendulums, waves, fields, energy exchange, and other systems with changing state. The output should feel like one purpose-built widget, not a collage of unrelated sections.

### Layout
- Put the main canvas on top.
- Put the explanation and controls beneath the canvas.
- Stack those sections vertically on mobile.
- Split them into two columns on wider screens.
- Left bottom column: a short explanation, one or two sentences max.
- Right bottom column: sliders, toggles, buttons, and live readouts.
- Use a second canvas only when the system genuinely benefits from a companion view such as phase space or energy.
- Do not let the main canvas feel like a dark blank card with faint marks. The simulated system should occupy the canvas, use readable contrast, and include enough labels or legends for the viewer to understand what is moving and what is being measured.

### Canonical layout
```html
<div class="phys-sim-layout">
  <div class="phys-sim-canvas">
    <canvas id="sim"></canvas>
  </div>

  <div class="phys-sim-bottom">
    <div class="phys-sim-copy">
      <h2>Title</h2>
      <p>Short explanation.</p>
    </div>

    <div class="phys-sim-controls">
      <!-- sliders, toggles, buttons, readouts -->
    </div>
  </div>
</div>
<style>
  .phys-sim-layout {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 1rem 0;
  }

  .phys-sim-canvas {
    height: clamp(320px, 55vh, 560px);
    min-width: 0;
  }

  .phys-sim-canvas canvas {
    width: 100%;
    height: 100%;
    display: block;
    border-radius: 8px;
    background: var(--color-background-secondary);
  }

  .phys-sim-bottom {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }

  .phys-sim-copy {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .phys-sim-copy h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 500;
    line-height: 1.2;
    color: var(--color-text-primary);
  }

  .phys-sim-copy p {
    margin: 0;
    font-size: 14px;
    line-height: 1.65;
    color: var(--color-text-secondary);
  }

  .phys-sim-controls {
    background: var(--color-background-secondary);
    border: 0.5px solid var(--color-border-tertiary);
    border-radius: 8px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  @media (min-width: 720px) {
    .phys-sim-layout {
      gap: 20px;
    }

    .phys-sim-bottom {
      grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
      gap: 24px;
    }
  }
</style>
```

### Control rules
- Include sliders for almost all meaningful factors.
- Use toggles or buttons for mode switches, visibility, reset, pause, and demo controls.
- Do not rely on checkbox rendering. Use button-style toggles or segmented controls instead.
- Use bare `<button>`, `<input type="range">`, and `<select>` elements unless a custom layout is required. Do not repaint simulation controls with custom blue fills or bespoke button chrome; the host already styles controls.
- Put each slider in a three-part row: label, slider, rounded value. Keep labels and values aligned with `display: grid; grid-template-columns: 72px minmax(0, 1fr) 48px; gap: 10px; align-items: center;`.
- Use a compact button row for actions such as reset, pause, drop, or clear. Primary simulation actions can come first, but they should still use the native button treatment rather than custom color fills.
- Do not rely on KaTeX or math rendering in the widget. Use plain text labels, Unicode symbols, or simple inline text.
- Every control should expose a real model variable: `g`, `m`, `k`, length, damping, amplitude, frequency, charge, speed, separation, mass ratio, initial angle, and similar values.
- Round every displayed number with `Math.round()`, `.toFixed()`, or `toLocaleString()`.
- If a control changes a physical parameter, the user should be able to drag it directly.

### Scaling and navigation
- Fit the whole system into the canvas intelligently.
- If the content risks clipping, automatically reduce scale or recenter before the user notices.
- If there is any doubt about fit, add zoom in and zoom out buttons.
- Support dragging to pan when the scene is wider or taller than the view.
- Use those controls sparingly, but make them available whenever a simulation can grow beyond the default frame.
- Keep the main subject readable at all times; do not force the user to guess where the important object went.

### Complex visualizations
- For complex systems like the double pendulum, include a companion phase diagram.
- Let the user choose the phase axes instead of hard-coding them.
- Common axis choices include angle, angular velocity, position, momentum, energy, or any other state variables that make sense for the system.
- Keep the phase plot legible and synchronized with the main simulation.
- If the phase plot is not helping the explanation, leave it out.

### Visual stability
- Keep the simulation palette stable across wavelength, frequency, and parameter changes.
- Do not let the user’s choice leak into the surrounding app chrome or outer widget background.
- For YDSE and similar optics simulations, wavelength may change fringe spacing, intensity, or the appearance of the light itself, but it should not recolor the whole interface or make the widget feel detached from the app.
- Treat the widget chrome as constant and the physics as the only thing that changes.

### Simulation rules
- Represent state explicitly instead of hiding it in canvas globals.
- Use fixed-step integration. `requestAnimationFrame` drives rendering, not physics.
- If the visual shows collisions, contacts, bouncing, constraints, or barriers, the simulation must implement those interactions in state update code. Do not draw obstacles as decoration while particles pass through them.
- Use substeps or continuous collision checks when particles move fast enough to tunnel through pegs, walls, or barriers in one frame.
- After resolving collisions, enforce non-overlap: distance between two circular bodies must be at least `r1 + r2`, and distance from a particle center to a peg must be at least `particleRadius + pegRadius`. Push the particle out along the collision normal before applying bounce velocity.
- For peg-board, pachinko, Galton board, molecular, billiard, granular, or crowd-style simulations, collisions are the core concept. Use explicit circle-vs-circle and circle-vs-wall collision resolution, add damping/friction only after separation, and clamp velocities to avoid unstable jitter.
- When many objects would make real physics expensive, reduce the active object count, aggregate inactive objects into bins, or render trails/history. Do not fake collisions by letting objects overlap.
- Use RK4 for coupled or chaotic systems. Do not fall back to Euler for double pendulums, orbital mechanics, or anything sensitive to drift.
- Use Verlet only for simple orbit-style motion when it produces the cleanest result.
- Keep units consistent and label them in plain text.
- Expose the real control variables the user would actually want to adjust.
- Clamp extreme values so the sim never explodes into `NaN`.
- Include reset and pause controls when the system has memory or chaos.
- Add trails, phase plots, or envelope curves only when they help the explanation.
- Use `sendPrompt()` for follow-up actions that benefit from chat reasoning, not for deterministic UI filtering or arithmetic.

### Canvas rules
- Size the canvas to the available space and scene, then scale by `devicePixelRatio` for crisp rendering.
- Draw using visible contrast, not default black. Canvas backgrounds, pegs, paths, bars, particles, axes, and labels must use the theme colors from `updateTheme()` and remain legible in dark mode.
- Make primary simulation geometry large enough to read: balls/particles at least 5px radius when possible, pegs/markers at least 3px radius, axes at least 1.5px, and important paths at least 2px. If the scene has many marks, use alpha sparingly but never so low that marks disappear.
- Leave measured padding inside the canvas and scale the scene to fit. For triangular lattices, fields, or orbit paths, calculate bounds first and center the active area instead of hard-coding coordinates.
- Label the important quantities directly on the canvas or in an adjacent readout: totals, current active count, axis meaning, distribution bins, energy, phase axes, or units. Avoid unlabeled numeric ticks.
- **CRITICAL: Reactive Theming**: Use a helper to sync colors from CSS variables and redraw whenever the host theme changes. Prefer the canvas theme contract exposed by `WidgetRenderer`:
  ```javascript
  let colors = {};

  function updateTheme() {
    const style = getComputedStyle(document.documentElement);
    colors.bg = style.getPropertyValue('--canvas-background').trim() || style.getPropertyValue('--background').trim() || '#ffffff';
    colors.surface = style.getPropertyValue('--canvas-surface').trim() || style.getPropertyValue('--card').trim() || '#ffffff';
    colors.text = style.getPropertyValue('--canvas-text').trim() || style.getPropertyValue('--foreground').trim() || '#37352f';
    colors.muted = style.getPropertyValue('--canvas-muted').trim() || style.getPropertyValue('--muted-foreground').trim() || '#9b9a97';
    colors.border = style.getPropertyValue('--canvas-border').trim() || style.getPropertyValue('--border').trim() || 'rgba(55, 53, 47, 0.09)';
    colors.primary = style.getPropertyValue('--canvas-primary').trim() || style.getPropertyValue('--primary').trim() || '#abcfff';
    colors.grid = style.getPropertyValue('--canvas-grid').trim() || 'rgba(0,0,0,0.08)';
  }

  updateTheme();
  window.addEventListener('avenire:themechange', () => {
    updateTheme();
    draw();
  });
  ```
- Use `ResizeObserver` to reflow cleanly.
- Use `IntersectionObserver` or an equivalent visibility check to pause animation off-screen.
- Keep drawing code in CSS pixels after scaling the context.
- Draw the primary object, then supporting annotations, then labels.
- Avoid decorative effects that make the sim harder to read mid-stream.

### Simulation polish checklist
- The first rendered frame should be useful before any animation starts.
- The canvas should not be mostly empty unless emptiness is the concept being taught.
- All user-visible counters and slider values should update immediately after interaction.
- Pause and reset should be obvious from state: the button label or adjacent readout must reflect whether the sim is running.
- If random sampling is involved, show the distribution or accumulating result with clear bins, bars, or counts, not only moving particles.
- If the widget draws colliders, inspect the update loop before calling `show_widget`: every drawn collider must appear in the collision loop, every collision must separate overlapping bodies, and no state update may permit a particle to remain inside a peg, wall, or bin divider.
- Prefer a simple correctness invariant in code comments or variable names over visual guesswork: `minDistance = ball.r + peg.r`, `overlap = minDistance - distance`, `ball.x += normal.x * overlap`.
- The final code should be self-auditable from source. Do not require a screenshot, browser devtools, or pixel inspection to prove that collisions, bounds, and controls are wired.

### Common recipes

#### Kepler orbit
- Show the star at the true focus, not the center.
- Draw the planet, trail, optional velocity vector, and optional sweep area.
- Use eccentricity and speed controls.
- Add zoom and drag if the orbit can leave the frame.
- Let the user see how the orbit changes as the parameters change.

#### Double pendulum
- Show two arms, two bobs, and a fading trail for the second bob.
- RK4 is mandatory.
- Include damping, reset, pause, and sensitivity controls.
- Include a phase plot or second canvas.
- Let the user choose the phase axes, such as `θ1 vs θ2`, `θ1 vs ω1`, or `ω1 vs ω2`.
- If you include a chaos demo, use a ghost pendulum with a tiny initial offset and a different trail color.

#### Waves and harmonics
- Show superposition, standing-wave nodes and antinodes, or beat envelopes.
- Use frequency, amplitude, wavelength, or harmonic controls.
- Keep the visual language simple: curves, phase labels, and one or two highlight colors.

#### Fields and forces
- Show vector fields, trajectories, or force arrows derived from superposition.
- Let the user place or adjust sources when it materially improves understanding.
- Use field lines only if they are cleaner than arrows.

#### Energy views
- Pair the physical system with an energy panel when the conservation story matters.
- Show kinetic, potential, and total energy as bars or readouts.
- Make the total obvious: flat when ideal, decaying when damping is on.

### Typical outputs
- Orbit request: one main canvas with a focal star, moving body, trail, and a couple of toggles.
- Pendulum request: one main canvas with controlled motion, readouts, and phase/chaos support if relevant.
- Wave request: one canvas with layered curves and an envelope or node markers.
- Field request: one canvas with vectors or lines and placeable sources.

### What not to do
- Do not mix this module with the old “layout skeleton” plus separate “per-simulation specs” format.
- Do not turn the output into a generic dashboard with too many unrelated cards.
- Do not hide the state behind a library when a small handwritten integrator is enough.
- Do not use raw floats in labels.
- Do not add a second canvas unless it meaningfully changes the explanation.
- Do not use checkbox UI or KaTeX-dependent equation blocks in this module.
