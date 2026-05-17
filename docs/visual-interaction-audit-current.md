# Visual Interaction Audit Current

Tags: audit, visual, interaction, workspace, auth

## Scope

This is the current visual and interaction audit artifact for the active
no-sync repo.

It does not claim a full design review. It records the strongest current
browser-visible evidence for the surfaces that were actually inspected.

## Evidence used

Public/auth-entry evidence already recorded in
`docs/product-coherence-audit-current.md`:

- `/`
- `/pricing`
- `/login`
- unauthenticated `/workspace` redirect

Signed-in browser evidence from the current local auth pass:

- waitlist-approved local user: `audit.browser@example.com`
- authenticated cookie jar from local sign-up + verify-email
- session proxy:
  - `bun scripts/local-auth-session-proxy.ts --cookie-file output/auth-login-cookies.txt --upstream http://127.0.0.1:3000 --port 4010`
- browser render captures from:
  - `chrome-headless-shell`
  - full Chrome headless
- signed-in route inspected:
  - `http://localhost:4010/workspace`

Direct production browser evidence:

- local production server at:
  - `http://127.0.0.1:3005`
- Playwright-driven signed-in route:
  - `http://127.0.0.1:3005/workspace`
- direct production sign-in cookie established through:
  - `POST /api/auth/sign-in/email`

## Observed strengths

### 1. Public-facing surfaces still read like one product

From the existing product audit:

- marketing navigation is consistent across home and pricing
- pricing language matches the same study/research product identity
- login remains visually calm and structurally compact

That matters because the product edge still feels intentionally designed rather
than stitched together from unrelated screens.

### 2. The signed-in workspace shell has a coherent visual frame

Observed in both authenticated browser captures:

- left sidebar chrome rendered consistently
- top-left workspace title and collapse control were visible
- the section rail under the title rendered as a single grouped control
- `Workspace Home`, `New Method`, `Open Mindset Sets`, `Open Files`, and
  `Open Tasks` appeared in one navigation cluster
- footer utilities remained visually aligned with the rest of the sidebar

The shell reads as one integrated workspace surface rather than a stack of
independent widgets.

### 3. The shell styling is restrained and consistent

Observed in the signed-in shell capture:

- neutral background
- quiet borders
- compact iconography
- spacing rhythm consistent between header, tab rail, navigation items, and
  footer tools

This supports the “quiet work surface” direction without feeling like a
marketing page leaked into the product.

## Current weak spot

### 1. The signed-in home surface now reaches a real ready state

Observed in the current direct production browser session:

- the main workspace home pane now renders a real ready state rather than a
  perpetual loading placeholder
- visible home content includes:
  - greeting headline
  - quick-create action row
  - today's tasks panel
  - recent concepts panel
  - student calendar

That is a meaningful visual improvement over the earlier shell-only proof.

### 2. The files route now has a real rendered surface

Observed after clicking `Open Files` in the same production browser session:

- the route updates to the real files URL
- the files sidebar/tree visibly loads
- the main files pane now also renders visible content, including:
  - breadcrumb `Workspace`
  - `Workspace actions`
  - sort and view controls
  - visible file content row for `Welcome to Avenire.md`

So the files route is no longer only a sidebar-shell or spinner proof.

The latest detached production files pass also shows a cleaner desktop layout
split:

- the left sidebar remains on `Workspace Home` and its quick actions
- the main pane carries the files work surface

So the files view no longer duplicates a heavyweight files surface in both the
desktop sidebar and the main pane on first arrival.

The latest detached soak also shows that this first files render is no longer a
fragile one-off:

- `5` headless Chrome visits to the signed-in files route all completed
- the detached production server still answered `/login` after each visit and
  after a further `30s`

That materially strengthens the visual proof because the rendered files surface
is now surviving short repeated browser use, not just one lucky paint.

### 3. The remaining visual risk is now tied to longer-lived stability

