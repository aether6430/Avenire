# UI Fixes

This is a working design and implementation map for tightening the workspace pages that do not currently feel as strong as chat, notes, and the PDF viewer. Nothing here is a request to remove the user's ability to customize their workspace. The goal is to make the rest of the app inherit the same compact, document-first chrome that already works in the editor and PDF viewer.

## North Star

The chat page and notes/PDF split view are the strongest surfaces because they feel like a real workspace:

- compact pane header
- visible document or conversation content immediately
- subdued dark chrome
- actions tucked into predictable header slots
- sidebar density that supports repeated use
- minimal dashboard-like framing

Other workspace pages should feel like supporting tools inside that same environment, not separate dashboards with their own layout language.

## 1. Keep Workspace Banners, But Treat Them As User Preference

The blue banner/cover strip should not be removed globally. It adds contrast, fills otherwise dead space, and is user-customizable. The issue is not the banner itself; the issue is when the rest of the page below it feels unrelated to the editor/PDF workspace language.

Likely source:

- `apps/web/src/components/files/explorer.tsx`
  - folder banner rendering lives near the file explorer main layout
  - banner controls include change/reset actions
- `apps/web/src/components/files/explorer/file-preview-panel.tsx`
  - file preview cover/add-cover behavior

Direction:

- keep banners for folders/files
- make banner height and placement consistent across file workspace pages
- avoid using the banner as a substitute for page structure
- make the content immediately below the banner feel like the editor/PDF surface
- keep context-menu banner customization

Open question:

- Should search results shown inside the file workspace also preserve the active folder banner, or should search become a temporary full-width result mode below the current header/search bar?

## 2. Normalize Headers And Actions Across Workspace Pages

This is the highest-confidence fix. The rest of the app should follow the same header style used by notes editor/PDF viewer: compact navigation group, title/breadcrumb in the center-left, and actions on the right.

Current shared surface:

- `apps/web/src/components/dashboard/workspace-header.tsx`
  - shared back/home/forward segmented controls
  - header title/breadcrumb/action portals
- `apps/web/src/components/dashboard/header-portal.tsx`
  - per-page injection points for leading icon, breadcrumbs, and actions
- `apps/web/src/components/dashboard/workspace-pane-renderer.tsx`
  - decides which route surface is rendered inside a pane

Pages to audit:

- `apps/web/src/components/tasks/tasks-workspace.tsx`
- `apps/web/src/components/flashcards/dashboard.tsx`
- `apps/web/src/components/flashcards/set-detail.tsx`
- `apps/web/src/components/files/explorer.tsx`
- `apps/web/src/components/files/explorer/file-preview-panel.tsx`

Direction:

- remove duplicated in-page title blocks when the pane header already says the same thing
- move primary actions into `HeaderActions`
- move route identity into `HeaderBreadcrumbs`
- use `HeaderLeadingIcon` consistently
- keep page bodies focused on the object being managed: tasks, cards, files, search results

Specific example:

- Tasks currently has a pane header that says `Tasks`, then an in-page `h1` that also says `Tasks` with descriptive copy. This is visually heavier than the editor/PDF pages and should be collapsed into the shared header model.

## 3. Replace Search Modal/Answer With Filtered File View Results

The current search answer panel is too fragile and often fails. The better product behavior is to remove the generated reply entirely and let search filter the existing file workspace.

Important correction: this should not become a separate search-results component or a separate modal-like view. Search should keep using the file view system. If the current folder/root contains `A, B, C, D, E, F` and the query matches content in `A, C, D`, the file grid/list should render only `A, C, D`.

Current source:

- `apps/web/src/components/files/stylized-search-bar.tsx`
  - currently owns the search input, vector search call, answer panel, result dropdown, result selection
- `apps/web/src/components/files/explorer.tsx`
  - owns `retrievalResults`, `activeRetrievalChunkId`, file filtering, grid/list rendering, and `openSearchResult`
- `apps/web/src/app/api/workspaces/[workspaceUuid]/search/route.ts`
  - likely backs workspace vector search

Problem:

- answer/summary area is unreliable
- results render in a floating dropdown/modal-like panel
- the search experience feels visually detached from the file workspace
- matching files lose the familiar file-view affordances

