# Markdown Renderer Dedupe

Tags: structure, verification

## What changed

- Rewired `markdown-renderers.tsx` to reuse the already-existing local owners:
  - `markdown-code.tsx`
  - `markdown-workspace-link.tsx`
- Added a focused renderer test covering:
  - workspace-file link rendering through the local workspace-link owner
  - `transformMarkdownUrl` keeping workspace-file URLs untouched while still
    normalizing ordinary URLs through ReactMarkdown’s default transform

## Why it mattered

The first markdown split left a smaller root component, but the renderer layer
was still duplicating code that already lived nearby in dedicated local files.
This pass removed that duplication, reduced `markdown-renderers.tsx`
substantially, and tightened local ownership without inventing any new
abstraction.

## Verification

- line counts:
  - `markdown-renderers.tsx`: `479` -> `197`
  - existing `markdown-code.tsx`: `187`
  - existing `markdown-workspace-link.tsx`: `107`
- `node_modules/.bin/biome check apps/web/src/components/chat/markdown-renderers.tsx apps/web/src/components/chat/markdown-renderers.test.tsx apps/web/src/components/chat/markdown-code.tsx apps/web/src/components/chat/markdown-workspace-link.tsx apps/web/src/components/chat/markdown-surface.tsx apps/web/src/components/chat/markdown.tsx apps/web/src/components/chat/markdown-model.test.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/chat/markdown.test.tsx src/components/chat/markdown-renderers.test.tsx src/components/chat/markdown-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3050 BETTER_AUTH_URL=http://127.0.0.1:3050 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The renderer layer is now much leaner, but broader structural pressure still
  remains in `particle-field.tsx`, `use-chat-runtime.ts`, and the explorer/files
  cluster.
