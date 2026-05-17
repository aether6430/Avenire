# Chat Runtime Seam

Tags: tests, structure, reliability, chat

## What changed

Extracted the main deterministic non-React branches out of
`apps/web/src/components/chat/use-chat-runtime.ts` into:

- `apps/web/src/components/chat/use-chat-runtime-runtime.ts`
- `apps/web/src/components/chat/use-chat-runtime-runtime.test.ts`

Covered behavior:

- routing `data-chatCreated`, `data-chatName`, and `data-agent_activity`
  payloads
- optimistic pending-message priming for brand-new chats
- clearing optimistic pending messages when a new-chat send fails before route
  handoff
- preserving pending messages once a route handoff already exists
- regeneration flow rollback when resending from an assistant message fails
- submission payload building for text-only vs file-backed sends
- pending chat-route handoff flushing
- stream-status publishing and ready-finish publishing
- dropped-file limit handling and attachment append logic
- auto-prompt dispatch for fresh chats
- completed assistant-reply signaling after streaming/submitted -> ready

## Why it mattered

`use-chat-runtime.ts` is a core user-facing hook with zero direct coverage. The
whole hook is still larger than ideal, but this pass pulls out the densest
deterministic branches so they can be tested without dragging React lifecycle
concerns into every assertion.

That makes the main chat surface less dependent on indirect confidence from the
wrapper component tests alone.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/chat/use-chat-runtime-runtime.ts apps/web/src/components/chat/use-chat-runtime-runtime.test.ts apps/web/src/components/chat/use-chat-runtime.ts`
- `node_modules/.bin/vitest run src/components/chat/use-chat-runtime-runtime.test.ts src/components/chat/use-chat-runtime-model.test.ts src/components/chat/chat-model.test.ts src/components/chat/chat.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The chat runtime is cleaner now, but the hook still owns substantial effect
orchestration around scrolling coordination. That is the next natural chat
follow-up if we keep pushing on this surface.
