# Chat Provider Config Proof

Tags: verification, ux, product, error-handling

## What changed

- Added explicit provider-configuration error mapping in
  `chat-route-logging.ts`.
- Stopped attempting resumable chat-stream setup when `REDIS_URL` is not
  configured.
- Rebuilt the production app and re-ran the persisted method failure path
  against a real method route.

## Why it mattered

The previous pass made provider failure visible. This pass made it specific and
less noisy:

- the method now says the selected AI model is not configured in this
  environment
- the chat stream no longer throws an unrelated resumable-stream/Redis error in
  the normal missing-Redis local path

That makes the product failure mode clearer and the operational signal less
chaotic.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/chat/chat-route-logging.ts apps/web/src/app/api/chat/chat-stream-store.ts apps/web/src/app/api/chat/chat-route-persisted-stream.ts apps/web/src/app/api/chat/chat-route-logging.test.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/app/api/chat/chat-route-logging.test.ts src/components/chat/chat-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... BETTER_AUTH_URL=http://127.0.0.1:3030 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3030 RESEND_API_KEY=... BETTER_AUTH_SECRET=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed
- Detached production server/proxy:
  - `:3031` / `:4031`
- Real persisted chat POST:
  - `POST /api/chat`
  - route still returned `200` SSE
- `GET /api/chats/<slug>` returned:
  - the user message
  - assistant failure text:
    - `The selected AI model isn't configured in this environment. Please configure the AI provider and retry.`
- Browser proof on `/workspace/chats/<slug>` showed:
  - assistant label `Apollo`
  - the explicit configuration failure text
  - `Copy message`
  - `Branch method`
  - `Regenerate response`
- Live server log no longer emitted:
  - `Failed to create resumable chat stream`

## Remaining concerns

- A true successful method-response round-trip still depends on a configured
  provider key.