Direction:

- keep the compact search input
- remove the generated answer/summary area from search
- use search results to filter the existing file items down to matching files
- when search is active, switch matching file cards into a horizontal/rectangular layout
- keep the same file card/list selection behavior, context menus, opening behavior, and file actions
- show the file thumbnail/icon on the left and match information/content beside it
- show the actual matched line/content/transcript beside the file identity
- make PDF results, markdown results, and transcript matches use the same rectangular file-card pattern
- clicking a result should open the file/PDF/note and jump to the match when possible

Proposed active-search file card layout:

- left: normalized thumbnail/icon in a fixed-width document frame
- center: file name, path, page/time/chunk metadata
- main/right: matched content with highlighted query terms or transcript excerpt
- trailing: existing file actions, not a new search-only action system

Implementation notes:

- `StylizedSearchBar` should probably become input-only plus loading state.
- `explorer.tsx` should map `retrievalResults` back to existing file IDs and filter the already-rendered file collection.
- `FileCard` or a nearby file-view component needs a search-active rectangular variant.
- Do not create a separate `WorkspaceSearchResults` surface unless it is just a thin adapter around the same file card/list system.
- Preserve current `activeRetrievalChunkId` behavior so file preview highlighting keeps working.

## 4. Keep Tasks As A Dedicated User-Preference Surface

Tasks already has a dashboard area and a dedicated tasks page with list and Kanban views. That is acceptable because task organization is user-preference-heavy and older tasks need a special place.

Current source:

- `apps/web/src/components/tasks/tasks-workspace.tsx`
- `apps/web/src/components/tasks/task-list-pane.tsx`
- `apps/web/src/components/tasks/task-kanban-pane.tsx`
- `apps/web/src/components/tasks/task-filters.tsx`
- `apps/web/src/components/tasks/task-detail-pane.tsx`
- `apps/web/src/components/dashboard/sidebar-task-preview.tsx`
- `apps/web/src/components/dashboard/dashboard-home.tsx`

Direction:

- preserve list view
- preserve Kanban view
- preserve grouping/filtering
- normalize only the surrounding page chrome
- reduce duplicated page heading/copy if the header already gives context
- keep the dedicated page useful for older/completed/backlog tasks

Potential improvements:

- make filters visually match the compact workspace toolbar style
- make row density closer to files/chat sidebar density
- keep empty states consistent with the rest of the workspace
- make task detail editing feel like an inspector or sheet, not a separate visual world

## 5. Make Mindset Feel Like Study Notes/Cards, Not An Admin Dashboard

Mindset is useful, but the deck detail page currently feels closer to an admin dashboard than a study surface. It should feel like a note/card workspace.

Current source:

- `apps/web/src/components/flashcards/dashboard.tsx`
- `apps/web/src/components/flashcards/set-detail.tsx`
- `apps/web/src/components/flashcards/sidebar-panel.tsx`
- `apps/web/src/components/flashcards/workspace-flashcards-page-client.tsx`
- `apps/web/src/components/dashboard/dashboard-home.tsx`
  - currently contains the main misconceptions chrome

Current issues:

- deck metadata cards (`Deck profile`, `Study context`) feel dashboard-like
- uppercase labels and boxed summary areas create a separate visual language
- card bank is useful but reads like a table admin screen
- review modal has a large bright flashcard that feels disconnected from the rest of the dark workspace
- misconceptions only have real chrome on the dashboard, not inside the Mindset surface

Direction:

- keep Mindset as its own tool, but make it document/card-native
- make the deck title and primary review action live in the shared header/action pattern
- collapse deck stats into a compact status strip instead of large dashboard cards
- make the card bank the main object on deck pages
- use a rectangular card/list pattern similar to active file search results: identity/metadata on one side, content on the other
- make each study card feel like an editable study block, not only a database row
- bring misconceptions into Mindset as a first-class section/view, not only dashboard content
- keep table density available for power users, but consider a card/list toggle later

Suggested deck detail structure:

1. Header:
   - breadcrumb: `Mindset / Deck name`
   - actions: `Edit set`, `Pause`, `Add card`, overflow menu
   - primary action: `Start review`

