# @avenire/web

Main Next.js application for Avenire. This package contains both the public site
and the authenticated workspace product.

## What lives here

- `src/app` — App Router pages and API routes
- `src/components` — product surfaces such as methods, files, dashboard,
  editor, Mindset Sets, tasks, settings, and marketing
- `src/lib` — shared frontend/server helpers used by routes and UI
- `src/stores` — client state stores
- `content/legal` — legal markdown rendered by public routes

## Product surfaces

- public marketing, pricing, blog, privacy, terms, and about pages
- authenticated workspace with methods, notes, files, tasks, and Mindset Sets
- API routes for retrieval, uploads, workspace file operations, and sharing

## Product language

Within the web app, a few labels carry specific product meaning:

- `Methods` are saved workspace chat threads.
- `Mindset Sets` are the review/study sets surfaced in their own workspace area.
- `Files` is the document workspace and explorer surface.
- `Apollo` is the branded assistant that powers the tutoring/chat experience.

That distinction matters when editing copy or routing UI. `Chat` can still be a
useful generic description, but the preferred workspace surface label for a
saved thread is `Method`.

## Workspace route map

The main authenticated surfaces line up with a small set of route families and
user-facing labels:

- `/workspace/chats/new` and `/workspace/chats/[slug]` — `New Method` and
  saved `Method` threads
- `/workspace/flashcards` and `/workspace/flashcards/[setId]` — `Mindset Sets`
  and a single `Mindset Set`
- `/workspace/files`, `/workspace/files/[workspaceUuid]`, and nested folder
  routes — `Files`
- `/workspace/tasks` — `Tasks`

Public `/chats` and `/chats/new` routes redirect into the authenticated methods
workspace instead of acting as a separate product area.

## Workspace ownership map

When you need to change a product surface, these folders are the main ownership
boundaries inside `apps/web`:

- `src/components/dashboard` — workspace shell, sidebar, pane routing,
  onboarding, and cross-surface orchestration
- `src/components/chat` — method conversation UI, tool output rendering,
  markdown, composer behavior, and assistant chrome
- `src/components/flashcards` — Mindset Set dashboard, sidebar, set detail, and
  review/study flows
- `src/components/files` — files explorer, previews, uploads, circle-to-AI
  search, and sharing
- `src/components/tasks` — tasks workspace, task detail panes, resource picking,
  and task-specific empty/filter states
- `src/components/settings` — settings dialog sections, billing, security,
  workspace management, and data-import flows
- `src/app/api` — route handlers that back the workspace surfaces above
- `src/lib` — shared server/client helpers for route data, retrieval, caches,
  navigation, and workspace state

## Scripts

- `pnpm --filter @avenire/web dev` — run Next.js on port `3000`
- `pnpm --filter @avenire/web build` — production build
- `pnpm --filter @avenire/web start` — run production server
- `pnpm --filter @avenire/web test` — run Vitest suite
- `pnpm --filter @avenire/web test:coverage` — run Vitest with coverage
- `pnpm --filter @avenire/web check-types` — type check
- `pnpm --filter @avenire/web lint` — lint with Biome
- `pnpm --filter @avenire/web format` — format with Biome

## Important integrations

- `@avenire/ai` for model and tool orchestration
- `@avenire/auth` for auth flows
- `@avenire/database` for persistence
- `@avenire/ingestion` for ingest and retrieval helpers
- `@avenire/storage` for uploads and object storage helpers
- `@avenire/ui` for shared design-system components

## Useful repo docs

- [../../README.md](../../README.md) — root repo overview
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md) — system architecture
- [../../docs/README.md](../../docs/README.md) — operational docs index
- [../../docs/workspace-surface-map.md](../../docs/workspace-surface-map.md) —
  authenticated workspace routes, owners, and product-language guardrails
