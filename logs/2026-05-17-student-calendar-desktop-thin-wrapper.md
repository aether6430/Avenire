# Student Calendar Desktop Thin Wrapper

Tags: structure, verification

## What changed

- Reduced `apps/web/src/components/student-calendar-desktop.tsx` to a thin
  wrapper around the already-existing local pieces:
  - `use-student-calendar-desktop.ts`
  - `student-calendar-desktop-surface.tsx`
- Added a wrapper-level test to confirm the runtime hook is wired into the
  surface.

## Why it mattered

`student-calendar-desktop.tsx` still held a large combined runtime-and-render
shell even though the local hook/surface boundary was already clear. This pass
 made the ownership shape honest, which lowers the friction for future student
calendar changes.

## Verification

- `wc -l apps/web/src/components/student-calendar-desktop.tsx apps/web/src/components/use-student-calendar-desktop.ts apps/web/src/components/student-calendar-desktop-surface.tsx apps/web/src/components/student-calendar-desktop.test.tsx`
  - before wrapper: `705`
  - after wrapper: `10`
- `node_modules/.bin/biome check apps/web/src/components/student-calendar-desktop.tsx apps/web/src/components/use-student-calendar-desktop.ts apps/web/src/components/student-calendar-desktop-surface.tsx apps/web/src/components/student-calendar-desktop.test.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/student-calendar-desktop.test.tsx src/components/student-calendar-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3041 BETTER_AUTH_URL=http://127.0.0.1:3041 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The wrapper is now small and honest, but the broader product goal still
  needs a successful provider-backed method round-trip and longer-lived
  interactive durability proof.