2. Compact deck status:
   - `AI-generated`
   - `Study active`
   - `12 cards`
   - `10 due`
   - `0 killed`
   - `Last studied ...`

3. Main card bank:
   - search/filter row
   - dense list/table rows
   - front text as primary
   - answer as secondary
   - due/state/tags/actions kept compact

4. Optional right inspector:
   - only when a card/deck is selected
   - show scheduling state, source, tags, and edit controls

Suggested Mindset dashboard structure:

1. Review due
   - due decks/cards, compact and action-oriented

2. Sets
   - current deck list
   - rectangular set rows/cards with due count, new count, killed count, source, last studied

3. Misconceptions
   - active misconceptions grouped by concept/topic
   - confidence and reason visible without a modal
   - actions: fix with chat, generate flashcards, improve, clear
   - use the same rectangular card/list visual language as sets and active file search results

Review modal suggestions:

- keep the modal, but reduce the feeling of a separate app
- make the flashcard less pure white and more paper-like/off-white
- improve vertical balance so the card does not float in empty space
- make answer/rating controls feel like the strongest part of the lower toolbar
- keep keyboard hints, but make them low-priority metadata

## 6. Fix Sidebar Coherence Across Dashboard, Mindset, Tasks, And Chats

Chat and Files sidebars look decent. The weaker sidebar experiences are on the dashboard/desktop homepage, Mindset, and Tasks. These should be normalized without making every sidebar identical.

Current source:

- `apps/web/src/components/dashboard/app-sidebar.tsx`
  - main workspace sidebar, active view switching, chat sections
- `apps/web/src/components/dashboard/sidebar-files-panel.tsx`
  - files sidebar, currently one of the better surfaces
- `apps/web/src/components/flashcards/sidebar-panel.tsx`
  - Mindset sidebar
- `apps/web/src/components/dashboard/sidebar-task-preview.tsx`
  - task sidebar preview
- `apps/web/src/components/dashboard/dashboard-home.tsx`
  - dashboard/home content that influences sidebar expectations

Current issues:

- sidebar quality varies by active workspace section
- dashboard/home, Mindset, and Tasks sidebars do not feel as polished as Chat and Files
- task sidebar does not surface untagged tasks clearly
- chat sidebar only separates pinned vs other chats, but should also group normal chats by update date

Direction:

- keep Chat and Files as the sidebar quality bar
- normalize group labels, row height, selected state, icon treatment, action buttons, and empty states
- make Mindset sidebar feel like a study navigation panel rather than a generic list
- make Tasks sidebar show due tasks, upcoming tasks, and untagged tasks
- keep sidebar content contextual, but make the shell behavior and row language consistent

Task sidebar changes:

- add an `Untagged tasks` group
- define "untagged" from task metadata/resources/tags based on the current schema
- keep due/upcoming groups, but avoid visual drift from the files/chat sidebar style

Chat sidebar changes:

- preserve pinned chats as the top section
- group unpinned chats by `updatedAt`
- proposed groups:
  - Today
  - Yesterday
  - Previous 7 days
  - Previous 30 days
  - Older
- keep search behavior across all groups
- preserve existing pin/unpin/delete behavior
- avoid date-group labels becoming visually louder than chat rows

## 7. Fix PDF And Markdown Thumbnail Inconsistency

Current PDF and markdown thumbnails are visually inconsistent. Markdown thumbnails are generated with custom SVG-like document cards, while PDF previews use page thumbnails with different aspect ratios and rendering behavior. The result looks jerry-rigged and uneven in the file grid.

Current source:

- `apps/web/src/components/files/file-card-thumbnail.tsx`
  - `FileCard`
  - `MarkdownThumbnail`
  - media thumbnails
- `apps/web/src/components/files/explorer.tsx`
  - file grid/list rendering
- `apps/web/src/components/files/pdf-viewer.tsx`
  - PDF rendering and search jump behavior

Current issues:

- thumbnail aspect ratios vary too much
- markdown and PDF previews look like different products
- generated markdown thumbnail styling uses its own palette and typography
- some previews rely on `object-contain`, creating uneven visual weight
- file cards do not have one stable document frame

