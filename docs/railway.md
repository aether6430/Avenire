# Railway Deployment

This repo deploys cleanly as two Railway services:

- `web`: the Next.js app in `apps/web`
- `backend`: the HTTP backend in `apps/backend`

Railway services keep variables scoped per service, so each service needs its own runtime env config. Use reference variables to connect to the shared Postgres and Redis services.

## Railway Setup

1. Create or open the Railway project `avenire`.
2. Add your existing Postgres and Redis services to the same project.
3. Create two app services from the same GitHub repo:
   - `web`
   - `backend`
4. Keep the repo root as the source root for both services so workspace packages resolve correctly.

## Service Commands

### Web service

- Build: `pnpm build`
- Start: `pnpm --filter @avenire/web start`
- Public domain: generate one in Railway networking settings
- Deploy runs `pnpm db:migrate` in `preDeployCommand` for the `web` service so schema changes, including auth tables like `waitlist`, are applied before the app starts.

`pnpm build` runs the root `prebuild` hook first, which regenerates `packages/ai/skills/skills.ts` before Turbo starts the workspace build graph.

## Approving Waitlist Users

Waitlist approvals are handled through the maintenance route in the web app:

- `GET /api/maintenance/waitlist` lists `pending` and `approved` waitlist entries
- `POST /api/maintenance/waitlist` approves an email address and sends the approval email

Both endpoints require `Authorization: Bearer <MAINTENANCE_CRON_TOKEN>`.

Example:

```bash
curl -X POST \
  https://<your-web-domain>/api/maintenance/waitlist \
  -H "Authorization: Bearer $MAINTENANCE_CRON_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"person@example.com"}'
```

### Backend service

- Build: `pnpm --filter @avenire/backend build`
- Start: `pnpm --filter @avenire/backend start`
- Health check: `/health`

## Environment Variables

### Shared infra

Set these on both `web` and `backend`:

- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `REDIS_URL=${{Redis.REDIS_URL}}`

Replace `Postgres` and `Redis` with the exact Railway service names you chose if they differ.

### Web service

Set these on `web`:

- `NODE_ENV=production`
- `NEXT_PUBLIC_APP_URL=https://<your-web-domain>`
- `BETTER_AUTH_URL=https://<your-web-domain>`
- `BETTER_AUTH_SECRET=<strong-random-secret>`
- `BETTER_AUTH_TRUSTED_ORIGINS=https://<your-web-domain>`

Recommended for the full app:

- `SSE_TOKEN_SECRET=<strong-random-secret>`
- `UPLOAD_SESSION_TOKEN_SECRET=<strong-random-secret>`
- `MAINTENANCE_CRON_TOKEN=<strong-random-secret>`
- `RESEND_API_KEY=...`
- `UPLOADTHING_TOKEN=...`
- `AXIOM_TOKEN=...`
- `OBSERVABILITY_ENABLED=true`
- `OBSERVABILITY_SERVICE=web`

### Backend service

Set these on `backend`:

- `NODE_ENV=production`

The backend server itself only needs `PORT` from Railway plus the shared infra vars above. If you later expose backend-specific endpoints or auth there, add only the variables that code actually reads.

## Important Note About the Ingestion Worker

This repo also has a separate ingestion worker at `apps/backend/src/ingestion-worker.ts`.

If you want file ingestion, retries, and queue processing in production, add a third Railway service:

- Build: `pnpm --filter @avenire/backend build`
- Start: `pnpm --filter @avenire/backend start:ingestion`

That worker requires:

- `MISTRAL_API_KEY`
- `GROQ_API_KEY`
- `COHERE_API_KEY`
- `REDIS_URL`
- `DATABASE_URL`

Without that worker service, upload and ingestion jobs can enqueue but will not be processed.

## Railway Docs Used

- Variables reference: https://docs.railway.com/reference/variables
- Private networking: https://docs.railway.com/guides/private-networking
- PostgreSQL variables: https://docs.railway.com/guides/postgresql
- Service setup: https://docs.railway.com/guides/services
