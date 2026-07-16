# Animation audit & implementation

- **Commit at audit**: `10941e6`
- **Scope**: `apps/web` + `packages/ui`
- **Full write-up**: [AUDIT.md](./AUDIT.md) (problem / solution / source + missed opportunities)

## Status

| # | Title | Severity | Status |
| --- | --- | --- | --- |
| 1 | Instant command palette open/close | HIGH | **DONE** |
| 2 | Instant keyboard sidebar toggle | HIGH | **DONE** |
| 3 | Replace `transition-all` on hot primitives | HIGH | **DONE** |
| 4 | Reduced-motion: keep opacity, drop movement | MEDIUM | **DONE** |
| 5 | Rolling tool panels: no `height: auto` | MEDIUM | **DONE** |
| 6 | Command palette: drop layout resize transitions | MEDIUM | **DONE** |
| 7 | Send/stop icon morph: gentler scale, reduced-motion | MEDIUM | **DONE** |
| 8 | Sheet enter/exit: strong ease-out / drawer curve | MEDIUM | **DONE** |
| 9 | Shared CSS motion tokens | MEDIUM | **DONE** |
| 10 | Gate hover scale with `fine-hover` / pointer fine | MEDIUM | **DONE** (files UI) |
| 11 | Prefer transform strings in chat Motion | MEDIUM | **DONE** (message + spinner) |
| 12 | Task checkbox: no `scale(0)` | LOW | **DONE** |
| 13 | Flashcard flip duration + reduced-motion | LOW | **DONE** |
| 14 | Upload panel: property-scoped transition | LOW | **DONE** |
| — | Dialog: remove thin default `max-w` | UX | **DONE** |

## Related UX (user request)

Dialog default `sm:max-w-sm` removed. Viewport-safe `max-w-[calc(100%-2rem)]` remains; `largeWidth` still applies `sm:max-w-4xl lg:max-w-5xl`; callers may pass explicit `className` widths.

## Missed opportunities (not implemented)

Documented in AUDIT.md: collapsible expand, flashcard grade delight, pane focus crossfade, tool-row stagger.

## Feel-check checklist

1. **Mod+Shift+K** — palette appears instantly, no zoom.
2. **Mod+B** — sidebar snaps; mouse toggle still has a short width transition.
3. **Chat send/stop** — subtle icon crossfade, no rotate / no 0.6 scale.
4. **DevTools → prefers-reduced-motion** — no transform thrash; colors/opacity still respond.
5. **Dialogs on desktop** — wider by default (not 24rem-capped).
6. **File grid hover on touch** — no sticky scale (fine pointer only).
