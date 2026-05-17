# Messages Thin Wrapper

Tags: structure, verification

## What changed

- Reduced `messages.tsx` to a thin wrapper around already-existing local owners:
  - `messages-model.ts`
  - `use-chat-messages.ts`
  - `messages-surface.tsx`
- Added a focused wrapper test:
  - `messages.test.tsx`

## Why it mattered

The chat messages cluster had already been partially decomposed, but the public
`messages.tsx` file still duplicated model, runtime, and surface logic that now
clearly belongs to those extracted owners. This pass made the public file
honest without changing the underlying behavior.

## Verification

- line counts:
  - `messages.tsx`: `403` -> `14`
  - `messages-model.ts`: `146`
  - `use-chat-messages.ts`: `99`
  - `messages-surface.tsx`: `175`
  - `messages.test.tsx`: `54`
- `node_modules/.bin/biome check apps/web/src/components/chat/messages.tsx apps/web/src/components/chat/messages.test.tsx apps/web/src/components/chat/messages-model.ts apps/web/src/components/chat/use-chat-messages.ts apps/web/src/components/chat/messages-surface.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/chat/messages.test.tsx src/components/chat/messages-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3071 BETTER_AUTH_URL=http://127.0.0.1:3071 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The public wrapper is now tiny and honest, but `messages-surface.tsx` and
  the chat runtime cluster remain meaningful local owners.
