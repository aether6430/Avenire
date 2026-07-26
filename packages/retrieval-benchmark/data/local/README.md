# Local database supplement

This directory is intentionally ignored except for this note. Run
`pnpm --filter @avenire/retrieval-benchmark corpus:import-db` to create a
checksum-pinned local manifest and download the active PDF and video assets from
the configured Avenire database. The files remain local and are never included
in the distributable benchmark corpus.

When present, `manifest.json` and `dataset.json` are merged with the controlled
benchmark contracts by the validator, runner, and reporter.
