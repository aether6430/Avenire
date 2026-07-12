# Avenire motion audit

**Date**: 2026-07-12  
**Commit**: `10941e6`  
**Method**: improve-animations recon + category audit (Emil Kowalski bar)  
**Surfaces**: `apps/web`, `packages/ui`

---

## Stack & conventions

| | |
| --- | --- |
| Framework | Next.js app (`apps/web`) |
| Primitives | Base UI + shadcn-style components in `@avenire/ui` |
| Motion libs | `motion` / `framer-motion`, Vaul drawers, `tw-animate-css` |
| Existing tokens | `packages/ui/src/lib/springs.ts` (`fast` 0.08, `moderate` 0.16, `slow` 0.24) — **no CSS `--ease-*`** |
| Frequency | Palette + chat + keyboard shortcuts = highest leverage |

Target curves (from skill AUDIT):

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

---

## Findings

### 1 — Instant command palette open/close

| | |
| --- | --- |
| **Severity** | HIGH |
| **Category** | Purpose & frequency |
| **Source** | `packages/ui/src/components/command.tsx` (`CommandDialog` → `DialogContent`); `packages/ui/src/components/dialog.tsx:62–65` (`zoom-in-95` / `zoom-out-95`, `duration-100`); open path `apps/web/src/components/dashboard/command-palette.tsx:694–710` (`Mod+Shift+K`) and `:2090–2108` |

**Problem**  
The command palette is a keyboard-first surface (100+/day for power users). It inherits Dialog enter/exit zoom + fade. That delays the moment the user can type and feels sluggish compared to Raycast-style instant open.

