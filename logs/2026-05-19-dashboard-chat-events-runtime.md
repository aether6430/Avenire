# Dashboard Chat Events Runtime

Tags: tests, structure, reliability, ux

## What changed

Added a new runtime helper layer for deterministic dashboard sidebar chat event
and session-close behavior:

- `apps/web/src/components/dashboard/dashboard-sidebar-chat-events-runtime.ts`
- `apps/web/src/components/dashboard/dashboard-sidebar-chat-events-runtime.test.ts`

Covered behavior:

- pending chat creation only for new-chat flows
- chat-name updates for both pending-created chats and existing chat lists
- chat stream-status transitions into pending/ready/error sidebar states
- invalidation reload gating for chat-only workspace invalidations
- session-close scope creation and timer-start conditions

## Why it mattered

The sidebar’s event/session-close hooks still had 0% direct floor even after
earlier sidebar passes. Those hooks sit under a high-frequency UX surface where
small event-ordering mistakes can feel very confusing in practice.

This pass makes the deterministic parts explicit and independently testable,
shrinking the unproven hook logic around them.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/dashboard/dashboard-sidebar-chat-events-runtime.ts apps/web/src/components/dashboard/dashboard-sidebar-chat-events-runtime.test.ts`
- `node_modules/.bin/vitest run src/components/dashboard/dashboard-sidebar-chat-events-runtime.test.ts src/components/dashboard/dashboard-sidebar-chat-collection-runtime.test.ts src/components/dashboard/dashboard-sidebar-chat-runtime-model.test.ts src/components/dashboard/use-dashboard-sidebar-chat-actions.test.tsx src/components/dashboard/dashboard-sidebar-chat-panel.test.tsx src/components/dashboard/dashboard-sidebar-shared.test.tsx src/components/dashboard/sidebar-startup.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The remaining untested sidebar behavior now lives more in the actual React hook
lifecycle and DOM event wiring than in the deterministic state transitions
themselves. If we keep investing here, the next step would be a small hook-level
floor for the event/session-close wrappers or browser-level verification.
