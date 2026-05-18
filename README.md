<p align="center">
  <img height="80" src="https://github.com/thedamod/Avenire/blob/main/apps/web/public/branding/avenire-logo-full.png?raw=true" alt="Avenire logo">
</p>

# Avenire

Avenire is an AI learning workspace for turning source material into notes,
retrieval context, mindset sets, tasks, and guided chat. The repository is a
working monorepo, not a demo snapshot: the web app, backend worker, shared AI
packages, ingestion pipeline, and deployment docs all live here.

## What the product covers

- methods and guided chat with retrieval over workspace material
- notes and rich document editing
- files, uploads, ingestion, and search
- mindset sets, misconceptions, and study workflows
- tasks, calendar, and workspace coordination
- public marketing and legal pages

## Product language

The repository uses a few product terms that matter when you are navigating the
workspace or changing copy:

- `Methods` are persistent guided chat threads tied to workspace context.
- `Mindset sets` are the study/review sets generated from material,
  misconceptions, or manual editing.
- `Files` is the document and asset workspace, not a generic admin surface.
- `Apollo` is the branded workspace assistant that tutors, explains, and works
  across those surfaces.

When docs or UI copy talk about a generic `chat`, it usually describes the
interaction style. When the product refers to the saved workspace surface, the
preferred user-facing label is `Method` / `Methods`.

## Monorepo map

### Apps

- `apps/web` — main Next.js product surface, authenticated workspace UI, public
  site, and most API routes
- `apps/backend` — HTTP backend runtime plus ingestion worker entrypoints
- `apps/emails` — React Email templates
- `apps/extension` — browser extension surface

### Shared packages

- `packages/ai` — prompts, tool wiring, study skills, and model orchestration
- `packages/auth` — authentication and session flows
- `packages/database` — schema and database access
- `packages/ingestion` — ingest, chunking, embeddings, retrieval helpers, and
  queue logic
- `packages/storage` — storage/upload helpers
- `packages/ui` — shared UI primitives

## Getting started

### Prerequisites

- `pnpm`
- `bun` for the repo's prebuild and local Next.js workflow

### Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create local env config:

   ```bash
   cp .env.example .env.local
   ```

   The repo-root `.env.local` file is the default local config for the product.
   `apps/backend/.env.local` is only needed for backend-specific overrides.

3. Start the workspace:

   ```bash
   pnpm dev
   ```

That runs the app-level `dev` scripts through Turbo. The main product surface is
`apps/web`, whose default dev server runs on port `3000`.

### Local integrity check

On macOS, some repos can end up with `dataless` placeholder files instead of
fully materialized local content. When that happens, normal file reads, type
checks, or lint passes can hang in ways that look like tool bugs.

Run:

```bash
pnpm doctor:dataless
```

The default output now shows a grouped summary plus a small sample path list.
If you want to attempt a bounded local warm-up of placeholder files, run:

```bash
pnpm doctor:dataless:materialize
```

If it reports placeholder files, treat that as a local workspace integrity
problem first and materialize the files before trusting other verifier results.
The root `pnpm lint`, `pnpm check-types`, `pnpm test`, `pnpm test:budget`,
`pnpm test:coverage:repo`, `pnpm build`, and `pnpm dev` commands now fail fast
on that condition instead of drifting into misleading verifier hangs.

## Commands that matter

### Repo-wide

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm test:budget`
- `pnpm test:coverage:repo`
- `pnpm doctor:dataless`
- `pnpm check-types`
- `pnpm lint`
- `pnpm db:generate`
- `pnpm db:migrate`

### Web app

- `pnpm --filter @avenire/web dev`
- `pnpm --filter @avenire/web test`
- `pnpm --filter @avenire/web test:coverage`
- `pnpm --filter @avenire/web check-types`

### Coverage verifiers

- `pnpm --filter @avenire/web test:coverage` — direct whole-app V8 coverage for
  the web product surface
- `pnpm test:coverage:repo` — repo-level conservative lower-bound coverage
  report; runs direct coverage for the tested packages and counts the remaining
  packages as `0` covered in the aggregate
- `pnpm test:budget` — repo-wide and per-package source/test LOC ceiling check

### What the gates mean

- `pnpm build` — runs the repo build graph, including the production `@avenire/web`
  build and package-level build gates
- `pnpm check-types` — runs the repo-wide type gate across the active packages
- `pnpm test` — runs the retained runtime, route, model, and UI suites
- `pnpm test:budget` — enforces the test-volume ceiling both repo-wide and per
  package
- `pnpm test:coverage:repo` — enforces the conservative repo-level coverage
  floor using direct V8 coverage where it exists and `0` covered LOC elsewhere

### Backend

- `pnpm --filter @avenire/backend dev`
- `pnpm --filter @avenire/backend dev:ingestion`
- `pnpm --filter @avenire/backend start`
- `pnpm --filter @avenire/backend start:ingestion`

## Where to read next

- [Architecture](ARCHITECTURE.md) — system-level map of storage, ingestion,
  retrieval, chat, and runtime layers
- [Docs Index](docs/README.md) — navigation for deployment and operational docs
- [Environment guide](docs/environment.md) — local env loading and variable layout
- [Local workspace integrity](docs/local-workspace-integrity.md) — how to detect and fix macOS `dataless` placeholder files before trusting verifier hangs
- [Migration guide](docs/migrations.md) — database migration commands and history
- [Web app guide](apps/web/README.md) — layout of the Next.js product surface
- [Railway deployment](docs/railway.md) — production deployment notes

## Repository status

This repo is actively being tightened into a more coherent product foundation.
The recent work has focused on reliability, route coverage, structural
ownership, and public-facing coherence. Public repository docs should point to
source, tests, and operating guides rather than local operator artifacts.

## License

No standalone `LICENSE` file is currently included in this repository. Until a
license is added, treat the code as all rights reserved.
