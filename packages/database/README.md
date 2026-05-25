# @avenire/database

Drizzle-based database layer and schema for Avenire.

## What it includes

- schema definitions in `src/`
- shared DB client exports in `src/index.ts`
- grouped data modules for auth, billing, chats, files, flashcards,
  ingestion, learning, session summaries, sudo, tasks, user settings, and
  waitlist
- SQL migrations in `drizzle/`
- migration metadata in `drizzle/meta/`

## Export surface

- `@avenire/database` re-exports the package root data modules from
  [src/index.ts](/Users/johnmacartew/Developer.nosync/aveniri/packages/database/src/index.ts)
- `@avenire/database/schema`, `@avenire/database/auth-schema`, and
  `@avenire/database/client` stay available as explicit subpath exports
- small internal files may move between package modules over time, but the root
  package surface is the stable entrypoint for app/server consumers

## Scripts

- `pnpm --filter @avenire/database db:generate`: generate migration files
- `pnpm --filter @avenire/database db:migrate`: apply migrations
- `pnpm --filter @avenire/database build`
- `pnpm --filter @avenire/database check-types`
- `pnpm --filter @avenire/database lint`
- `pnpm --filter @avenire/database test`

## Notes

- Use runtime exports from backend/server code.
- Type-only imports may still appear in app code when they erase at compile
  time, but client runtime code should not execute database helpers directly.
