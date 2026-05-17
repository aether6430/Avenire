# File Preview Markdown Pane Split

Tags: structure, verification

## What changed

- Reduced `file-preview-markdown-pane.tsx` to a thin public wrapper.
- Split the old mixed markdown preview surface into local owners:
  - `file-preview-markdown-pane.tsx`
  - `file-preview-markdown-pane-surface.tsx`
- Added a focused wrapper test:
  - `file-preview-markdown-pane.test.tsx`

## Why it mattered

The old file mixed:

- public preview-pane entry
- markdown loading/error states
- note banner and cover controls
- active editor render
- inactive markdown preview render

This pass keeps the public file honest while moving the large markdown preview
surface into an explicit local owner.

## Verification

- line counts:
  - `file-preview-markdown-pane.tsx`: `402` -> `10`
  - `file-preview-markdown-pane-surface.tsx`: `402`
  - `file-preview-markdown-pane.test.tsx`: `53`
- `node_modules/.bin/biome check apps/web/src/components/files/explorer/file-preview-markdown-pane.tsx apps/web/src/components/files/explorer/file-preview-markdown-pane.test.tsx apps/web/src/components/files/explorer/file-preview-markdown-pane-surface.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/files/explorer/file-preview-markdown-pane.test.tsx src/components/chat/markdown.test.tsx`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3074 BETTER_AUTH_URL=http://127.0.0.1:3074 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The public wrapper is now tiny and honest, but the extracted surface remains
  a large local owner because it still carries the banner/editor/inactive-preview
  UI surface.
