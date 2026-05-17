# Command Palette Store Floor

Tags: tests, reliability, navigation, state

## What changed

Added direct store coverage for:

- `apps/web/src/stores/commandPaletteStore.test.ts`

New directly covered behavior:

- open/close state transitions through the Zustand shell
- workspace file-index persistence in store state
- recent-file deduplication
- recent-file cap at eight entries
- persisted storage payload containing only recent-file state
- full store reset back to the initial state

## Why it mattered

`commandPaletteStore.ts` is small, but it owns persisted recent-file memory and
the shell state of the workspace command palette. Before this pass, that state
path had no direct floor, so regressions there could quietly degrade command
palette continuity across sessions.

## Verification

- `node_modules/.bin/biome check apps/web/src/stores/commandPaletteStore.test.ts`
- `node_modules/.bin/vitest run src/stores/commandPaletteStore.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The command-palette store now has a direct floor, but the effect-heavy hooks
that hydrate and consume it still remain the next stronger follow-up if we keep
pushing on command-palette reliability.
