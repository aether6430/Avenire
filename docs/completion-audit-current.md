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

- `apps/web/src/components/marketing/how-it-works/skeletons.tsx` — `762` lines
- `apps/web/src/components/editor/editor-extensions.ts` — `762` lines
- `apps/web/src/components/marketing/icons/card-icons.tsx` — `756` lines
- `apps/web/src/components/ui/particle-field.tsx` — `597` lines
- `apps/web/src/components/marketing/icons/bento-icons.tsx` — `538` lines
- `apps/web/src/components/files/use-circle-to-ai-search-overlay.ts` — `540` lines
- `apps/web/src/components/marketing/icons/general.tsx` — `496` lines
- `apps/web/src/components/editor/properties-table.tsx` — `455` lines
- `apps/web/src/components/marketing/agentic-intelligence/static-skeletons.tsx` — `451` lines
- `apps/web/src/components/files/explorer/explorer-upload-batch.ts` — `446` lines
- `apps/web/src/components/chat/use-chat-runtime.ts` — `445` lines
- `apps/web/src/components/tasks/use-tasks-workspace.ts` — `429` lines
- `apps/web/src/components/files/explorer/use-explorer-file-action-operations.ts` — `422` lines
- `apps/web/src/components/files/explorer/use-explorer-pane-surfaces.ts` — `419` lines
- `apps/web/src/components/chat/use-chat-scroll.ts` — `409` lines
- `apps/web/src/components/settings/settings-workspace-selected-sections.tsx` — `403` lines
- `apps/web/src/components/chat/messages.tsx` — `14` lines
- `apps/web/src/components/chat/mermaid.tsx` — `403` lines
- `apps/web/src/components/files/explorer/use-file-preview-pane-header.tsx` — `199` lines

Recent verified reductions already landed and were pushed:

- `d975961` — `Reduce sidebar files panel to thin wrapper`
- `10b966e` — `Use explorer search surface hook`
- `06dcda1` — `Use workspace explorer data hook`
- `9d76bc8` — `Use explorer shell hook`
- `d3249c0` — `Use explorer derived state hook`
- `d0dc5d8` — `Remove dead explorer inline code`
- `share-dialog.tsx` — `842` -> `142`
- `onboarding-modal-steps.tsx` — `794` -> `5`
- `stylized-search-bar.tsx` — `812` -> `69`
- `rolling-tool-activity-surface.tsx` — `648` -> `6`
- `student-calendar-desktop-surface.tsx` — `588` -> `196`
- `markdown.tsx` — `624` -> `27`
- `markdown-renderers.tsx` — `479` -> `197`
- `rolling-reasoning.tsx` — `578` -> `20`
- `use-chat-runtime.ts` — `520` -> `447`
- `use-chat-runtime.ts` — `447` -> `445`
- `explorer-upload-batch.ts` — `492` -> `446`
- `file-preview-panel.tsx` — `466` -> `408`
- `file-preview-panel.tsx` — `408` -> `13`
- `use-circle-to-ai-search-overlay.ts` — `532` -> `540` with a new `circle-to-ai-search-overlay-model.ts` pure state owner
- `particle-field.tsx` — `619` -> `597`
- `preview-attachment-content.tsx` — `455` -> `8`
- `multimodal-input-surface.tsx` — `428` -> `46`
- `messages.tsx` — `403` -> `14`
- `mermaid.tsx` — `428` -> `403` with a new `mermaid-model.ts` pure policy owner
- `use-chat-scroll.ts` — `434` -> `409` with a new `chat-scroll-model.ts` pure policy owner
- `use-explorer-file-action-operations.ts` — `443` -> `422` with a new `explorer-file-action-operations-model.ts` policy owner
- `use-file-preview-pane-header.tsx` — `423` -> `199` with a new `file-preview-pane-header-content.tsx` UI owner
- `widget-renderer-model.ts` — `535` -> `17` with `widget-renderer-theme.ts` and `widget-renderer-iframe-document.ts` as explicit local owners
- `WidgetPrimitiveRenderer.tsx` — `457` -> `12` with `widget-primitive-render-content.tsx` and `widget-primitive-render-chart.tsx` as explicit local owners
- `command-palette-groups.tsx` — `444` -> `17`
- `dashboard-sidebar-content.tsx` — `449` -> `150`
- `explorer-browse-surface.tsx` — `417` -> `14`
- `chat.tsx` — `688` -> `44`
- `chat-workspace.tsx` — `458` -> `11`
- `student-calendar-desktop.tsx` — `705` -> `10`
- `flashcards/dashboard.tsx` — `702` -> `11`
- `flashcards/sidebar-panel.tsx` — `487` -> `11`
- `tasks-workspace.tsx` — `640` -> `13`
- `dashboard-home.tsx` — `814` -> `18`
- `4951e61` — `Reduce multimodal input to thin wrapper`
- `6b8607d` — `Reduce data imports section to thin wrapper`
- `a444f94` — `Reduce command palette to thin wrapper`
- `6ebd782` — `Reduce dashboard app-sidebar to thin wrapper`
- `d631e9e` — `Reduce student calendar to thin wrapper`

