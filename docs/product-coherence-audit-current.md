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

Detached production soak pass:

- production build and server:
  - `http://127.0.0.1:3017`
- authenticated proxy:
  - `bun scripts/local-auth-session-proxy.ts --cookie-file output/auth-login-cookies-prod.txt --upstream http://127.0.0.1:3017 --port 4017`
- authenticated direct server-render loop:
  - `20` consecutive GETs to
    `/workspace/files/<workspaceUuid>/folder/<rootFolderId>`
- browser-level soak:
  - `5` headless Chrome visits to
    `http://127.0.0.1:4017/workspace/files/<workspaceUuid>/folder/<rootFolderId>`
- follow-up route audit:
  - `http://127.0.0.1:4017/workspace/tasks`
- detached server health checks after those passes:
  - `/login` immediately
  - `/login` after `20s`
  - `/login` after `30s`

Detached multi-surface production pass:

- production build and server:
  - `http://127.0.0.1:3018`
- authenticated proxy:
  - `bun scripts/local-auth-session-proxy.ts --cookie-file output/auth-login-cookies-prod.txt --upstream http://127.0.0.1:3018 --port 4018`
- browser routes inspected:
  - `http://127.0.0.1:4018/workspace/chats/new`
  - `http://127.0.0.1:4018/workspace/flashcards`
- detached server health checks after both passes:
  - `/login` immediately
  - `/login` after `20s`

Detached richer-state production pass:

- production build and server:
  - `http://127.0.0.1:3021`
- authenticated proxy:
  - `bun scripts/local-auth-session-proxy.ts --cookie-file output/auth-login-cookies-prod.txt --upstream http://127.0.0.1:3021 --port 4021`
- real persisted state created through production APIs:
  - `POST /api/chats` -> method slug `ca4a56e3-6482-47f6-822f-56f4d66d69ad`
  - `POST /api/flashcards/sets` -> set id `654bbf5c-4d98-4a26-acbf-55bc9482bd3f`
- richer signed-in routes inspected:
  - `http://127.0.0.1:4021/workspace/chats/ca4a56e3-6482-47f6-822f-56f4d66d69ad`
  - `http://127.0.0.1:4021/workspace/flashcards/654bbf5c-4d98-4a26-acbf-55bc9482bd3f`
- repeated mixed-route loop:
  - `3` cycles
  - `15` total navigations across home, files, tasks, chat detail, and
    flashcard-set detail
- detached server health checks after the loop:
  - `/login` immediately
  - `/login` after `30s`

Detached richer-interaction production pass:

- production build and server:
  - `http://127.0.0.1:3022`
- authenticated proxy:
  - `bun scripts/local-auth-session-proxy.ts --cookie-file output/auth-login-cookies-prod.txt --upstream http://127.0.0.1:3022 --port 4022`
- real interactive mutations created through production APIs:
  - `POST /api/tasks` -> task id `2c93b3fb-7788-4718-8f42-ba4e519c5249`
  - `PATCH /api/tasks/<taskId>` -> status `drafting`
  - `POST /api/flashcards/sets/<setId>/cards` -> card id `99f99ef5-0a16-4179-a7ec-8c36ba2bb5d6`
  - `POST /api/flashcards/review` -> reviewed that card with rating `good`
- non-empty UI routes inspected:
  - `http://127.0.0.1:4022/workspace/tasks`
  - `http://127.0.0.1:4022/workspace/flashcards/654bbf5c-4d98-4a26-acbf-55bc9482bd3f`
- repeated mixed-route loop after those mutations:
  - `2` cycles
  - `10` total navigations across home, files, tasks, chat detail, and
    flashcard-set detail
- detached server health checks after the loop:
  - `/login` immediately
  - `/login` after `30s`

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

The latest detached soak also strengthens the stability proof around that
surface:

- `20` consecutive authenticated server-render GETs to the files folder route
  all returned `200`
- after that loop, `/login` still returned `200`
- `5` full headless Chrome visits to the signed-in files route all succeeded
- after each browser visit, `/login` still returned `200`
- `/login` still returned `200` after a further `30s`

So the remaining durability seam is no longer “repeated short files visits kill
the server.” The weaker point has moved deeper than that.

### 4. The tasks route now has direct signed-in browser proof

Observed in the same detached production environment:

- the signed-in route `http://127.0.0.1:4017/workspace/tasks` rendered a real
  tasks surface
- visible content included:
  - `Tasks`
  - `Search Tasks`
  - `New Task`
  - `Due Tasks`
  - `Upcoming Tasks`
  - main-pane heading `Tasks`
  - list/kanban toggle
  - filter controls
  - empty-state copy for the current workspace
- after the tasks browser pass, `/login` still returned `200` immediately and
  after `20s`

That means the signed-in proof is no longer concentrated only on home and
files. Tasks now has direct browser evidence too.

### 5. Chat and flashcards now have direct signed-in browser proof

Observed in the next detached production environment:

- the signed-in route `http://127.0.0.1:4018/workspace/chats/new` rendered a
  real new-method surface
- visible content included:
  - selected `Methods` workspace tab
  - sidebar methods section with:
    - `Search Methods`
    - `New Method`
    - empty-state copy
  - main-pane heading `New Method`
  - prompt box `What do you want to know?`
  - voice-input and send controls
- the signed-in route `http://127.0.0.1:4018/workspace/flashcards` rendered a
  real mindset/flashcards surface
