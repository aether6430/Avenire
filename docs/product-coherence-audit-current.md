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
- startup trims now in place for the signed-in shell:
  - home-screen startup no longer auto-warms every workspace surface
  - deferred shell/runtime extras no longer auto-enable from idle timers alone

Detached production files pass:

- production build and server:
  - `http://127.0.0.1:3016`
- authenticated proxy:
  - `bun scripts/local-auth-session-proxy.ts --cookie-file output/auth-login-cookies-prod.txt --upstream http://127.0.0.1:3016 --port 4016`
- Playwright browser snapshot for:
  - `http://127.0.0.1:4016/workspace/files/<workspaceUuid>/folder/<rootFolderId>`
- detached server health checks after the browser pass:
  - `curl -m 10 http://127.0.0.1:3016/login`
  - repeated immediately, after `10s`, and after `30s`

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
  - `GET /api/workspace/overview => 200`
  - `GET /api/tasks?includeCompleted=true => 200`
  - `GET /api/tasks?includeCompleted=false&limit=8 => 200`
  - `GET /api/activity?limit=6 => 200`
- the production browser snapshot showed a real ready-state home surface:
  - greeting headline
  - task panel
  - recent concepts panel
  - student calendar
- console output in that production home session contained no errors or
  warnings

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

What the current production browser pass surfaced:

- the default signed-in URL now stays on `/workspace`
- the home pane now reaches a visible ready state under a fresh production
  browser session
- the home view now issues the expected browser requests for:
  - bootstrap
  - overview
  - tasks
  - activity

That is a material improvement over the earlier shell-only proof.

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

### 3. Deeper signed-in continuity is still weaker than home

Observed after moving beyond the home surface:

- clicking `Open Files` now changes the real browser URL to:
  - `/workspace/files/<workspaceUuid>/folder/<rootFolderId>`
- the production files route now has direct signed-in proof:
  - authenticated HTTP GET to `/workspace/files/<workspaceUuid>/folder/<rootFolderId>`
    returned `200`
  - a real production browser session rendered the files surface at that exact
    route
- the files tree/sidebar surface now visibly loads and shows:
  - `Files`
  - `Search Files`
  - `New Note`
  - `Import Link`
  - `Your Files`
  - `Welcome to Avenire.md`
- the main files pane now also renders real content in the production browser
  snapshot, including:
  - breadcrumb `Workspace`
  - `Workspace actions`
  - sort control
  - card/list toggle
  - visible file row for `Welcome to Avenire.md`

This is materially stronger than the earlier shell-only or spinner-only files
proof. The files route is no longer “unreachable” in production.

The latest detached production pass also proves a cleaner desktop split between
navigation shell and files work surface:

- on the signed-in files route, the left desktop sidebar now remains on:
  - `Workspace Home`
  - `New Method`
  - `Open Mindset Sets`
  - `Open Files`
  - `Open Tasks`
- while the main pane renders the real files surface with:
  - breadcrumb `Workspace`
  - `Workspace actions`
  - sort and view controls
  - visible file row for `Welcome to Avenire.md`

That is a meaningful coherence improvement because the desktop files route no
longer mounts a second heavyweight files surface in the sidebar just from
opening the main files view.

Recent files-route runtime tightening also changed the initial network shape:

- on a fresh detached production files render, the browser now loads:
  - `/api/workspaces/<workspaceUuid>/tree`
  - `/api/workspaces/<workspaceUuid>/folders/<folderUuid>`
  - `/api/workspaces/<workspaceUuid>/property-registry`
- but it does **not** immediately open the broader files realtime streams when
  there are no active uploads
- after removing `focusin` as a deferred-runtime trigger, the fresh detached
  files render is quieter still:
  - no general `/api/realtime/events?workspaceUuid=...` request
  - no upload-activity panel body appears in the first settled browser snapshot
- after gating share-dialog suggestions on actual dialog open, the fresh
  detached files render also stops firing repeated background requests to:
  - `/api/workspaces/<workspaceUuid>/share/suggestions`
- after skipping the general `WorkspaceRealtimeBridge` on files routes, the
  fresh detached files render no longer mounts the broad workspace realtime SSE
  stream on first paint
- after relying on the tree-derived snapshot for the initial files view, the
  fresh detached files render can paint the visible file surface without
  waiting for the separate `/api/workspaces/<workspaceUuid>/folders/<folderUuid>`
  roundtrip to complete

That means the first files render is now doing less background live-work than
it did before.

### 4. Signed-in production responsiveness is still not fully trustworthy

Observed during the same broader signed-in production work:

- a production `next start` process previously died with Node heap OOM under a
  signed-in workspace browser session
- after the auth runtime fix and files-route simplification, the files page now
  reaches a real production browser render
- however, after signed-in files activity the server can still become partially
  unhealthy:
  - it may keep listening on port `3005`
  - but fresh requests such as `/login` can still time out
- detached-production evidence is now sharper:
  - a detached production server on `:3009` survives a signed-in browser visit
    to `/workspace` and still answers `/login`
  - a detached production server on `:3007` or `:3008` can die immediately on
    the signed-in files route before the route reaches a stable browser render
  - a detached production server on `:3006` can render the files route, but the
    broader signed-in files session still remains a durability risk
  - the latest detached production server on `:3016` now survives a signed-in
    files browser pass and still answers `/login`:
    - immediately
    - after `10s`
    - after `30s`

This is still a real reliability problem, even though the startup path is now
better than before.

### 5. Voice mismatch still exists in places

The login page uses:

- `A quieter internet`
- `Built for people who prefer focus over noise.`

That tone is not wrong, but it is slightly more editorial and ambient than the
more concrete study/research language on `/` and `/pricing`.

This is not a blocker by itself, but it is one of the clearer remaining
copy-level seams.

### 6. Product proof is still stronger on entry than in-flow

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

- the signed-in workspace route and home surface now reach a real ready state
  in a production browser session
- the files route now also reaches a real production browser render instead of
  only a loading placeholder
- and the production signed-in path is healthier after a single detached files
  pass, but still not trustworthy enough under sustained or repeated use
  because server responsiveness can degrade

## Recommended next move

Debug the next signed-in continuity seam next:

1. isolate why the production server can become partially unresponsive after
   repeated or longer-lived signed-in files activity, even now that the files
   surface renders and a short detached pass survives
2. confirm whether the remaining degradation is tied to longer-lived
   files/realtime runtime paths rather than the initial route render itself
3. only then continue the deeper chat/tasks/flashcards continuity audit