Assessment:

- This category improved dramatically.
- `explorer.tsx` is no longer the dominant shell it used to be.
- Remaining structural pressure is now concentrated in a smaller but more
  distributed set of files instead of one giant explorer bottleneck.
- The previously obvious top-level shells have mostly been reduced to wrappers
  over existing boundaries.

### 3. Organization and documentation

Current evidence in the no-sync repo:

- `instruction.md`
- `README.md`
- `docs/README.md`
- `docs/environment.md`
- `docs/desktop-log-index-current.md`
- `docs/instruction-evidence-matrix-current.md`
- `docs/migrations.md`
- `docs/local-workspace-integrity.md`
- `docs/product-coherence-audit-current.md`
- `docs/visual-interaction-audit-current.md`
- `docs/workspace-surface-map.md`
- `logs/2026-05-17-instruction-recovery-and-coverage-audit.md`
- `logs/2026-05-17-rich-state-multisurface-soak.md`
- `logs/2026-05-17-rich-interaction-multisurface-soak.md`
- `logs/2026-05-17-chat-provider-config-proof.md`
- `logs/2026-05-17-instruction-evidence-matrix.md`
- `logs/2026-05-17-chat-failure-recovery-proof.md`
- `logs/2026-05-17-desktop-log-index.md`
- `logs/2026-05-17-explorer-dead-slice-removal.md`
- `logs/2026-05-17-share-dialog-thin-wrapper.md`
- `logs/2026-05-17-stylized-search-bar-thin-wrapper.md`
- `logs/2026-05-17-tasks-workspace-thin-wrapper.md`
- `logs/2026-05-17-flashcards-dashboard-thin-wrapper.md`
- `logs/2026-05-17-dashboard-home-thin-wrapper.md`
- `logs/2026-05-17-flashcards-sidebar-thin-wrapper.md`
- `logs/2026-05-17-chat-workspace-thin-wrapper.md`
- `logs/2026-05-17-student-calendar-desktop-thin-wrapper.md`
- `logs/2026-05-17-student-calendar-desktop-surface-split.md`
- `logs/2026-05-17-auth-entry-voice-alignment.md`
- `logs/2026-05-17-longer-detached-soak-and-session-summary-skip.md`
- `logs/2026-05-17-onboarding-modal-step-ownership-split.md`
- `logs/2026-05-17-rolling-reasoning-ownership-split.md`
- `logs/2026-05-17-rolling-tool-activity-ownership-split.md`
- `logs/2026-05-17-markdown-ownership-split.md`
- `logs/2026-05-17-markdown-renderer-dedupe.md`
- `logs/2026-05-17-file-preview-panel-model-extraction.md`
- `logs/2026-05-17-file-preview-panel-hook-surface-split.md`
- `logs/2026-05-17-explorer-upload-batch-model-extraction.md`
- `logs/2026-05-17-circle-to-ai-search-overlay-model-extraction.md`
- `logs/2026-05-17-particle-field-model-extraction.md`
- `logs/2026-05-17-preview-attachment-content-split.md`
- `logs/2026-05-17-command-palette-group-split.md`
- `logs/2026-05-17-dashboard-sidebar-content-split.md`
- `logs/2026-05-17-explorer-browse-surface-split.md`
- `logs/2026-05-17-use-chat-runtime-status-model-extraction.md`
- `logs/2026-05-17-use-chat-runtime-model-extraction.md`
- `logs/2026-05-17-chat-thin-wrapper.md`
- `logs/2026-05-17-multimodal-input-surface-split.md`
- `logs/2026-05-17-chat-scroll-model-extraction.md`
- `logs/2026-05-17-explorer-file-action-operations-model-extraction.md`
- `logs/2026-05-17-mermaid-model-extraction.md`
- `logs/2026-05-17-file-preview-pane-header-content-split.md`
- `logs/2026-05-17-widget-renderer-model-split.md`
- `logs/2026-05-17-messages-thin-wrapper.md`
- `logs/2026-05-17-widget-primitive-renderer-split.md`