**Solution**  
Opt `CommandDialog` / palette `DialogContent` out of open/close motion: `animate-none`, no zoom/fade classes on the palette shell (overlay can still dim without zoom, or snap). Do not animate keyboard-triggered open/close. Layout toggles inside the palette are a separate finding (#6).

---

### 2 — Instant keyboard sidebar toggle

| | |
| --- | --- |
| **Severity** | HIGH |
| **Category** | Purpose & frequency |
| **Source** | `packages/ui/src/components/sidebar.tsx:93–106` (Mod+B), `:217–229` (`transition-[width]` / `left,right,width` `duration-200 ease-linear`); `apps/web/src/components/dashboard/app-sidebar.tsx:2314–2316` (`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]`) |

**Problem**  
Keyboard shortcut toggles animate the sidebar for 200–300ms. Per motion bar: keyboard actions should not animate.

**Solution**  
When toggle is keyboard-initiated, set a `data-instant` (or similar) flag that applies `transition-none` / `duration-0` for that frame. Pointer/peek can keep a short width or transform transition (≤200ms, property-scoped). Replace app-sidebar `transition-all` with explicit properties.

---

### 3 — Replace `transition-all` on hot primitives

| | |
| --- | --- |
| **Severity** | HIGH |
| **Category** | Performance |
| **Source** | `packages/ui/src/components/button.tsx:10`; also `switch.tsx:19`, `toggle.tsx:9`, `tabs.tsx:61`, `badge.tsx:10`, `accordion.tsx:38`, `input-otp.tsx:58`, `navigation-menu.tsx:62,134`, `sidebar.tsx:288` (rail) |

**Problem**  
`transition-all` animates every property change (layout, borders, filters) off the GPU path and makes press/hover feel mushy when combined with `active:scale`.

**Solution**  
Property-scope transitions:

- Button: `transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150 ease-out` (press scale 100–160ms).
- Switch root: colors only; thumb already `transition-transform`.
- Toggle / tabs / badge / accordion: colors + background (+ transform if needed).
- Prefer tokens from #9 once available.

---

### 4 — Reduced-motion: keep opacity, drop movement

| | |
| --- | --- |
| **Severity** | MEDIUM |
| **Category** | Accessibility |
| **Source** | `apps/web/src/app/globals.css:178–188`; sparse `useReducedMotion` (e.g. `packages/ui/src/components/input-message.tsx`) |

**Problem**  
Global `prefers-reduced-motion: reduce` forces **all** transitions/animations to `0.01ms`, removing useful opacity feedback and treating reduced motion as “zero motion.”

**Solution**  
Replace nuke-all with a movement-focused policy:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
  /* Prefer shorter transitions; do not force every transition to zero if it only fades */
}
```

Better pattern: utility classes / Motion branches that drop `transform`/`translate`/`scale` but keep short opacity. Wire `useReducedMotion()` on chat send morph, spinner, flashcard flip, message entrance.

---

### 5 — Rolling tool panels: no `height: auto`

| | |
| --- | --- |
| **Severity** | MEDIUM |
| **Category** | Performance |
| **Source** | `apps/web/src/components/chat/rolling-tool-activity.tsx:1266–1270` (`RollingPreviewPanel`), `:1354–1358`, `:1382–1386` |

**Problem**  
Framer Motion animates `height: "auto"` (layout thrash) at 0.24–0.36s on expandable tool previews during chat.

**Solution**  
Match the CSS grid pattern already used nearby (`grid-rows-[0fr]` / `1fr` + opacity, e.g. `:1053–1054`). Duration ≤250ms, `ease-out` / token. No Motion height animation.

---

### 6 — Command palette: drop layout resize transitions

| | |
| --- | --- |
| **Severity** | MEDIUM |
| **Category** | Performance |
| **Source** | `apps/web/src/components/dashboard/command-palette.tsx:2102–2104` (`transition-[width,height,max-width]`), `:2168`, `:2210` |

**Problem**  
Preview/filter toggles animate width/height/grid tracks — layout work on a high-traffic surface.

**Solution**  
Snap width changes, or animate only opacity of the preview pane. Filters row can keep short `grid-template-rows` transition (≤150–200ms). Remove `height` from the dialog shell transition list.

---

### 7 — Send/stop icon morph: gentler scale, reduced-motion

| | |
| --- | --- |
| **Severity** | MEDIUM |
| **Category** | Physicality / purpose |
| **Source** | `apps/web/src/components/chat/multimodal-input.tsx:1669–1688` (`scale: 0.72`, rotate ±16); `packages/ui/src/components/input-message.tsx:872–883` (`scale: 0.6`) |

**Problem**  
High-frequency send/stop control uses aggressive scale (0.6–0.72) and rotation. Multimodal path ignores reduced motion.

**Solution**  
Opacity-only under reduced motion; otherwise `scale: 0.92–0.96` max, no rotate. Keep `springs.fast` or ~80–120ms.

---

### 8 — Sheet enter/exit: strong ease-out

| | |
| --- | --- |
| **Severity** | MEDIUM |
| **Category** | Easing & duration |
| **Source** | `packages/ui/src/components/sheet.tsx:66` (`transition duration-200 ease-in-out` + slide classes) |

**Problem**  
Enter/exit uses `ease-in-out`, which softens the start and feels less responsive than strong ease-out / drawer curve.

**Solution**  
Use `ease-out` or `var(--ease-drawer)` / `cubic-bezier(0.32, 0.72, 0, 1)`; scope transition to transform/opacity; duration ~200–300ms.

---

### 9 — Shared CSS motion tokens

| | |
| --- | --- |
| **Severity** | MEDIUM |
| **Category** | Cohesion & tokens |
| **Source** | `packages/ui/src/styles.css` (no motion tokens); ad-hoc curves `app-sidebar.tsx:2316`, `folder-glyph.tsx:65`, `navigation-menu.tsx:114–119` |

**Problem**  
JS springs exist; CSS easings are hand-typed and inconsistent.

**Solution**  
Add to `:root` / `@theme` in `packages/ui/src/styles.css`:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--duration-fast: 100ms;
--duration-normal: 160ms;
--duration-moderate: 200ms;
--duration-slow: 300ms;
```

Migrate hotspots as they are touched; do not boil the ocean in one PR.

---

### 10 — Gate hover scale with `pointer: fine`

| | |
| --- | --- |
| **Severity** | MEDIUM |
| **Category** | Accessibility |
| **Source** | `apps/web/src/components/files/explorer.tsx:6611`; `file-card-thumbnail.tsx:198`; blog/marketing image hovers (lower priority) |

**Problem**  
`group-hover:scale-*` fires sticky “hover” on touch.

**Solution**  
Use `@media (hover: hover) and (pointer: fine)` (Tailwind `max-lg:` is not the same — prefer arbitrary variant or `@custom-variant` if available). Duration 150–200ms on dense grids.

---

### 11 — Prefer transform strings / less Motion shorthand in chat

| | |
| --- | --- |
| **Severity** | MEDIUM |
| **Category** | Performance |
| **Source** | e.g. `apps/web/src/components/chat/message.tsx:718–728`; `spinner.tsx:48–60`; flashcard `y`/`scale` entrances |

**Problem**  
Motion `x`/`y`/`scale` shorthands run on the main thread under load; chat streams many nodes. Most chat paths lack `LazyMotion`.

