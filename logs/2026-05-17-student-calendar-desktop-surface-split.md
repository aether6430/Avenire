# Student Calendar Desktop Surface Split

Tags: structure, verification

## What changed

- Split `apps/web/src/components/student-calendar-desktop-surface.tsx` into
  local UI owners:
  - `student-calendar-desktop-day-popover.tsx`
  - `student-calendar-desktop-day-cell.tsx`
  - `student-calendar-desktop-grid.tsx`
- Reduced the root surface file to the outer shell and control rail.
- Added a focused surface test for the header, controls, and due summary.
- Fixed a real month-grid correctness gap while doing the split:
  `buildDesktopMonthCells()` returns leading/trailing `null` padding slots, and
  the new grid now renders those empty cells safely instead of assuming every
  slot is a date object.

## Why it mattered

The desktop student calendar had already moved its runtime into a hook, but the
surface file was still carrying popover behavior, day-cell rendering, month and
week grid layout, and the outer shell in one place. This pass made the surface
cluster easier to change correctly and also hardened the month-grid behavior to
match the real calendar model.

## Verification

- line counts:
  - `student-calendar-desktop-surface.tsx`: `588` -> `196`
  - `student-calendar-desktop-day-popover.tsx`: `145`
  - `student-calendar-desktop-day-cell.tsx`: `120`
  - `student-calendar-desktop-grid.tsx`: `118`
- `node_modules/.bin/biome check apps/web/src/components/student-calendar-desktop-surface.tsx apps/web/src/components/student-calendar-desktop-day-popover.tsx apps/web/src/components/student-calendar-desktop-day-cell.tsx apps/web/src/components/student-calendar-desktop-grid.tsx apps/web/src/components/student-calendar-desktop-surface.test.tsx apps/web/src/components/student-calendar-desktop.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/student-calendar-desktop.test.tsx src/components/student-calendar-desktop-surface.test.tsx src/components/student-calendar-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3046 BETTER_AUTH_URL=http://127.0.0.1:3046 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The desktop surface is materially smaller now, but broader structural
  pressure still remains in `markdown.tsx`, `particle-field.tsx`,
  `rolling-reasoning.tsx`, and the explorer/chat clusters.
