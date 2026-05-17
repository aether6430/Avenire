# Explorer Pane Surfaces Props Split

Tags: structure, verification

## What changed

- Reduced `use-explorer-pane-surfaces.ts` to the hook that coordinates local
  surface derivations and pane-header wiring.
- Split the large prop-assembly blocks into local owners:
  - `use-explorer-pane-surfaces-types.ts`
  - `explorer-pane-surfaces-browse-props.ts`
  - `explorer-pane-surfaces-preview-props.ts`
- Added focused prop-builder tests:
  - `explorer-pane-surfaces-props.test.ts`

## Why it mattered

The old hook mixed:

- pane-summary and action derivation
- pane-header orchestration
- very large browse-pane prop assembly
- preview-pane prop assembly

This pass keeps the hook as the owner of the higher-level explorer pane
coordination while moving the browse/preview prop wiring into explicit local
owners that are easier to inspect and change correctly.

## Verification

- line counts:
  - `use-explorer-pane-surfaces.ts`: `419` -> `219`
  - `use-explorer-pane-surfaces-types.ts`: `90`
  - `explorer-pane-surfaces-browse-props.ts`: `236`
  - `explorer-pane-surfaces-preview-props.ts`: `78`
  - `explorer-pane-surfaces-props.test.ts`: `222`
- `node_modules/.bin/biome check apps/web/src/components/files/explorer/use-explorer-pane-surfaces.ts apps/web/src/components/files/explorer/use-explorer-pane-surfaces-types.ts apps/web/src/components/files/explorer/explorer-pane-surfaces-browse-props.ts apps/web/src/components/files/explorer/explorer-pane-surfaces-preview-props.ts apps/web/src/components/files/explorer/explorer-pane-surfaces-props.test.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/files/explorer/explorer-pane-surfaces-props.test.ts src/components/files/explorer/workspace-bulk-operations-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3075 BETTER_AUTH_URL=http://127.0.0.1:3075 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The root hook is now much smaller and clearer, but the extracted browse prop
  owner remains a large local file because it still assembles the full browse
  pane surface contract.
