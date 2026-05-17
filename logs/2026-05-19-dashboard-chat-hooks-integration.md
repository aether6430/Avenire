# Dashboard Chat Hooks Integration

Tags: structure, reliability, ux, cleanup

## What changed

Integrated the previously extracted dashboard chat runtime helpers into the live
hooks:

- `apps/web/src/components/dashboard/use-dashboard-sidebar-chat-events.ts`
- `apps/web/src/components/dashboard/use-dashboard-sidebar-chat-session-close.ts`

The hooks now delegate deterministic state transitions to
`dashboard-sidebar-chat-events-runtime.ts` instead of keeping parallel inline
logic.

## Why it mattered

The runtime helper layer existed and was tested, but until this pass the hooks
were still carrying their old inline implementations. That meant part of the
extraction work was still dead weight instead of real structure.

This pass makes the sidebar runtime story honest: tested helpers now back the
actual user-facing hook paths.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/dashboard/use-dashboard-sidebar-chat-events.ts apps/web/src/components/dashboard/use-dashboard-sidebar-chat-session-close.ts`
- `node_modules/.bin/vitest run src/components/dashboard/dashboard-sidebar-chat-events-runtime.test.ts src/components/dashboard/dashboard-sidebar-chat-collection-runtime.test.ts src/components/dashboard/dashboard-sidebar-chat-runtime-model.test.ts src/components/dashboard/use-dashboard-sidebar-chat-actions.test.tsx src/components/dashboard/dashboard-sidebar-chat-panel.test.tsx src/components/dashboard/dashboard-sidebar-shared.test.tsx src/components/dashboard/sidebar-startup.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The dashboard chat sidebar runtime is much more coherent now. The next follow-up
here would be direct hook-level floors for the event/session-close wrappers if
we want to reduce the remaining lifecycle-only uncertainty.