Even after the files route renders, the broader production session can still
degrade later, so the weakest point is no longer first paint. It is sustained
signed-in stability.

The latest detached-server evidence also suggests that this instability is not
uniform across signed-in routes:

- signed-in `/workspace` can render and leave the detached production server
  healthy
- signed-in files routes are much more likely to be the trigger for later
  instability
- the initial detached production files render is now quieter on background
  live-runtime work, even though the deeper durability issue still remains
- the latest detached files snapshot also no longer shows the upload-activity
  panel body on first paint
- the latest detached files render also avoids background share-suggestion
  traffic before any share dialog is opened
- the files route now also avoids mounting the broader workspace realtime
  bridge on first paint
- the first visible files surface can now appear before the folder-detail API
  finishes
- the latest detached production server on `:3016` stayed healthy enough to
  answer `/login` immediately, after `10s`, and after `30s` following a
  signed-in files browser pass
- the latest detached production server on `:3017` stayed healthy enough to
  answer `/login` after `20` authenticated files-route GETs, `5` headless
  Chrome files-route visits, and a tasks-route browser pass
- the latest detached production server on `:3021` stayed healthy enough to
  answer `/login` after persisted chat/set renders and a `15`-navigation
  richer mixed-route loop
- the latest detached production server on `:3022` stayed healthy enough to
  answer `/login` after task creation/update, flashcard create/review, and a
  `10`-navigation post-mutation mixed-route loop

### 4. The tasks route now has direct visual proof too

Observed on `http://127.0.0.1:4017/workspace/tasks`:

- left sidebar rendered the signed-in workspace frame coherently
- the tasks sidebar section showed:
  - `Tasks`
  - `Search Tasks`
  - `New Task`
  - `Due Tasks`
  - `Upcoming Tasks`
- the main pane showed:
  - heading `Tasks`
  - descriptive subcopy
  - list/kanban toggle
  - search input
  - filter controls
  - empty-state copy for the current workspace

So signed-in visual proof is no longer limited to home and files; the dedicated
tasks route now has a real rendered surface too.

### 5. Chat and flashcards now have direct visual proof too

Observed on `http://127.0.0.1:4018/workspace/chats/new`:

- left sidebar rendered the signed-in workspace frame coherently
- the selected `Methods` tab and sidebar methods section were visible
- the main pane showed:
  - heading `New Method`
  - personalized subcopy
  - prompt textbox `What do you want to know?`
  - voice-input control
  - send control

Observed on `http://127.0.0.1:4018/workspace/flashcards`:

- left sidebar rendered the signed-in workspace frame coherently
- the selected `Mindset Sets` tab and sidebar mindset tools were visible
- the main pane showed:
  - heading `Mindset`
  - `New Set`
  - `Go to deck`
  - decks empty-state copy

So signed-in visual proof now spans home, files, tasks, chat/new-method, and
flashcards in their real product routes.

### 6. Richer persisted chat and flashcard surfaces now render cleanly

Observed on:

- `http://127.0.0.1:4021/workspace/chats/ca4a56e3-6482-47f6-822f-56f4d66d69ad`
- `http://127.0.0.1:4021/workspace/flashcards/654bbf5c-4d98-4a26-acbf-55bc9482bd3f`

The persisted method surface showed:

- the method title in the sidebar list
- the same title in the breadcrumb
- the same title in the main-pane heading
- composer controls and share action

The persisted flashcard-set surface showed:

- the set title in the sidebar list
- the set title in the main-pane heading
- description and study stats
- the full action row:
  - `Edit mindset`
  - `Pause`
  - `Add Card`
  - `Delete set`
- card-bank scaffolding

So the signed-in visual proof now includes not just empty-state routes, but
real persisted entities in chat and flashcards.

### 7. Real task and flashcard interactions now show visible results

Observed on:

