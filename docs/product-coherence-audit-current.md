# Product Coherence Audit Current

Tags: audit, product, ux, public-pages, auth-entry

## Scope

This audit checks the currently runnable product surfaces in the active
no-sync repo against the long-horizon goal’s coherence standard.

Because the local environment is running with build-safe placeholder envs, this
audit focuses on:

- public entry surfaces
- auth entry surfaces
- unauthenticated workspace entry behavior

It does **not** claim full authenticated in-session workspace proof yet.

## Commands used

Local app:

- `DATABASE_URL=postgres://localhost:5433/avenire`
- `BETTER_AUTH_URL=http://localhost:3000`
- `BETTER_AUTH_SECRET=0123456789abcdef0123456789abcdef`
- `RESEND_API_KEY=re_dummy_123456789012345678901234`
- `NODE_ENV=development pnpm --filter @avenire/web dev`

Browser inspection:

- Playwright CLI session `avenire-audit`
- visited routes:
  - `/`
  - `/pricing`
  - `/login`
  - `/workspace` (redirected to `/login`)

Auth-backed local environment:

- local Postgres via `bash scripts/local-auth-db-start.sh`
- `DATABASE_URL=postgres://johnmacartew@localhost:5433/avenire`
- local waitlist approval helper:
  - `bun scripts/local-auth-verification-link.ts audit+workspace@example.com --approve-waitlist --callback /workspace`
- live sign-up and verification evidence collected from the running dev server

## Observed strengths

### 1. Public nav is consistent

On both `/` and `/pricing`, the top nav exposes the same primary public routes:

- `Pricing`
- `Roadmap`
- `About`
- `Blog`
- `Log in`
- `Join waitlist`

This is a simple but important coherence win: the public chrome now behaves
like one product site, not a set of unrelated pages.

### 2. Landing page communicates a concrete product

Observed on `/`:

- clear product headline:
  - `AI Learning Workspace for clearer thinking`
- audience qualifier:
  - `For focused students and researchers`
- direct CTA pair:
  - `Join waitlist`
  - `See plans`
- visible product imagery rather than decorative abstraction

That makes the first page feel product-led rather than marketing-generic.

### 3. Pricing page matches the product lexicon

Observed on `/pricing`:

- title:
  - `Simple pricing for serious study`
- plans:
  - `Access`
  - `Core`
  - `Scholar`
- feature language stays connected to the product:
  - `Core AI methods workspace`
  - `Basic mindset generation`
  - `Deep Research mode`
  - `AI file and note search`

The pricing surface reads like the same product family as the landing page,
not a detached billing page from another app.

### 4. Auth entry is calm and cohesive

Observed on `/login`:

- compact, focused layout
- consistent legal footer links
- multi-provider entry points:
  - Google
  - Github
  - Passkey

The auth screen does not feel visually or verbally disconnected from the rest
of the public product.

### 5. Unauthenticated workspace routing is sane

Observed on `/workspace`:

- unauthenticated access redirected to `/login`

That is a meaningful coherence signal because the boundary between public and
authenticated product space is behaving intentionally.

### 6. The register flow is no longer crashing

Observed during this audit:

- `/register` originally hit a real runtime failure:
  - `Maximum update depth exceeded`
- root cause was an invalid `useSyncExternalStore` snapshot in
  `packages/auth/components/register.tsx`
- after the fix, the register form rendered normally again and accepted real
  input

This is an important coherence win because the auth-entry surface is now at
least interactable instead of failing before sign-up.

### 7. Auth backend flow is partially proven with a real local user

Observed via the local DB + server logs:

- waitlist approval succeeded for `audit+workspace@example.com`
- sign-up request succeeded:
  - `POST /api/auth/sign-up/email 200`
- verification request succeeded:
  - `GET /api/auth/verify-email?... 302`
- database evidence confirms:
  - user row exists
  - `email_verified = true`
  - a session token was issued

This means the local product is no longer only “buildable”; a meaningful part
of the real auth lifecycle actually works end to end.

## Current weak spots

### 1. Authenticated workspace experience is still not fully audited

Even after the local auth work above, this audit does **not** yet prove:

- workspace overview coherence after login
- dashboard/sidebar/command-palette interplay in-session
- files/chat/flashcards/tasks continuity as a lived workflow

What is currently true:

- auth backend state exists
- a verified local user exists
- a session token exists in the database

What is still missing:

- a direct browser-level proof that the authenticated user lands inside the
  workspace and can move through the main signed-in surfaces coherently

This remains a real gap against the overall objective.

### 2. Voice mismatch still exists in places

The login page uses:

- `A quieter internet`
- `Built for people who prefer focus over noise.`

That tone is not wrong, but it is slightly more editorial and ambient than the
more concrete study/research language on `/` and `/pricing`.

This is not a blocker by itself, but it is one of the clearer remaining
copy-level seams.

### 3. Product proof is still stronger on entry than in-flow

Right now the strongest evidence is:

- the product can explain itself
- pricing is aligned
- login boundary is sane

The weaker evidence is:

- deep authenticated workflows under real usage
- a stable browser-level proof of the signed-in workspace loop

So the repo feels much more coherent at the public/product edge than it is yet
proven to be inside the core signed-in work loop.

## Conclusion

Public and auth-entry coherence are materially healthier than before:

- same public navigation
- aligned pricing language
- clear product identity
- sane workspace redirect behavior

But the broader objective is still **not achieved** because the authenticated
workspace flow has not yet been audited end to end under a browser-proven real
session, and that is exactly where the product’s main promise actually lives.

## Recommended next move

Audit the signed-in workspace flow under a real session next:

1. enter workspace
2. inspect sidebar + command palette + files/chat/tasks continuity
3. inspect one real content workflow
4. record concrete UX findings, not just green route availability
