# Desktop Log Index

Tags: docs, logs, verification

## What changed

- Added `docs/desktop-log-index-current.md` to summarize the old Desktop
  historical log cluster from within the active no-sync repo.

## Why it mattered

One of the persistent audit gaps has been that the active repo and the old
Desktop workspace split the evidence trail. A lightweight index is not the same
as copying all historical receipts, but it makes that older log cluster
discoverable and measurable from the active repo.

## Verification

- historical Desktop log directory:
  - `/Users/johnmacartew/Desktop/aveniri/logs`
- total files found:
  - `719`
- date distribution recovered from filenames:
  - `2026-05-12` -> `81`
  - `2026-05-13` -> `131`
  - `2026-05-14` -> `59`
  - `2026-05-15` -> `380`
  - `2026-05-16` -> `68`
- sampled Desktop log files are currently:
  - `compressed,dataless`

## Remaining concerns

- the split-evidence problem is reduced, not solved
- a future pass may still want to selectively materialize or copy specific
  historical logs whose content remains important
