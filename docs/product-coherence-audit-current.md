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
- signed-in workspace shell behavior under a real local session proxy

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

Signed-in browser proxy:

- fresh waitlist-approved local user:
  - `audit.browser@example.com`
- cookie jar created through:
  - `POST /api/auth/sign-up/email`
  - `GET /api/auth/verify-email?...`
- authenticated proxy:
  - `bun scripts/local-auth-session-proxy.ts --cookie-file output/auth-login-cookies.txt --upstream http://127.0.0.1:3000 --port 4010`
- browser render captures:
  - `chrome-headless-shell --screenshot ... http://localhost:4010/workspace`
  - `Google Chrome --headless --screenshot ... http://localhost:4010/workspace`

Direct production browser session:

- production build:
  - `DATABASE_URL=postgres://johnmacartew@localhost:5433/avenire NEXT_PUBLIC_APP_URL=http://localhost:3005 BETTER_AUTH_URL=http://localhost:3005 BETTER_AUTH_SECRET=0123456789abcdef0123456789abcdef RESEND_API_KEY=re_dummy_123456789012345678901234 NODE_ENV=production pnpm --filter @avenire/web build`
- production server:
  - `PORT=3005 ... NODE_ENV=production pnpm --filter @avenire/web start`
- production local sign-in:
  - `POST http://127.0.0.1:3005/api/auth/sign-in/email`
- Playwright browser session with direct cookie injection for:
  - `http://127.0.0.1:3005/workspace`

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

### 8. The signed-in workspace shell now has real browser-level evidence

Observed via the authenticated local proxy at `http://localhost:4010`:

- the signed-in `/workspace` shell renders in a real browser engine
- visible shell elements include:
  - `Workspace`
  - `Workspace Home`
  - `New Method`
  - `Open Mindset Sets`
  - `Open Files`
  - `Open Tasks`
- the sidebar action rail and footer controls render coherently inside the
  authenticated shell

This is stronger than the earlier route/bootstrap-only proof because it confirms
that the signed-in workspace chrome is not just returning HTML; it is rendering
as a real browser surface.

### 9. A direct production browser session now proves more of the signed-in path

Observed in a real Playwright-driven production session against
`http://127.0.0.1:3005/workspace`:

- the session stayed on the signed-in workspace URL instead of redirecting to
  `/login`
- production browser requests included:
  - `GET /api/workspace/bootstrap => 200`
  - `GET /api/user-settings => 200`
  - `GET /api/workspaces/invitations => 200`
  - `GET /api/workspaces/list => 200`
  - route prefetches for:
    - `/workspace/files`
    - `/workspace/flashcards`
    - `/workspace/chats/new`
    - `/workspace/files/<workspace>/folder/<rootFolder>`
- console output in the production browser session contained no errors or
  warnings before the later crash

This is the cleanest signed-in browser evidence collected so far because it
does not depend on dev-mode HMR behavior.

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
- authenticated workspace endpoints now respond for that user:
  - `/workspace` returned `200`
  - `/api/workspace/bootstrap` returned user + workspace payload
  - `/api/workspace/overview` returned an empty-but-valid overview payload
  - `/api/workspaces/list` returned the created workspace

What is still missing:

- a stable browser-level proof that the authenticated user can move through the
  main signed-in surfaces coherently, not only receive authenticated HTML/JSON
- a ready-state browser capture of the default workspace main pane

What the new browser pass surfaced:

- both `chrome-headless-shell` and full Chrome rendered the authenticated shell
- even after a `20s` virtual-time budget, the main pane still displayed:
  - `Loading workspace...`
- dev logs did not show matching browser-driven `/api/workspace/bootstrap` or
  `/api/workspace/overview` fetches during that deterministic headless pass

So the gap is no longer vague. The signed-in shell is proven, but the default
main work surface is still weakly proven and may have a real hydration or pane
initialization seam.

What the production browser pass surfaced:

- the default signed-in URL stayed on `/workspace`
- the browser successfully loaded bootstrap and workspace-adjacent APIs
- the main pane still remained on:
  - `Loading workspace...`
- no production browser request to `/api/workspace/overview` was observed in
  that session

That makes the remaining gap more specific: the signed-in shell can initialize,
but the default workspace-home pane still does not transition into its ready
state under a clean production browser session.

### 2. Local proxy host mismatch can obscure dev-mode browser proof

Observed during the authenticated proxy pass:

- using `http://127.0.0.1:4010/workspace` caused Next.js to block
  `/_next/webpack-hmr` because `127.0.0.1` was not in `allowedDevOrigins`
- switching the same proxy to `http://localhost:4010/workspace` removed that
  specific cross-origin dev warning
- the workspace main pane still remained on `Loading workspace...`

This matters because it rules out one false explanation: the lingering loading
state is not only a `127.0.0.1` dev-origin quirk.
This remains a real gap against the overall objective.

### 3. The production signed-in browser path can crash `next start`

Observed during the direct production browser session:

- after the signed-in `/workspace` session began prefetching workspace routes
  and chunks, the `next start` process died with:
  - `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`
- the crash came from the production `@avenire/web start` process itself, not
  only from the browser tool
- once that happened, subsequent browser requests flipped to:
  - `ERR_CONNECTION_REFUSED`

This is a real reliability problem, not only an audit inconvenience.

### 4. Voice mismatch still exists in places

The login page uses:

- `A quieter internet`
- `Built for people who prefer focus over noise.`

That tone is not wrong, but it is slightly more editorial and ambient than the
more concrete study/research language on `/` and `/pricing`.

This is not a blocker by itself, but it is one of the clearer remaining
copy-level seams.

### 5. Product proof is still stronger on entry than in-flow

Right now the strongest evidence is:

- the product can explain itself
- pricing is aligned
- login boundary is sane

The weaker evidence is:

- deep authenticated workflows under real usage
- a stable browser-level proof of the signed-in workspace loop
- richer signed-in states beyond the freshly created empty workspace

So the repo feels much more coherent at the public/product edge than it is yet
proven to be inside the core signed-in work loop.

## Conclusion

Public and auth-entry coherence are materially healthier than before:

- same public navigation
- aligned pricing language
- clear product identity
- sane workspace redirect behavior

But the broader objective is still **not achieved** because the authenticated
workspace flow is now only partially proven:

- the signed-in workspace route and bootstrap endpoints work
- the signed-in workspace shell renders in a real browser engine
- the production browser path now proves bootstrap/list/settings/invitations
  traffic too
- but the main signed-in pane still remains on `Loading workspace...`, and the
  production signed-in path can even take `next start` down with OOM, so the
  broader interaction loop is still not proven end to end

## Recommended next move

Debug the signed-in workspace main-pane loading seam next:

1. trace why the default `/workspace` pane stays on `Loading workspace...`
2. trace why the production signed-in path never reaches
   `/api/workspace/overview`
3. isolate the production OOM trigger during signed-in workspace prefetch/load
4. only then continue the deeper sidebar/files/chat/tasks continuity audit
