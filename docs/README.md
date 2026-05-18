# Documentation Index

This folder holds operational documentation for the active Avenire repository.

## Start here

- [../README.md](../README.md) — product and monorepo overview
- [../ARCHITECTURE.md](../ARCHITECTURE.md) — deeper system map
- [workspace-surface-map.md](workspace-surface-map.md) — authenticated
  workspace routes, entrypoints, surface owners, and product-language guardrails
- [environment.md](environment.md) — local env loading, variable layout, and
  workflow-specific env groups
- [migrations.md](migrations.md) — database migration commands and history
- [railway.md](railway.md) — Railway deployment setup for the full web,
  backend, and ingestion-worker topology
- `pnpm auth:local-db-start` — starts a temporary local Postgres on the repo's
  expected auth/dev port and runs migrations for local browser audits; requires
  the local PostgreSQL install to have the `vector` extension available
- `pnpm auth:local-verify-link <email> --approve-waitlist` — local helper for
  approving a waitlist entry and printing a verification URL for browser-level
  auth audits
- `pnpm auth:local-session-proxy` — local helper that proxies the running app
  through a real authenticated session cookie for headless-browser proof on
  protected workspace routes

## Useful adjacent references

- [../apps/web/README.md](../apps/web/README.md) — web app structure, route
  map, and surface ownership hints
- [workspace-surface-map.md](workspace-surface-map.md) — the faster operator map
  for Methods, Files, Mindset Sets, Tasks, and Settings
- [../apps/backend/README.md](../apps/backend/README.md) — backend runtime and
  ingestion worker entrypoints
- [../README.md#product-language](../README.md#product-language) — the current
  user-facing meaning of Methods, Mindset Sets, and Files
- [../README.md#what-the-gates-mean](../README.md#what-the-gates-mean) — what
  the root verification commands actually guarantee
- `pnpm test:budget` — repo-wide and per-package source/test LOC ceiling check
- `pnpm test:coverage:repo` — conservative repo-wide coverage floor report

## What is not in this folder

- `instruction.md` is the product-recovery objective driving current cleanup
  work.
- `CHANGELOG.md` is the historical changelog, not the current operating guide.
- `TODO.md` is a loose backlog snapshot, not a source of truth for repository
  structure or deployment.
- local operator artifacts such as `logs/` and `docs/*-current.md` are
  intentionally kept out of the public git history.
