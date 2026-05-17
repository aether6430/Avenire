# Dashboard Chat Sidebar Runtime

Tags: tests, structure, reliability, ux

## What changed

Added a new runtime-model layer for the dashboard chat sidebar and direct hook
coverage for sidebar chat actions.

New files:

- `apps/web/src/components/dashboard/dashboard-sidebar-chat-runtime-model.ts`
- `apps/web/src/components/dashboard/dashboard-sidebar-chat-runtime-model.test.ts`
- `apps/web/src/components/dashboard/use-dashboard-sidebar-chat-actions.test.tsx`

Updated:

- `apps/web/src/components/dashboard/use-dashboard-sidebar-chats.ts`

Covered behavior:

- active chat slug resolution precedence
- primary chat route resolution
- pinned/other chat sorting and search filtering
- chat search toggle behavior
- create-chat navigation
- successful rename/pin updates through sidebar actions
- delete failure side effects
- active-chat delete success path, including route replacement and refresh

## Why it mattered

The dashboard chat sidebar is a high-frequency product surface, but its runtime
logic had no direct floor. This pass makes the deterministic view-model and
action logic explicit and tested without needing a browser automation layer.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/dashboard/dashboard-sidebar-chat-runtime-model.ts apps/web/src/components/dashboard/dashboard-sidebar-chat-runtime-model.test.ts apps/web/src/components/dashboard/use-dashboard-sidebar-chat-actions.test.tsx apps/web/src/components/dashboard/use-dashboard-sidebar-chats.ts`
- `node_modules/.bin/vitest run src/components/dashboard/dashboard-sidebar-chat-runtime-model.test.ts src/components/dashboard/use-dashboard-sidebar-chat-actions.test.tsx src/components/dashboard/dashboard-sidebar-chat-panel.test.tsx src/components/dashboard/dashboard-sidebar-shared.test.tsx src/components/dashboard/sidebar-startup.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The sidebar runtime is stronger now, but the collection/events/session-close
hooks still hold more lifecycle behavior than the pure runtime model. If we keep
investing here, those are the next likely candidates.
