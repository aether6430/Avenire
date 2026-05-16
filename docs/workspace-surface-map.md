# Workspace Surface Map

This is the authenticated workspace operator map for `apps/web`.

Use it when you need to answer any of these questions quickly:

- What is the user-facing name of this surface?
- Which routes own it?
- Which components are the main entrypoints?
- Which API families back it?
- Which folder should receive the next change?

The goal is not to restate every file in the repo. The goal is to keep the
main product surfaces legible.

## Shared shell

These pieces frame almost every authenticated workspace flow:

- route family: `/workspace`
- pane orchestration:
  - `src/components/dashboard/workspace-pane-scene.tsx`
  - `src/components/dashboard/workspace-pane-renderer.tsx`
  - `src/components/dashboard/workspace-layout-shell.tsx`
- shell and sidebar:
  - `src/components/dashboard/shell.tsx`
  - `src/components/dashboard/dashboard-sidebar-content.tsx`
  - `src/components/dashboard/dashboard-sidebar-chat-panel.tsx`

If a change affects cross-surface navigation, pane loading, or the top-level
workspace chrome, start in `src/components/dashboard`.

## Methods

### User-facing label

- `Method` / `Methods`

### Main routes

- `/workspace/chats/new`
- `/workspace/chats/[slug]`
- legacy redirect helpers:
  - `/workspace/chats`
  - public `/chats`
  - public `/chats/new`

### Main entrypoints

- `src/components/dashboard/workspace-chat-new-page-client.tsx`
- `src/components/dashboard/workspace-chat-route-page-client.tsx`
- `src/components/dashboard/chat-workspace.tsx`
- `src/components/chat/*`

### Backing API families

- `/api/chat`
- `/api/chat/history`
- `/api/chat/[id]/stream`
- `/api/chats`
- `/api/chats/[slug]`
- `/api/chats/[slug]/share/*`

### Ownership hint

- conversation runtime, composer, markdown, tool output, and attachments:
  `src/components/chat`
- method route loading, sidebar integration, share dialog wiring:
  `src/components/dashboard`

## Files

### User-facing label

- `Files`

### Main routes

- `/workspace/files`
- `/workspace/files/[workspaceUuid]`
- `/workspace/files/[workspaceUuid]/folder/[folderUuid]`

### Main entrypoints

- `src/components/files/workspace-files-root-page-client.tsx`
- `src/components/files/workspace-folder-route-page-client.tsx`
- `src/components/files/explorer.tsx`

### Backing API families

- `/api/workspaces/[workspaceUuid]/files/*`
- `/api/workspaces/[workspaceUuid]/folders/*`
- `/api/uploads/sessions/*`
- `/api/imports/*`
- `/api/realtime/files`
- `/api/realtime/files-token`

### Ownership hint

- explorer behavior, previews, uploads, note/file workflows:
  `src/components/files`
- workspace pane routing, sidebar file panel, and cross-surface shell glue:
  `src/components/dashboard`

## Mindset Sets

### User-facing label

- `Mindset Set` / `Mindset Sets`

### Main routes

- `/workspace/flashcards`
- `/workspace/flashcards/[setId]`

### Main entrypoints

- `src/components/flashcards/workspace-flashcards-page-client.tsx`
- `src/components/flashcards/set-detail-page.tsx`
- `src/components/flashcards/dashboard.tsx`
- `src/components/flashcards/sidebar-panel.tsx`

### Backing API families

- `/api/flashcards/dashboard`
- `/api/flashcards/sets`
- `/api/flashcards/sets/[setId]`
- `/api/flashcards/sets/[setId]/cards`
- `/api/flashcards/sets/[setId]/enrollment`
- `/api/flashcards/review`
- `/api/flashcards/review/queue`
- `/api/flashcards/revision-calendar`
- `/api/flashcards/onboarding`

### Ownership hint

- dashboard, sidebar, set detail, study/review flows:
  `src/components/flashcards`

## Tasks

### User-facing label

- `Tasks`

### Main routes

- `/workspace/tasks`

### Main entrypoints

- `src/components/tasks/workspace-tasks-page-client.tsx`
- `src/components/tasks/tasks-workspace-surface.tsx`
- `src/components/tasks/task-resource-picker.tsx`

### Backing API families

- `/api/tasks`
- `/api/tasks/[taskId]`
- `/api/workspaces/[workspaceUuid]/tasks/resources`

### Ownership hint

- task workspace UI, detail panes, and resource picking:
  `src/components/tasks`

## Settings

### User-facing label

- `Settings`

### Main routes

- overlay-driven from workspace routes, not a standalone workspace page

### Main entrypoints

- `src/components/settings/settings-dialog.tsx`
- `src/components/settings/settings-panel.tsx`
- `src/components/settings/settings-panel-content.tsx`
- tab shells:
  - `settings-security-tab-shell.tsx`
  - `settings-shortcuts-tab-shell.tsx`
  - `settings-workspace-tab-shell.tsx`

### Backing API families

- `/api/user-settings`
- `/api/billing/*`
- `/api/security/sudo`
- `/api/workspaces/[workspaceUuid]/usage`
- `/api/imports/*`

### Ownership hint

- settings copy, tab-level runtime, workspace/account/security/billing/data
  flows: `src/components/settings`

## Product language guardrails

When editing UI copy or docs for authenticated workspace surfaces:

- prefer `Method` / `Methods` for saved workspace threads
- prefer `Mindset Set` / `Mindset Sets` for the review surface
- keep `Files` as the document workspace label
- reserve generic `chat` for interaction style, transport, or internal route
  naming when the saved surface label would be awkward or inaccurate

## Fast routing rule

When choosing where a change belongs:

1. If it changes cross-surface navigation or pane routing, start in
   `src/components/dashboard`.
2. If it changes a single workspace surface, start in that surface folder:
   `chat`, `files`, `flashcards`, `tasks`, or `settings`.
3. If it changes the data contract behind the surface, follow the matching
   `/api/...` route family.
