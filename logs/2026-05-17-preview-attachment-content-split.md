# Preview Attachment Content Split

Tags: structure, verification

## What changed

- Reduced `preview-attachment-content.tsx` to a thin export surface.
- Split the old mixed attachment-content file into local owners:
  - `preview-attachment-thumbnail.tsx`
  - `preview-attachment-hover-preview.tsx`
  - `preview-attachment-modal.tsx`
  - `preview-attachment-content.tsx`
- Added a focused content test covering:
  - PDF thumbnail rendering
  - busy pill icon rendering
  - code hover preview rendering
  - modal export availability

## Why it mattered

The attachment preview cluster already had solid local model/data/runtime files,
but `preview-attachment-content.tsx` was still carrying several unrelated UI
surfaces in one place. This pass aligned it with the repo’s current pattern:
small entry file, local owners for each real surface.

## Verification

- line counts:
  - `preview-attachment-content.tsx`: `455` -> `8`
  - `preview-attachment-thumbnail.tsx`: `119`
  - `preview-attachment-hover-preview.tsx`: `71`
  - `preview-attachment-modal.tsx`: `276`
  - `preview-attachment-content.test.tsx`: `42`
- `node_modules/.bin/biome check apps/web/src/components/chat/preview-attachment-content.tsx apps/web/src/components/chat/preview-attachment-content.test.tsx apps/web/src/components/chat/preview-attachment-thumbnail.tsx apps/web/src/components/chat/preview-attachment-hover-preview.tsx apps/web/src/components/chat/preview-attachment-modal.tsx apps/web/src/components/chat/preview-attachment-model.ts apps/web/src/components/chat/preview-attachment-data.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/chat/preview-attachment-content.test.tsx src/components/chat/preview-attachment-model.test.ts src/components/chat/preview-attachment-data.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3059 BETTER_AUTH_URL=http://127.0.0.1:3059 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The content entry file is now tiny and honest, but the modal surface is still
  a larger local owner and the broader chat/files preview cluster remains one
  of the denser app-facing areas.
