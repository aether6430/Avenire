# Data Import Hooks Floor

Tags: tests, settings, data, imports

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/use-data-imports-google.test.tsx`
- `apps/web/src/components/settings/use-data-imports-notion.test.tsx`

New directly covered behavior:

- Google Drive connect transport
- Google Picker open/import transport sequence
- Notion connect transport
- Notion page-load transport

## Why it mattered

The imports surface already had model/client/section floors, but the provider
hooks still held unproven glue behavior around auth redirects and import
transport sequencing.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/use-data-imports-google.test.tsx apps/web/src/components/settings/use-data-imports-notion.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/use-data-imports-google.test.tsx src/components/settings/use-data-imports-notion.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

These are transport/glue floors, not full browser-level import workflow tests.
