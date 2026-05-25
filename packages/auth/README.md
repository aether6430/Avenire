# @avenire/auth

Authentication package built around Better Auth.

## Exports

- explicit subpath exports only; there is no root catch-all package surface
- `./client`: Better Auth client helpers for session, sign-in/out, account links,
  passkeys, password reset, and billing portal/checkout calls
- `./server`: Better Auth server configuration, email flows, workspace bootstrap,
  trusted-origin handling, and waitlist enforcement
- `./components/login`, `./components/register`, `./components/waitlist`
- `./components/icons`
- `./middleware`: session gate for protected Next.js routes
- `./parse-user-agent`: browser/device/OS label helper for auth and security UI

## Scripts

- `pnpm --filter @avenire/auth auth:generate`: regenerate Better Auth DB schema
- `pnpm --filter @avenire/auth build`
- `pnpm --filter @avenire/auth test`
- `pnpm --filter @avenire/auth check-types`
- `pnpm --filter @avenire/auth lint`

## Dependencies

- `@avenire/database` for auth tables, persistence, waitlist, and billing-backed
  auth flows
- `@avenire/emailer` for auth-related emails
- `@avenire/ui` for shared UI primitives