- visible content included:
  - selected `Mindset Sets` workspace tab
  - sidebar mindset section with:
    - `Review Due`
    - `Import From Method`
    - `Sets`
    - empty-state copy for no sets yet
  - main-pane heading `Mindset`
  - `New Set`
  - `Go to deck`
  - deck empty-state copy
- after visiting both routes in the same detached session, `/login` still
  returned `200` immediately and after `20s`

That means the signed-in proof now spans all the main empty-state workspace
route families that matter most to the current product shell:

- home
- files
- tasks
- chat/new method
- flashcards

### 6. Richer persisted chat and flashcard states now have direct browser proof

Observed in the richer detached production environment:

- the persisted method route rendered:
  - sidebar methods collection containing `Rich Soak Method 2026-05-17`
  - breadcrumb `Rich Soak Method 2026-05-17`
  - main-pane heading `Rich Soak Method 2026-05-17`
  - chat composer and share action
- the persisted flashcard-set route rendered:
  - sidebar set entry `Rich Soak Set 2026-05-17`
  - main-pane heading `Rich Soak Set 2026-05-17`
  - set description
  - `Edit mindset`
  - `Pause`
  - `Add Card`
  - `Delete set`
  - set profile / review stats / card bank surfaces

This matters because the proof is no longer limited to empty-state routes. Real
persisted chat and flashcard entities now render in production too.

### 7. Real task and flashcard interactions now have direct browser proof

Observed in the richer interaction environment:

- the tasks route rendered a real non-empty task list:
  - heading `Drafting`
  - visible task `Rich Soak Task 2026-05-17`
  - visible description `Task updated during richer production audit`
  - visible metadata `No date` and `Normal`
- the persisted flashcard-set route rendered a real non-empty study state:
  - `1 cards`
  - `1 studied today`
  - `1 in progress`
  - the existing set action row and card-bank surface remained healthy

This matters because the proof has now crossed from persisted entities into
actual interaction results that the user can see.

### 8. Method-message provider failure is now explicit and reload-safe

Observed in the detached production method round-trip:

- the persisted method request reached the real `/api/chat` streaming path
- the provider failed because the Fireworks API key was missing
- after this fix:
  - `GET /api/chats/<slug>` returned both the user message and an assistant
    failure message
  - reloading the method route showed:
    - the user message
    - assistant label `Apollo`
    - `The selected AI model isn't configured in this environment. Please configure the AI provider and retry.`
    - `Copy message`
    - `Branch method`
    - `Regenerate response`
  - the detached production server log no longer emitted:
    - `Failed to create resumable chat stream`
    during the missing-Redis local path

That is a meaningful product-coherence win because an important failure mode is
now explained in-product instead of silently collapsing into ambiguity.

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

### 9. Signed-in production responsiveness is still not fully trustworthy

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
  - the latest detached production server on `:3017` now survives:
    - `20` consecutive authenticated files-route GETs
    - `5` headless Chrome files-route visits
    - a signed-in tasks-route browser pass
    - and still answers `/login` after the passes
  - the latest detached production server on `:3018` now survives:
    - a signed-in chat/new-method browser pass
    - a signed-in flashcards browser pass
    - and still answers `/login` after both routes
  - the latest detached production server on `:3021` now survives:
    - persisted chat-detail and flashcard-set-detail route renders
    - a `15`-navigation richer mixed-route loop
    - and still answers `/login` immediately and after `30s`
  - the latest detached production server on `:3022` now survives:
    - task creation + task update
    - flashcard creation + flashcard review
    - non-empty tasks + flashcard-set route renders
    - a `10`-navigation post-mutation mixed-route loop
    - and still answers `/login` immediately and after `30s`
  - the latest detached production server on `:3029` now survives:
    - a real persisted `/api/chat` provider failure
    - a reload of the affected method route
    - and still answers `/login` after that failure path

This is still a real reliability problem, even though the startup path is now
better than before.

### 10. Auth entry voice now matches the public product language

The auth shell now uses:

- `A study-first workspace`
- `Built for deep study, research, and interactive reasoning.`

That brings `/login` and `/register` back into the same product language family
as `/` and `/pricing`, instead of leaving the auth boundary on a more ambient
or editorial note.

### 11. Product proof is still stronger on entry than in-flow

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
- the tasks route now also reaches a real production browser render
- the chat/new-method route now also reaches a real production browser render
- the flashcards route now also reaches a real production browser render
- persisted chat detail and persisted flashcard-set detail now also reach real
  production browser renders
- task creation/update and flashcard create/review now also have real visible
  production effects
- a real method-message provider failure now also has an explicit persisted
  recovery state
- and the production signed-in path is healthier across short repeated files
  visits, richer repeated route loops, and short broader multi-surface
  interactive use, but still not trustworthy enough under sustained or deeper
  interactive use because server responsiveness can degrade

## Recommended next move

Debug the next signed-in continuity seam next:

1. prove one successful method message round-trip under a configured model
   provider key, now that the failure path is explicit and reload-safe
2. isolate why the production server can become partially unresponsive only
   after longer-lived or more interactive signed-in usage, even now that
   richer repeated route loops and short post-mutation loops survive
3. confirm whether the remaining degradation is tied to message-generation,
   interactive files/realtime, or cross-route mutation paths rather than route
   rendering alone
