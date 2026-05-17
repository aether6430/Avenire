# Multimodal Input Surface Split

Tags: structure, verification

## What changed

- Reduced `multimodal-input-surface.tsx` to the root coordinator for the chat
  composer surface.
- Split the old mixed-responsibility file into local owners:
  - `multimodal-input-surface.tsx`
  - `multimodal-input-attachment-strip.tsx`
  - `multimodal-input-mention-menu.tsx`
  - `multimodal-input-composer-controls.tsx`
- Added a focused wrapper test proving the root wires the attachment, mention,
  and composer control owners together.

## Why it mattered

The old surface file mixed attachment rendering, mention-menu rendering, and
composer controls in one app-facing chat shell. This pass kept the existing
runtime and behavior intact while moving those UI responsibilities into local
owners that are easier to reason about and change correctly.

## Verification

- line counts:
  - `multimodal-input-surface.tsx`: `428` -> `46`
  - `multimodal-input-attachment-strip.tsx`: `50`
  - `multimodal-input-mention-menu.tsx`: `100`
  - `multimodal-input-composer-controls.tsx`: `313`
  - `multimodal-input-surface.test.tsx`: `59`
- `node_modules/.bin/biome check apps/web/src/components/chat/multimodal-input-surface.tsx apps/web/src/components/chat/multimodal-input-attachment-strip.tsx apps/web/src/components/chat/multimodal-input-mention-menu.tsx apps/web/src/components/chat/multimodal-input-composer-controls.tsx apps/web/src/components/chat/multimodal-input-surface.test.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/chat/multimodal-input-surface.test.tsx src/components/chat/multimodal-input-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3064 BETTER_AUTH_URL=http://127.0.0.1:3064 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The root surface is now honest and small, but the composer controls file is
  still a meaningful local owner in the chat input cluster and may deserve a
  more targeted split later if composer work becomes the next high-value area.
