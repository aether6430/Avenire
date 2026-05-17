# Completion Audit Current

Tags: audit, structure, verification, product, docs

## Objective restated

The recovered [instruction.md](/Users/johnmacartew/Developer.nosync/aveniri/instruction.md:1)
describes a broad product-foundation recovery, not a single feature:

1. Raise and keep a measurable reliability floor.
2. Improve product coherence across public and authenticated surfaces.
3. Improve repository organization and documentation.
4. Reduce structural change-friction in the modules that actively block work.
5. Tighten UI consistency without pretending a full redesign happened.
6. Keep verifying until the obvious integrity problems stop surfacing.

The instruction also contains two explicit quantitative requirements that are
now directly measurable in the active repo:

1. Reach at least `10%` test coverage.
2. Keep test LOC at or below `25%` of total source LOC.

This audit now uses the actual recovered instruction text instead of a
surrogate.

## Current evidence

### 1. Reliability floor

Current hard evidence:

- Root production build passes when the required build-time envs are present:
  - `DATABASE_URL=postgres://localhost:5433/avenire`
  - `BETTER_AUTH_URL=http://localhost:3000`
  - `BETTER_AUTH_SECRET=0123456789abcdef0123456789abcdef`
  - `RESEND_API_KEY=re_dummy_123456789012345678901234`
- Verified command:
  - `NODE_ENV=production pnpm build`
- Latest observed result:
  - `EXIT:0`
  - `Tasks: 13 successful, 13 total`
- Package-local web gate also passes under the same env surface:
  - `pnpm --filter @avenire/web build`
  - `pnpm --filter @avenire/web check-types --pretty false`
- The explicit instruction-level repo test budget now has a direct receipt:
  - `pnpm test:budget`
  - repo source LOC: `177654`
  - repo test LOC: `31249`
  - repo ratio: `17.59%`
  - result: `Test budget satisfied`
- The explicit instruction-level repo coverage floor now has a direct receipt:
  - `pnpm test:coverage:repo`
  - repo lower-bound coverage: `11.03%`
  - result: `Coverage floor satisfied`
- The coverage gate is conservative by construction:
  - it uses real V8 line coverage where available
  - it counts every remaining uncovered package as `0%` in the lower bound

Assessment:

- This category is currently strong.
- The quantitative testing requirements from the instruction are currently
  satisfied.
- The repo is no longer blocked by iCloud placeholder files in the active
  working copy.

### 2. Structural code health

Current measured app-level hotspots:

- `apps/web/src/components/files/explorer.tsx` — `686` lines
- `apps/web/src/components/dashboard/sidebar-files-panel.tsx` — `55` lines
- `apps/web/src/components/chat/multimodal-input.tsx` — `60` lines
- `apps/web/src/components/settings/data-imports-section.tsx` — `14` lines
- `apps/web/src/components/dashboard/command-palette.tsx` — `20` lines
- `apps/web/src/components/dashboard/app-sidebar.tsx` — `88` lines
- `apps/web/src/components/student-calendar.tsx` — `10` lines

Recent verified reductions already landed and were pushed:

- `d975961` — `Reduce sidebar files panel to thin wrapper`
- `10b966e` — `Use explorer search surface hook`
- `06dcda1` — `Use workspace explorer data hook`
- `9d76bc8` — `Use explorer shell hook`
- `d3249c0` — `Use explorer derived state hook`
- `d0dc5d8` — `Remove dead explorer inline code`
- `4951e61` — `Reduce multimodal input to thin wrapper`
- `6b8607d` — `Reduce data imports section to thin wrapper`
- `a444f94` — `Reduce command palette to thin wrapper`
- `6ebd782` — `Reduce dashboard app-sidebar to thin wrapper`
- `d631e9e` — `Reduce student calendar to thin wrapper`

Assessment:

