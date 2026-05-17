# Dashboard Sidebar Runtime Floor

Tags: tests, reliability, ux, state

## What changed

Expanded direct coverage for the existing sidebar runtime model in:

- `apps/web/src/components/dashboard/dashboard-sidebar-runtime-model.test.ts`

New directly covered behavior:

- `sendDashboardSidebarChatSessionClose()` sendBeacon path
- `sendDashboardSidebarChatSessionClose()` fetch fallback path
- `parseDashboardSidebarResponse()` success vs non-ok handling
- `isTypingTarget()` for contentEditable, textarea/select, text inputs, and
  ignored input types

## Why it mattered

The sidebar runtime model already covered route/view derivation, but it still
had a few user-facing utilities with no direct floor. Those utilities are used
inside sidebar chat/session-close and hotkey flows, so giving them explicit
tests improves confidence in both UX and low-level behavior.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/dashboard/dashboard-sidebar-runtime-model.test.ts`
- `node_modules/.bin/vitest run src/components/dashboard/dashboard-sidebar-runtime-model.test.ts src/components/dashboard/dashboard-sidebar-chat-runtime-model.test.ts src/components/dashboard/dashboard-sidebar-chat-collection-runtime.test.ts src/components/dashboard/use-dashboard-sidebar-chat-actions.test.tsx src/components/dashboard/dashboard-sidebar-chat-panel.test.tsx src/components/dashboard/dashboard-sidebar-shared.test.tsx src/components/dashboard/sidebar-startup.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The sidebar runtime surface is meaningfully more covered now. The next likely
follow-up in the sidebar area would be direct floors for the remaining live
hooks that still mostly coordinate effects and event listeners.
