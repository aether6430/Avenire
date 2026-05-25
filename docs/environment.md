# Environment Configuration

This repo uses a shared root environment file for local development.

## Default local setup

1. Copy the example file:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in the variables you actually need for the surfaces you are running.

For most local work, the root `.env.local` file is the main source of truth.

## Load order

### Web and shared packages

The main app and shared server-side packages rely on the repo-root files:

1. `.env`
2. `.env.local`

`.env.local` is the expected local override.

### Backend app

`apps/backend` now uses a consistent layered load order:

1. repo root `.env`
2. `apps/backend/.env`
3. repo root `.env.local`
4. `apps/backend/.env.local`

Shell-exported variables still win over file values.

That means:

- use root `.env.local` for normal local development
- use `apps/backend/.env.local` only if the backend needs an app-specific override

## Important variables

The authoritative list lives in [../.env.example](../.env.example).

The most commonly needed local groups are:

- app URL and auth:
  - `NEXT_PUBLIC_APP_URL`
  - `BETTER_AUTH_URL`
  - `BETTER_AUTH_SECRET`
- infra:
  - `DATABASE_URL`
  - `REDIS_URL`
- model providers:
  - `GEMINI_API_KEY`
  - `GROQ_API_KEY`
  - `OPENROUTER_API_KEY`
  - `MISTRAL_API_KEY`
  - `COHERE_API_KEY`
- uploads and media:
  - `UPLOADTHING_TOKEN`
  - `UPLOAD_SESSION_TOKEN_SECRET`
- email and observability:
  - `RESEND_API_KEY`
  - `POSTHOG_KEY`
  - `POSTHOG_HOST`

## Common local workflows

You usually do not need every variable in [../.env.example](../.env.example)
for every task. Use the smallest set that matches the product slice you are
actually working on.

### Public pages and basic UI work

For static marketing pages, layout work, and non-authenticated UI changes, the
repo can often boot with little more than:

- `NEXT_PUBLIC_APP_URL`

If you are not touching login, uploads, or AI features, most provider keys can
stay empty during that pass.

### Authenticated workspace work

For the signed-in product surface, the usual minimum set is:

- `NEXT_PUBLIC_APP_URL`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `DATABASE_URL`
- `REDIS_URL`

That covers the normal workspace shell, session flow, and server-side data
access.

If you are trying to do a local authenticated browser audit with
`pnpm auth:local-db-start`, the local PostgreSQL install must also support the
`vector` extension because the repo migrations create vector-backed ingestion
tables.

### Uploads, file work, and ingestion

If your task includes uploads, file registration, or ingestion flows, add:

- `UPLOADTHING_TOKEN`
- `UPLOAD_SESSION_TOKEN_SECRET`
- the provider keys needed by the ingestion path you are exercising

For backend queue processing or local ingestion-worker runs, you will also need
the worker and provider settings from `.env.example`, especially:

- `GROQ_API_KEY`
- `MISTRAL_API_KEY`
- `COHERE_API_KEY`

### Email, waitlist, and billing-adjacent flows

When your pass involves outbound email, waitlist approval, or subscription UI
that talks to real services, add the relevant service credentials instead of
enabling every optional integration:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `POLAR_*`

## Related docs

- [../README.md](../README.md) — repo overview and common commands
- [railway.md](railway.md) — production deployment variables and Railway setup
- [../apps/backend/README.md](../apps/backend/README.md) — backend-specific runtime notes
