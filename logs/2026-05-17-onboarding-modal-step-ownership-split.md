# Onboarding Modal Step Ownership Split

Tags: structure, verification

## What changed

- Reduced `apps/web/src/components/dashboard/onboarding-modal-steps.tsx` to a
  thin export surface.
- Split the old giant mixed-responsibility file into local ownership pieces:
  - `onboarding-modal-step-body.tsx`
  - `onboarding-modal-step-panels.tsx`
  - `onboarding-modal-welcome-step.tsx`
  - `onboarding-modal-upload-step.tsx`
  - `onboarding-modal-misconceptions-step.tsx`
  - `onboarding-modal-review-loop-step.tsx`
  - `onboarding-modal-dashboard-step.tsx`
  - plus the already-separated `preview` and `dots` surfaces
- Updated the onboarding copy test so it reads the real owner of the files CTA
  copy instead of a stale aggregator file.

## Why it mattered

`onboarding-modal-steps.tsx` had become a local ownership knot: one file was
mixing step dispatch, per-step UI, preview UI, dot navigation, and copy
responsibility. This pass made the onboarding step cluster easier to change
correctly by turning the root file into a tiny export surface and pushing each
step into a more local owner.

## Verification

- line counts:
  - `onboarding-modal-steps.tsx`: `794` -> `5`
  - `onboarding-modal-step-body.tsx`: `106`
  - `onboarding-modal-step-panels.tsx`: `35`
  - `onboarding-modal-welcome-step.tsx`: `54`
  - `onboarding-modal-upload-step.tsx`: `154`
  - `onboarding-modal-misconceptions-step.tsx`: `208`
  - `onboarding-modal-review-loop-step.tsx`: `116`
  - `onboarding-modal-dashboard-step.tsx`: `75`
- `node_modules/.bin/biome check apps/web/src/components/dashboard/onboarding-modal-steps.tsx apps/web/src/components/dashboard/onboarding-modal-step-body.tsx apps/web/src/components/dashboard/onboarding-modal-step-panels.tsx apps/web/src/components/dashboard/onboarding-modal-welcome-step.tsx apps/web/src/components/dashboard/onboarding-modal-upload-step.tsx apps/web/src/components/dashboard/onboarding-modal-misconceptions-step.tsx apps/web/src/components/dashboard/onboarding-modal-review-loop-step.tsx apps/web/src/components/dashboard/onboarding-modal-dashboard-step.tsx apps/web/src/components/dashboard/onboarding-modal-step-preview.tsx apps/web/src/components/dashboard/onboarding-modal-step-dots.tsx apps/web/src/components/dashboard/files-entry-onboarding-copy.test.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/dashboard/files-entry-onboarding-copy.test.ts src/components/dashboard/onboarding-modal-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3044 BETTER_AUTH_URL=http://127.0.0.1:3044 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The onboarding step cluster is much more legible now, but broader structural
  pressure still remains in files like `rolling-tool-activity-surface.tsx`,
  `markdown.tsx`, `particle-field.tsx`, and the remaining explorer cluster.