Assessment:

- Documentation and operator guidance are materially better than earlier.
- The active repo now contains the actual instruction text and a live `logs/`
  path that follows the instruction's logging protocol.
- The active repo now also contains a direct instruction-to-evidence checklist:
  `docs/instruction-evidence-matrix-current.md`.
- The active repo now also contains a filename-level index of the old Desktop
  log cluster, which reduces the discovery gap even though the underlying
  historical files are still split and dataless.
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
  - richer interaction-state production proof now exists too:
    - `POST /api/tasks` created a real task
    - `PATCH /api/tasks/<taskId>` updated that real task
    - `POST /api/flashcards/sets/<setId>/cards` created a real flashcard
    - `POST /api/flashcards/review` reviewed that real flashcard
    - `/workspace/tasks` now has non-empty proof with a visible drafting task
    - `/workspace/flashcards/<setId>` now has non-empty proof with `1 cards`,
      `1 studied today`, and `1 in progress`
    - a post-mutation detached mixed-route session survived `10` route
      navigations and still left `/login` healthy immediately and after `30s`
  - the current detached production verification pass is now stronger too:
    - current headless browser DOM proof on `:4042` reconfirmed:
      - `/workspace`
      - `/workspace/files/<workspaceUuid>/folder/<rootFolderId>`
      - `/workspace/tasks`
      - `/workspace/chats/<slug>`
      - `/workspace/flashcards/<setId>`
    - a longer detached authenticated route soak on `:3042` survived:
      - `6` cycles
      - `30` authenticated route GETs across those five signed-in surfaces
      - max observed route response time `0.043948s`
    - `/login` stayed healthy:
      - immediately after the soak
      - after `30s`
      - after `120s`
    - a stronger detached authenticated route soak on `:3056` now survives:
      - `12` cycles
      - `60` authenticated route GETs across those same five signed-in surfaces
      - max observed route response time `0.044416s`
    - `/login` stayed healthy on that pass:
      - immediately after the soak
      - after `60s`
      - after `180s`
    - a stronger detached browser-level route loop on `:4056` now survives:
      - `8` cycles
      - `40` headless Chrome visits across those same five signed-in surfaces
    - `/login` stayed healthy after that browser loop too:
      - immediately
      - after `60s`
      - after `240s`
  - real method-message provider failure is now an explicit product state:
    - `POST /api/chat` reached the persisted method streaming boundary in
      production
    - the model provider failed because the provider key was unavailable
    - the route now persists an assistant error message instead of leaving only
      a dangling user message
    - reloading `/workspace/chats/<slug>` now shows the explicit failure text
      plus `Copy message`, `Branch method`, and `Regenerate response`
    - the message now explicitly says the selected AI model is not configured
      in this environment
    - the local missing-Redis path no longer emits the unrelated resumable chat
      stream failure during this flow
  - the missing-provider session-close summary path is now quieter too:
    - `POST /api/chat` with `kind: "session-close"` for the persisted method
      now returns `{"ok":true}`
    - the server no longer emits the earlier
      `Failed to persist session summary on session close` missing-key error on
      shutdown after that request
  - remaining gap has shifted deeper:
    - production server responsiveness is healthier across short repeated files
      visits, short multi-surface passes, richer persisted-state loops, short
      post-mutation loops, the `30`-request detached route soak, and the newer
      `60`-request detached route soak
    - but a successful provider-backed method round-trip and truly longer-lived
      interactive sessions are still not fully proven trustworthy
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
  - the current detached production route family now survives:
    - a `60`-request signed-in route soak
    - a `40`-visit signed-in browser loop
    - a `240s` `/login` health window
  - the production signed-in path is still not fully trustworthy under
    truly longer-lived or richer interactive in-session usage
  - detached production evidence now suggests the remaining reliability gap is
    deeper than the basic empty-state route family renders