Direction:

- introduce one canonical `DocumentThumbnailFrame`
- every document-like file gets the same outer frame ratio
- PDF first page, markdown preview, plain text, and unknown documents all sit inside that frame
- use consistent background, radius, padding, and border
- keep actual content preview inside the frame, but normalize scale

Recommended frame:

- fixed aspect ratio, likely `4 / 3` for grid cards or `3 / 4` if we want paper-first
- same card height in a row
- same inner page bounds
- subtle background from existing muted/card tokens
- no per-type decorative palette unless it is a small icon/accent

Right inspector idea:

- useful if it shows actions and previews, not just metadata
- avoid a metadata-only inspector because users may perceive it as clutter
- inspector should answer: what is selected, what can I do, where does it live, and what does it contain?

Possible inspector contents:

- larger preview
- title/path
- open/split/share/rename/delete actions
- source links or related notes
- recent activity only if useful
- technical metadata hidden behind disclosure

## 8. Consolidate Empty States, Inspectors, And Page Patterns

There are several empty-state styles and inspector-like patterns across the app. This makes the app feel assembled from separate surfaces.

Likely source areas:

- `apps/web/src/components/tasks/task-empty-state.tsx`
- `apps/web/src/components/tasks/task-detail-pane.tsx`
- `apps/web/src/components/files/explorer/file-preview-panel.tsx`
- `apps/web/src/components/dashboard/workspace-route-placeholder.tsx`
- `apps/web/src/components/flashcards/*`
- `apps/web/src/components/dashboard/sidebar-files-panel.tsx`

Direction:

- define one workspace empty-state pattern
- define one compact inspector pattern
- define one page toolbar pattern
- define one result-row/list-row pattern
- use the same border radius, border color, text hierarchy, and spacing scale

Workspace empty state should be:

- compact
- action-oriented
- visually quiet
- no oversized illustration or dashboard card

Inspector pattern should be:

- optional
- contextual
- action-first
- metadata-second
- dismissible or tied to selection

## Suggested Implementation Order

1. Header normalization
   - audit all workspace pages using header portals
   - remove duplicated in-page titles where appropriate
   - make actions consistent with editor/PDF header behavior

2. Search result surface
   - remove generated search answer UI
   - stop rendering results as a floating answer/matches panel
   - filter the existing file view to matching files
   - add a rectangular search-active file card/list variant

3. Thumbnail frame system
   - create one document thumbnail frame
   - move markdown/PDF/document previews into that frame
   - verify grid and list consistency

4. Sidebar coherence
   - improve dashboard/home, Mindset, and Tasks sidebar panels
   - show untagged tasks in the task sidebar
   - group unpinned chats by update date

5. Mindset detail cleanup
   - move actions/header identity into shared chrome
   - collapse deck profile/study context into compact status
   - make card bank the main surface
   - add misconception visibility inside Mindset

6. Pattern consolidation
   - empty states
   - inspectors
   - toolbars
   - list/result rows

## Things Not To Do

- do not remove user-customizable banners globally
- do not remove Tasks list/Kanban views
- do not turn every page into a dashboard
- do not create a disconnected search results UI when search can filter the file view
- do not add decorative cards to fill space
- do not add metadata-heavy inspectors unless they improve a real workflow
- do not make Mindset look like the chat page; make it feel like it belongs in the same workspace system
- do not hide primary actions in overflow menus when they are part of the core workflow

## Definition Of Done

- Workspace pages share the same header/action language as notes and PDF viewer.
- Search filters the existing file view and shows matching files as readable rectangular file cards.
- Task page keeps list/Kanban behavior while losing duplicated page chrome.
- Mindset reads as a study/card workspace, includes misconceptions, and no longer relies on dashboard-only misconception chrome.
- Sidebar panels for dashboard/home, Mindset, and Tasks match the quality of Chat and Files.
- Task sidebar shows untagged tasks.
- Chat sidebar groups unpinned chats by update date.
- PDF and markdown thumbnails have stable aspect ratios and a shared document frame.
- Empty states, inspectors, toolbars, and list rows use one recognizable workspace pattern.
