# Workspace Share Members And Team Floor

Tags: tests, reliability, sharing, collaboration, public

## What changed

Added direct coverage for the main workspace collaboration handlers:

- `apps/web/src/app/api/workspaces/[workspaceUuid]/share/members/workspace-share-members-handlers.test.ts`
- `apps/web/src/app/api/workspaces/[workspaceUuid]/share/team/workspace-share-team-post.test.ts`

New directly covered behavior:

- listing shareable workspace members with fallback user lookup
- rejecting non-admin member invites
- invalid-email and already-member invite handling
- invite success with tolerant share-email failure handling
- member removal failure surfacing
- missing-workspace and non-admin team-share exits
- queued team-share delivery through the async `after(...)` path
- tolerant email-delivery failure handling for team sharing

## Why it mattered

This is the core collaboration surface behind workspace sharing. The model layer
already had tests, but the live invite/list/remove/team handlers were still
effectively unproven even though they touch permissions, invitations, and
outbound email behavior.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/workspaces/[workspaceUuid]/share/members/workspace-share-members-handlers.test.ts apps/web/src/app/api/workspaces/[workspaceUuid]/share/team/workspace-share-team-post.test.ts`
- `node_modules/.bin/vitest run src/app/api/workspaces/[workspaceUuid]/share/members/workspace-share-members-handlers.test.ts src/app/api/workspaces/[workspaceUuid]/share/team/workspace-share-team-post.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The collaboration handlers now have a much stronger floor, but the thin route
wrappers above them remain lighter than the internal behavior they delegate to.