- Passing builds prove integrity, but they do not by themselves prove that the
  product now feels coherent.

### 5. UI consistency

Current evidence:

- Recent structural cuts preserved green production builds.
- The previously huge authenticated shell surfaces were reduced to existing
  canonical boundaries rather than ad hoc inline logic.
- The auth shell copy now matches the same study/research language family used
  on `/` and `/pricing`, instead of a more ambient standalone slogan.
- `docs/visual-interaction-audit-current.md` now records the current visual
  pass across public/authenticated entry points and the signed-in workspace
  shell.
- the shared workspace tabs no longer duplicate the selected tab label in
  current production browser snapshots (for example `Methods` instead of
  `Methods Methods`)

Missing proof:

- The signed-in shell now has visual proof across the main empty-state route
  families and richer persisted interaction states, but not yet across longer
  interactive sessions.

## Strongest uncovered requirements

1. Structural pressure is no longer dominated by a single explorer shell:
   the largest remaining app-level surfaces now include
   `onboarding-modal-steps.tsx`, `rolling-tool-activity-surface.tsx`,
   `markdown.tsx`, `student-calendar-desktop-surface.tsx`,
   `rolling-reasoning.tsx`, and the remaining explorer cluster.
2. The signed-in workspace home, files, tasks, chat, and flashcards surfaces
   are now browser-proven, but deeper reliability is still weak:
   - detached production `/workspace` survives
   - a detached production files visit now survives a short post-session
     `/login` health check window
   - a short repeated signed-in files browser soak now survives as well
   - a short multi-surface signed-in browser pass now survives as well
   - a richer persisted-state multi-surface loop now survives as well
   - a short post-mutation multi-surface loop now survives as well
   - a real provider-failure method round-trip now fails explicitly instead of
     silently
   - a current `60`-request detached route soak now survives too
   - longer-lived interactive signed-in sessions are still not fully proven
     safe
3. The evidence trail is healthier, but it is still split between the active
   no-sync repo and the old Desktop repo’s historical `logs/`.

## Recommended next moves

1. Continue structural reduction on the current largest app-level hotspots:
   `onboarding-modal-steps.tsx`, `rolling-tool-activity-surface.tsx`,
   `markdown.tsx`, and the remaining explorer cluster.
2. Prove one successful method message round-trip under a configured model
   provider key, now that the failure path is explicit and reload-safe.
3. Run a longer detached soak after those richer interactions so the remaining
   durability risk is narrowed beyond short post-mutation loops.
4. Consolidate or mirror the most useful older Desktop `logs/` receipts into
   the active repo so the evidence trail stops being split across two homes.
5. After that, perform a final end-state audit against the recovered
   `instruction.md` before considering the overall objective achieved.