- This category improved dramatically.
- The remaining clearly dominant hotspot is still `explorer.tsx`.
- The rest of the previously obvious top-level shells have mostly been reduced
  to wrappers over existing boundaries.

### 3. Organization and documentation

Current evidence in the no-sync repo:

- `instruction.md`
- `README.md`
- `docs/README.md`
- `docs/environment.md`
- `docs/migrations.md`
- `docs/local-workspace-integrity.md`
- `docs/product-coherence-audit-current.md`
- `docs/visual-interaction-audit-current.md`
- `docs/workspace-surface-map.md`
- `logs/2026-05-17-instruction-recovery-and-coverage-audit.md`
- `logs/2026-05-17-rich-state-multisurface-soak.md`

Assessment:

- Documentation and operator guidance are materially better than earlier.
- The active repo now contains the actual instruction text and a live `logs/`
  path that follows the instruction's logging protocol.
- However, older historical receipts still live in the original Desktop repo's
  `logs/` directory, so the evidence trail is still partly split across two
  locations.

### 4. Product coherence

Current evidence:

- Public and authenticated surfaces now build together in production.
- Large shell components were reduced without reopening type/build failures.
- `docs/product-coherence-audit-current.md` now exists in the active no-sync
  repo and captures current public/auth-entry findings.
- A local verified user exists for `audit+workspace@example.com`.
- A second fresh local user now exists for deterministic browser audit work:
  - `audit.browser@example.com`
- Signed-in workspace evidence now includes:
  - `/workspace` returned `200`
  - `/api/workspace/bootstrap` returned user + workspace payload
  - `/api/workspace/overview` returned a valid empty-state overview payload
  - `/api/workspaces/list` returned the created workspace
- Browser-level signed-in shell evidence now exists through the local session
  proxy:
  - `bun scripts/local-auth-session-proxy.ts --cookie-file output/auth-login-cookies.txt --upstream http://127.0.0.1:3000 --port 4010`
  - `chrome-headless-shell` and full Chrome both rendered the signed-in
    workspace shell at `http://localhost:4010/workspace`
  - the left sidebar and workspace quick actions rendered consistently
  - the main pane still remained on `Loading workspace...` even after a
    `20s` virtual-time budget
- A direct production browser session now proves more of the signed-in path:
  - signed-in `http://127.0.0.1:3005/workspace` now reaches a real home ready
    state
  - the browser loaded:
    - `/api/workspace/bootstrap`
    - `/api/user-settings`
    - `/api/workspace/overview`
    - `/api/tasks?...`
    - `/api/activity?...`
  - browser snapshot now proves the home screen headline, tasks panel, recent
    concepts panel, and student calendar
  - signed-in files route now also has direct production proof:
    - authenticated HTTP GET returns `200`
    - the production browser renders the files surface itself instead of only a
      loading placeholder
    - the latest detached production pass now also keeps the desktop sidebar on
      `Workspace Home` while the main pane renders the files surface
    - a direct authenticated production server-render loop now survives `20`
      consecutive files route GETs while `/login` stays healthy afterward
    - a fresh detached production files render now avoids auto-starting the
      broader files realtime streams when no uploads are active
    - after the latest deferred-runtime trim, the detached files render also
      avoids auto-starting the general workspace realtime stream on first paint
    - after the latest share-dialog trim, the detached files render no longer
      fires repeated background `/share/suggestions` requests on first paint
    - the shell now also skips mounting `WorkspaceRealtimeBridge` on files
      routes, which keeps the broad workspace SSE path out of the initial files
      render
    - the latest explorer-data trim lets the detached files render paint from
      the workspace tree snapshot first, without waiting for the folder-detail
      API to finish
    - under the latest detached proof on `:3016`, the production server still
      answered `/login` with `200` immediately, after `10s`, and after `30s`
      following the signed-in files browser pass
    - under the latest detached browser soak on `:3017`, five full headless
      Chrome visits to the signed-in files route all succeeded, and `/login`
      still returned `200` after each visit and after `30s`
  - signed-in tasks route now also has direct production browser proof:
    - `/workspace/tasks` renders a real tasks surface
    - the detached production server still answered `/login` immediately and
      after `20s` following the tasks browser pass
  - signed-in chat and flashcards routes now also have direct production
    browser proof:
    - `/workspace/chats/new` renders a real new-method surface
    - `/workspace/flashcards` renders a real mindset/flashcards surface
    - after visiting both routes in the same detached session, the production
      server still answered `/login` immediately and after `20s`
  - richer persisted-state production proof now exists too:
    - `POST /api/chats` created a real persisted method
    - `POST /api/flashcards/sets` created a real persisted mindset set
    - the persisted routes `/workspace/chats/<slug>` and
      `/workspace/flashcards/<setId>` both rendered in production
    - a detached mixed-route session across home, files, tasks, chat detail,
      and flashcard-set detail survived `15` route navigations and still left
      `/login` healthy immediately and after `30s`
  - remaining gap has shifted deeper:
    - production server responsiveness is healthier across short repeated files
      visits, short multi-surface passes, and richer persisted-state loops, but
      longer-lived signed-in sessions are still not fully proven trustworthy
