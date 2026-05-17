# No-Sync Recovery From Desktop Checkout

Tags: structure, reliability, docs, verification

## What changed

Recovered the missing desktop-side artifacts back into the correct no-sync
checkout at `~/Developer.nosync/aveniri`.

Transferred:

- `apps/web/src/lib/upload-error-message.ts`
- the matching `apps/web/src/lib/upload.ts` export change
- the missing desktop-side receipts:
  - `logs/2026-05-17-file-preview-panel-coordinator-split.md`
  - `logs/2026-05-17-files-explorer-runtime-split.md`
  - `logs/2026-05-17-files-root-surface-model-split.md`
  - `logs/2026-05-17-files-route-terminal-states.md`
  - `logs/2026-05-17-share-dialog-ownership-split.md`

I did not overlay the full desktop explorer/files tree onto no-sync because the
current no-sync checkout already contains a later and broader explorer split.
The raw desktop tree would have deleted or regressed parts of the stronger
no-sync structure.

## Why it mattered

The repo had split into two active checkouts:

- correct: `~/Developer.nosync/aveniri`
- wrong: `~/Desktop/aveniri`

That made recovery work land in the sync-prone Desktop clone after the team had
already agreed to move active development into the no-sync checkout. This pass
pulls the missing, non-regressive artifacts back into the right repository and
records the divergence window explicitly.

## Verification

- `git -C ~/Developer.nosync/aveniri fetch ~/Desktop/aveniri main:refs/remotes/desktop-sync/main`
- `git -C ~/Developer.nosync/aveniri cherry -v HEAD desktop-sync/main`
- `node_modules/.bin/biome check apps/web/src/lib/upload.ts apps/web/src/lib/upload-error-message.ts`
- `node_modules/.bin/vitest run src/components/files/explorer/explorer-upload-batch.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`

## Remaining concerns

The first confirmed no-sync-only work ended at `2026-05-17 13:54:32 +0300`
(`0ae5443 Split explorer pane surfaces props`). The first confirmed desktop-side
work after that appears by `2026-05-17 14:57:14 +0300` (`1a91a00 Split file
preview markdown pane`). Desktop contains committed history that is partly
superseded by later no-sync work, so future recovery should keep favoring the
no-sync tree as source of truth.
