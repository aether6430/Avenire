# Completion Audit Current

Tags: audit, structure, verification, product, docs

## Objective restated

The active thread goal points to an `instruction.md` that described a broad
product-foundation recovery, not a single feature:

1. Raise and keep a measurable reliability floor.
2. Improve product coherence across public and authenticated surfaces.
3. Improve repository organization and documentation.
4. Reduce structural change-friction in the modules that actively block work.
5. Tighten UI consistency without pretending a full redesign happened.
6. Keep verifying until the obvious integrity problems stop surfacing.

Because the original `instruction.md` is not present in this no-sync working
copy, this audit uses the previously recovered completion snapshot from the old
workspace as the concrete surrogate for the goal shape, then re-checks every
major category against the actual current repo state.

The original Desktop copy is still present only as a File Provider placeholder:

- `/Users/johnmacartew/Desktop/aveniri/instruction.md`
- current file flags: `compressed,dataless`

That means the active no-sync repo is the correct working copy, but the
completion audit still cannot quote the original instruction text verbatim from
the old workspace.

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

Assessment:

- This category is currently strong.
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

- `README.md`
- `docs/README.md`
- `docs/environment.md`
- `docs/migrations.md`
- `docs/local-workspace-integrity.md`
- `docs/product-coherence-audit-current.md`
- `docs/visual-interaction-audit-current.md`
- `docs/workspace-surface-map.md`

Assessment:

- Documentation and operator guidance are materially better than earlier.
- However, the old pass-level receipts still live only in the original Desktop
  repo’s `logs/` directory rather than this working copy, so the evidence trail
  is split across two locations.

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
  - remaining gap has shifted deeper:
    - production server responsiveness can still degrade after signed-in files
      activity
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
  - the production signed-in path is still not fully trustworthy under deeper
    navigation
  - detached production evidence now strongly suggests the remaining
    reliability gap is files-route-specific rather than a general signed-in
    workspace failure
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

Missing proof:

- The signed-in shell has a visual audit artifact now, but the core workspace
  pane still does not have a healthy ready-state capture to prove visual
  continuity inside the main work surface.

## Strongest uncovered requirements

1. `explorer.tsx` is still the largest remaining app-level surface by a wide
   margin.
2. The signed-in workspace home and files surfaces are now browser-proven, but
   deeper reliability is still weak:
   - detached production `/workspace` survives
   - detached production signed-in files activity can still kill the server
3. The original `instruction.md` remains absent from the active repo and
   trapped as a `compressed,dataless` placeholder in the old Desktop copy.
4. The evidence trail is healthier, but it is still split between the active
   no-sync repo and the old Desktop repo’s historical `logs/`.

## Recommended next moves

1. Continue structural reduction on `explorer.tsx` until it no longer dominates
   the app-level surface map.
2. Isolate the remaining production responsiveness failure after deeper
   signed-in navigation.
3. Recover or otherwise memorialize the original `instruction.md` text so the
   final completion audit no longer depends on a surrogate alone.
4. After that, perform a final end-state audit against the recovered goal
   surrogate before considering the overall objective achieved.