- The auth-entry flow itself improved materially:
  - `/register` no longer crashes with `Maximum update depth exceeded`
  - sign-up returned `200`
  - verify-email returned `302`
  - a session token was issued in the database

Missing proof:

- There is now meaningful browser-level signed-in proof, but not a fully
  healthy in-session loop:
  - the shell renders
  - the authenticated route is reachable in both dev-proxy and direct
    production-browser sessions
  - the home pane now reaches a ready state in production
  - the production signed-in path is still not fully trustworthy under
    longer-lived or richer in-session usage
  - detached production evidence now suggests the remaining reliability gap is
    deeper than the basic empty-state route family renders
- Passing builds prove integrity, but they do not by themselves prove that the
  product now feels coherent.

### 5. UI consistency

Current evidence:

- Recent structural cuts preserved green production builds.
- The previously huge authenticated shell surfaces were reduced to existing
  canonical boundaries rather than ad hoc inline logic.
- `docs/visual-interaction-audit-current.md` now records the current visual
  pass across public/authenticated entry points and the signed-in workspace
  shell.
- the shared workspace tabs no longer duplicate the selected tab label in
  current production browser snapshots (for example `Methods` instead of
  `Methods Methods`)

Missing proof:

- The signed-in shell now has visual proof across the main empty-state route
  families, but not yet across richer persisted in-session states.

## Strongest uncovered requirements

1. `explorer.tsx` is still the largest remaining app-level surface by a wide
   margin.
2. The signed-in workspace home, files, tasks, chat, and flashcards surfaces
   are now browser-proven, but deeper reliability is still weak:
   - detached production `/workspace` survives
   - a detached production files visit now survives a short post-session
     `/login` health check window
   - a short repeated signed-in files browser soak now survives as well
   - a short multi-surface signed-in browser pass now survives as well
   - a richer persisted-state multi-surface loop now survives as well
   - longer-lived signed-in sessions are still not fully proven safe
3. The evidence trail is healthier, but it is still split between the active
   no-sync repo and the old Desktop repo’s historical `logs/`.

## Recommended next moves

1. Continue structural reduction on `explorer.tsx` until it no longer dominates
   the app-level surface map.
2. Extend richer-state proof into deeper interactions like sending a method
   message, adding a flashcard, and completing a real task mutation.
3. Run a longer detached soak after those richer interactions so the remaining
   durability risk is narrowed beyond repeated navigation loops.
4. Consolidate or mirror the most useful older Desktop `logs/` receipts into
   the active repo so the evidence trail stops being split across two homes.
5. After that, perform a final end-state audit against the recovered
   `instruction.md` before considering the overall objective achieved.
