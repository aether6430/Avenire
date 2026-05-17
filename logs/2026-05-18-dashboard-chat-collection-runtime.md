# Dashboard Chat Collection Runtime

Tags: tests, structure, reliability, ux

## What changed

Extended the dashboard chat sidebar runtime work with a focused collection layer:

- `apps/web/src/components/dashboard/dashboard-sidebar-chat-collection-runtime.ts`
- `apps/web/src/components/dashboard/dashboard-sidebar-chat-collection-runtime.test.ts`

Updated:

- `apps/web/src/components/dashboard/use-dashboard-sidebar-chat-collection.ts`

Covered behavior:

- replacing current chats from initial server data only when ids truly differ
- hydrating chats from cache when the sidebar workspace changes
- falling back to active-workspace initial chats when no cache exists
- clearing chat lists when switching to a workspace with neither cache nor
  matching initial data
- async `/api/chat/history` loading success/failure behavior
- cache writes only when the tracked workspace still matches

## Why it mattered

The dashboard sidebar runtime was stronger after the previous pass, but the
chat collection hook still had no direct floor despite owning data hydration and
cache coordination for a high-frequency sidebar surface.

This pass puts the collection logic on firmer ground and reduces the amount of
opaque state management still buried in the hook.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/dashboard/dashboard-sidebar-chat-collection-runtime.ts apps/web/src/components/dashboard/dashboard-sidebar-chat-collection-runtime.test.ts apps/web/src/components/dashboard/use-dashboard-sidebar-chat-collection.ts`
- `node_modules/.bin/vitest run src/components/dashboard/dashboard-sidebar-chat-collection-runtime.test.ts src/components/dashboard/dashboard-sidebar-chat-runtime-model.test.ts src/components/dashboard/use-dashboard-sidebar-chat-actions.test.tsx src/components/dashboard/dashboard-sidebar-chat-panel.test.tsx src/components/dashboard/dashboard-sidebar-shared.test.tsx src/components/dashboard/sidebar-startup.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The dashboard chat sidebar stack is much more directly covered now. The next
likely sidebar follow-up would be the event/session-close hooks if more runtime
confidence is needed there.
