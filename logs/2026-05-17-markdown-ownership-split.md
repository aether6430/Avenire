# Markdown Ownership Split

Tags: structure, verification

## What changed

- Reduced `apps/web/src/components/chat/markdown.tsx` to a thin wrapper around
  a dedicated surface file.
- Reused the already-existing `markdown-model.ts` instead of duplicating its
  normalization and sizing helpers inside the render file.
- Split the old markdown monolith into local owners:
  - `markdown.tsx`
  - `markdown-surface.tsx`
  - `markdown-renderers.tsx`
  - existing `markdown-model.ts`
- Added a wrapper-level test proving `Markdown` passes render props through to
  the memoized surface.

## Why it mattered

The old markdown file mixed view wrapper logic, content normalization,
memo-equality policy, workspace-file link behavior, code-block rendering,
Shiki highlighting, Mermaid rendering, and ReactMarkdown component wiring in
one place. This pass made the root component honest and pushed the render
cluster into local owners while also removing duplicated model logic.

## Verification

- line counts:
  - `markdown.tsx`: `624` -> `27`
  - `markdown-surface.tsx`: `62`
  - `markdown-renderers.tsx`: `478`
  - existing `markdown-model.ts`: `132`
- `node_modules/.bin/biome check apps/web/src/components/chat/markdown.tsx apps/web/src/components/chat/markdown-surface.tsx apps/web/src/components/chat/markdown-renderers.tsx apps/web/src/components/chat/markdown-model.ts apps/web/src/components/chat/markdown.test.tsx apps/web/src/components/chat/markdown-model.test.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/chat/markdown.test.tsx src/components/chat/markdown-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3047 BETTER_AUTH_URL=http://127.0.0.1:3047 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The root markdown shell is now small and honest, but the renderer cluster is
  still fairly dense and broader structural pressure still remains in
  `particle-field.tsx`, `rolling-reasoning.tsx`, `use-chat-runtime.ts`, and
  the explorer/files cluster.
