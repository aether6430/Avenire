# Chat Failure Recovery Proof

Tags: verification, ux, product, error-handling

## What changed

- Added explicit persisted assistant-side failure handling for persisted chat
  streams in `chat-route-persisted-stream.ts`.
- When the model provider fails during a persisted method response, the route
  now:
  - saves the user message
  - saves an assistant error message
  - clears the active stream id
- Rebuilt the production app and re-ran the failure path against a real
  persisted method route.

## Why it mattered

Before this pass, a failed model response left the method looking abandoned
after reload: the user saw only their own message and no clear explanation.

That was exactly the kind of silent, confusing failure the instruction says to
fix. The product now fails more honestly at the method boundary.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/chat/chat-route-persisted-stream.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... BETTER_AUTH_URL=http://127.0.0.1:3027 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3027 RESEND_API_KEY=... BETTER_AUTH_SECRET=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed
- Detached production server/proxy:
  - `:3029` / `:4029`
- Real persisted chat POST:
  - `POST /api/chat`
  - stream returned `200`
  - SSE contained `type:"error"` with:
    - `The model provider failed while generating this response. Please retry in a moment.`
- Server logs confirmed:
  - `Persisted failed streamed message`
- `GET /api/chats/<slug>` returned:
  - the user message
  - the persisted assistant error message
- Browser proof on `/workspace/chats/<slug>` showed:
  - the user message
  - assistant label `Apollo`
  - explicit failure text
  - `Copy message`
  - `Branch method`
  - `Regenerate response`

## Remaining concerns

- The product now handles a provider failure more honestly, but a true
  successful method-response round-trip still depends on a configured model
  provider key.
