# Data Import Step Surface Floor

Tags: tests, settings, data, imports, ux

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/data-imports-google-step.test.tsx`
- `apps/web/src/components/settings/data-imports-notion-step.test.tsx`

New directly covered behavior:

- visible Google Drive connect/reconnect state
- destination-fields visibility in the ready Google state
- blocked Google import copy when the provider is not ready
- visible Notion page-selection state
- empty Notion page state
- import CTA text for selected vs empty Notion page selections

## Why it mattered

These are visible import surfaces inside settings. Strengthening them helps the
import experience feel more intentional, not just technically wired.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/data-imports-google-step.test.tsx apps/web/src/components/settings/data-imports-notion-step.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/data-imports-google-step.test.tsx src/components/settings/data-imports-notion-step.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still render-level evidence, not a browser-interaction test of the full
import step flow.
