# Dashboard Sidebar Content Split

Tags: structure, verification

## What changed

- Reduced `dashboard-sidebar-content.tsx` to the root coordinator for the
  workspace shell sidebar.
- Split the old mixed-responsibility file into local owners:
  - `dashboard-sidebar-content.tsx`
  - `dashboard-sidebar-workspace-home.tsx`
  - `dashboard-sidebar-mounted-views.tsx`
- Added a focused wrapper test proving the root routes between workspace-home
  and mounted-view bodies.

## Why it mattered

The old sidebar-content file mixed the workspace-home action surface with the
mounted chat/files/tasks/flashcards view stack. This pass made the root file
honest and split those two responsibilities into clearer local owners without
changing the underlying sidebar runtime model.

## Verification

- line counts:
  - `dashboard-sidebar-content.tsx`: `449` -> `150`
  - `dashboard-sidebar-workspace-home.tsx`: `143`
  - `dashboard-sidebar-mounted-views.tsx`: `225`
  - `dashboard-sidebar-content.test.tsx`: `57`
- `node_modules/.bin/biome check apps/web/src/components/dashboard/dashboard-sidebar-content.tsx apps/web/src/components/dashboard/dashboard-sidebar-content.test.tsx apps/web/src/components/dashboard/dashboard-sidebar-workspace-home.tsx apps/web/src/components/dashboard/dashboard-sidebar-mounted-views.tsx apps/web/src/components/dashboard/command-palette-groups.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/dashboard/dashboard-sidebar-content.test.tsx src/components/dashboard/command-palette-groups.test.tsx src/components/dashboard/command-palette-surface.test.tsx`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3061 BETTER_AUTH_URL=http://127.0.0.1:3061 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The root sidebar-content file is now much smaller, but the mounted views and
  command/search sections are still meaningful local surfaces that may deserve
  future targeted refinement if sidebar work becomes the next high-value area.