- `http://127.0.0.1:4022/workspace/tasks`
- `http://127.0.0.1:4022/workspace/flashcards/654bbf5c-4d98-4a26-acbf-55bc9482bd3f`

The tasks surface showed a real non-empty state:

- group heading `Drafting`
- task title `Rich Soak Task 2026-05-17`
- task description
- visible metadata chips for date and priority

The flashcard-set surface showed a real non-empty study state:

- `1 cards`
- `1 studied today`
- `1 in progress`

So the signed-in visual proof now includes actual user-visible results from
task and flashcard interactions, not just empty-state or passive persisted
route surfaces.

### 8. Method provider failure now shows an explicit assistant-side state

Observed on:

- `http://127.0.0.1:4029/workspace/chats/ca4a56e3-6482-47f6-822f-56f4d66d69ad`

After a real persisted `/api/chat` provider failure, the method route now
shows:

- the user message
- assistant label `Apollo`
- explicit failure copy:
  - `The selected AI model isn't configured in this environment. Please configure the AI provider and retry.`
- action controls:
  - `Copy message`
  - `Branch method`
  - `Regenerate response`

So this important failure mode is now visible and legible in the chat surface
instead of looking like an abandoned message.

### 9. The current detached build still renders the richer signed-in route family

Observed through current headless browser DOM proof on:

- `http://127.0.0.1:4042/workspace`
- `http://127.0.0.1:4042/workspace/files/a14719c1-c1c2-4e41-852b-234b1656f1fd/folder/0de9c432-603a-4c2b-aac7-0264d4a8af56`
- `http://127.0.0.1:4042/workspace/tasks`
- `http://127.0.0.1:4042/workspace/chats/ca4a56e3-6482-47f6-822f-56f4d66d69ad`
- `http://127.0.0.1:4042/workspace/flashcards/654bbf5c-4d98-4a26-acbf-55bc9482bd3f`

The detached build still exposed the expected signed-in product surfaces:

- home/workspace shell
- files surface with visible file rows
- tasks surface
- persisted method detail
- persisted flashcard-set detail

So the richer signed-in route family is not just historically proven; it still
renders on the current detached production proof build.

### 10. The detached route-soak window is now stronger than the earlier short loops

Observed on the same detached production server:

- `6` authenticated cycles
- `30` total route GETs across:
  - `/workspace`
  - files detail
  - tasks
  - persisted chat detail
  - persisted flashcard-set detail
- `/login` still returned `200`:
  - immediately after the soak
  - after `30s`
  - after `120s`

This does not yet prove a truly long interactive browser session, but it is a
meaningful step beyond the earlier short detached loops.

### 9. Workspace tab labels no longer duplicate on the active tab

Observed on the rebuilt production routes for:

- `http://127.0.0.1:4020/workspace/chats/new`
- `http://127.0.0.1:4020/workspace/flashcards`

The selected workspace tab now appears once in the browser snapshot:

- `Methods`
- `Mindset Sets`

instead of the earlier duplicated accessible/snapshot labels:

- `Methods Methods`
- `Mindset Sets Mindset Sets`

This is a small but real polish win for the signed-in shell because the active
tab names are now cleaner in both accessibility-facing and automation-facing
representations.

## Conclusion

The visual story is materially better than it was when the large shell files
were still giant inline surfaces:

- public entry surfaces are aligned
- auth entry remains visually calm
- the signed-in workspace shell is now browser-visible and coherent
- the signed-in home surface now reaches a real ready state
- the signed-in files, tasks, chat/new-method, and flashcards routes all reach
  real rendered surfaces
- persisted chat detail and persisted flashcard-set detail also reach real
  rendered surfaces
- task creation/update and flashcard create/review now also produce visible
  non-empty signed-in states
- provider-failure method responses now also produce a visible signed-in
  recovery state

But the audit is still incomplete because the signed-in routes are not yet
proven stable under longer or repeated production sessions. The clearest
remaining gap is runtime durability, not initial visual composition.
