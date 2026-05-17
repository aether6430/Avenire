# Recover Instruction And Unblock Coverage Gates

Tags: tests, docs, verification, structure

## What changed

- Recovered the real `instruction.md` from the old Desktop workspace and added
  it to the active no-sync repo.
- Ran the repo-level test budget and coverage scripts that directly map to the
  instruction's explicit quantitative requirements.
- Fixed stale coverage blockers in:
  - `apps/web/src/app/workspace/files/[workspaceUuid]/page.test.ts`
  - `apps/web/src/app/workspace/files/[workspaceUuid]/folder/[folderUuid]/page.test.ts`
  - `packages/auth/client-wrappers.test.ts`
  - `packages/auth/vitest.config.ts`
  - `packages/database/src/learning-taxonomy.test.ts`
  - `apps/web/scripts/send-pending-waitlist-emails.ts`
- Updated the completion audit to use the actual recovered instruction instead
  of a surrogate summary.

## Why it mattered

The original instruction contains the clearest hard requirements in the whole
goal, especially:

- repo test LOC must stay at or below 25% of source LOC
- repo coverage must reach at least 10%

Until those gates were measured against the real instruction, the overall
completion audit was still missing direct evidence on one of the most explicit
workstreams.

## Verification

- `pnpm test:budget`
  - passed
  - repo source LOC: `177654`
  - repo test LOC: `31249`
  - repo ratio: `17.59%`
- `pnpm test:coverage:repo`
  - passed
  - repo lower-bound coverage: `11.03%`
- `pnpm --filter @avenire/web exec vitest run src/app/workspace/files/[workspaceUuid]/page.test.ts src/app/workspace/files/[workspaceUuid]/folder/[folderUuid]/page.test.ts`
  - passed
- `pnpm --filter @avenire/auth test`
  - passed
- `pnpm --filter @avenire/auth test:coverage`
  - passed
- `pnpm --filter @avenire/database test`
  - passed
- `pnpm --filter @avenire/database test:coverage`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `pnpm --filter @avenire/auth check-types`
  - passed
- `pnpm --filter @avenire/database check-types`
  - passed

## Remaining concerns

- The explicit quantitative test floor is now satisfied, but the broader
  end-state is still not achieved because longer-lived signed-in runtime
  durability and richer persisted-state continuity are still only partially
  proven.