**Solution**  
For one-shot entrances: CSS `animate-in fade-in slide-in-from-bottom-1`. Where Motion stays: full `transform` string + `useReducedMotion`; consider LazyMotion for shared chat shell.

---

### 12 — Task checkbox: no `scale(0)`

| | |
| --- | --- |
| **Severity** | LOW |
| **Category** | Physicality |
| **Source** | `apps/web/src/editor.css:577–581` |

**Problem**  
Checked indicator uses `transform: scale(0)` → appears from nothing.

**Solution**  
`scale(0.85)` + `opacity: 0` unchecked; checked `scale(1)` + `opacity: 1`, 160ms ease-out.

---

### 13 — Flashcard flip duration + reduced-motion

| | |
| --- | --- |
| **Severity** | LOW |
| **Category** | Easing & duration |
| **Source** | `apps/web/src/components/flashcards/flip-card.tsx:42` (`duration-500`) |

**Problem**  
500ms flip is long for repeated study; no reduced-motion path.

**Solution**  
~350–400ms, `ease-in-out` / token; under reduced motion: instant or opacity swap without 3D rotate.

---

### 14 — Upload panel: property-scoped transition

| | |
| --- | --- |
| **Severity** | LOW |
| **Category** | Performance |
| **Source** | `apps/web/src/components/files/upload-activity-panel.tsx:682` (`transition-all duration-300`) |

**Problem**  
Show/hide uses `transition-all`.

**Solution**  
`transition-[opacity,transform] duration-200` + `--ease-out`; keep translate-y + opacity pattern.

---

### Related UX — Dialog default max-width too thin

| | |
| --- | --- |
| **Source** | `packages/ui/src/components/dialog.tsx:63–65` (`sm:max-w-sm` default; `largeWidth` → `sm:max-w-4xl lg:max-w-5xl`) |

**Problem**  
Default dialog is ~24rem wide on desktop; several product flows need wider content and currently fight the primitive with `largeWidth` or one-off classes.

**Solution**  
Remove the thin default `sm:max-w-sm`. Keep viewport-safe `max-w-[calc(100%-2rem)]` (and optional caller `className` / `largeWidth` for explicit caps).

---

## Missed opportunities (additive)

These are **not** defects; they are places motion would help.

### M1 — Collapsible snap-open

| | |
| --- | --- |
| **Source** | `packages/ui/src/components/collapsible.tsx` (no default panel animation) |

**Problem**  
Collapsible content often jumps open/closed with no height/opacity transition.

**Solution**  
Shared expand pattern: CSS `grid-template-rows: 0fr → 1fr` + opacity, 150–200ms ease-out; document as default class on `CollapsibleContent` or a `CollapsibleContentAnimated` variant.

### M2 — Flashcard grade / review outcome delight

| | |
| --- | --- |
| **Source** | Flashcard review UI under `apps/web/src/components/flashcards/` |

**Problem**  
Correct/incorrect / “again vs good” state changes are mostly static; rare, high-emotion moments have unused delight budget.

**Solution**  
Short (≤200ms) success checkmark scale 0.96→1 + color, or subtle haptic-style opacity flash — only on grade submit, not on every card navigation.

### M3 — Workspace pane focus crossfade

| | |
| --- | --- |
| **Source** | Dashboard multi-pane shell (e.g. workspace pane renderer / focus changes) |

**Problem**  
Active pane can jump without spatial explanation when focus moves.

**Solution**  
Opacity-only crossfade (~120–160ms ease-out) on focus ring/content; never animate layout width for focus alone.

### M4 — Nested tool-row stagger after expand

| | |
| --- | --- |
| **Source** | `rolling-tool-activity.tsx` after #5 is fixed |

**Problem**  
Expanded tool children appear all at once.

**Solution**  
30–50ms stagger on opacity only; must never block interaction; skip under reduced motion.

---

## Already solid (no change required)

- Dropdown / popover / select / tooltip: `origin-(--transform-origin)`, ~100ms, zoom-95 (not 0).
- Button press scale `0.985` range is correct (pair with scoped transition in #3).
- Dialog duration-100 is fine for **occasional** modals; problem is reuse for command palette (#1).
- `menu-item.tsx` 40ms check-stroke `easeIn` exit is negligible.

---

## Implementation notes

- Prefer extending `packages/ui` conventions over inventing parallel systems.
- Plans/executors: exact values from this doc; feel-check keyboard palette, Mod+B, chat send, reduced-motion in DevTools.
- Marketing/blog `transition-all` and hover scales are lower priority than product chrome.
