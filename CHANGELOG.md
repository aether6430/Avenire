# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Migration operations now live in [docs/migrations.md](docs/migrations.md), and
environment setup lives in [docs/environment.md](docs/environment.md).

## [Unreleased]

### Breaking Changes

- None (unreleased changes)

### Migration Guide

No migration required for unreleased changes.

---

## [0.5.0] - 2026-04-28

### Breaking Changes

- None

### Migration Guide

```bash
pnpm db:migrate
```

### Added

- **Ingestion/Importing Links** (`packages/ingestion/src/ingestion/link.ts`)
  - Support for importing content from URLs via provider extractors or Tavily fallback
  - Link ingestion pipeline integration

- **Chat Widgets for Markdown Notes** (`apps/web/src/components/chat/markdown.tsx`)
  - Interactive widgets embedded in markdown rendered content
  - Chat tool integration within notes view

- **Study Guideline Examples** (`packages/ai/`)
  - Skill registry examples for study workflows
  - AI-guided learning prompts

- **Verification Resend Cooldown and Waitlist** (`packages/auth/`, `packages/database/src/waitlist-data.ts`)
  - Rate-limited verification email resend
  - Waitlist management for beta access

- **Pane Routing and State Stores** (`apps/web/src/lib/stores/`)
  - URL-based pane state management
  - Persistent pane layout across navigation

- **Dashboard Surfaces Through Panes**
  - Multi-pane dashboard layout
  - Resizable pane regions

### Fixed

- **Multipart Upload Streaming and Attachment Preview**
  - Streaming upload progress
  - File attachment preview before sending

- **Workspace Manage Flow, Billing, and Calendar Polish**
  - Workspace settings UI improvements
  - Billing integration refinements
  - Calendar component styling

- **Chat Shimmer and Pane Resize**
  - Loading skeleton animations
  - Pane resize handle interactions

- **Sidebar Navigation Chrome in Panes**
  - Persistent navigation visibility
  - Header chrome preservation

## [0.4.0] - 2026-04-22

### Breaking Changes

- **Auth Hooks Migration**: Custom auth `onCreateUser` callbacks must be updated to use Better Auth's `onUserCreate` plugin pattern

```typescript
// Old pattern (removed)
const authOptions = {
  callbacks: {
    onCreateUser: async (user) => { ... }
  }
}

// New pattern
const authOptions = {
  plugins: {
    onUserCreate: async (user) => { ... }
  }
}
```

### Migration Guide

```bash
# 1. Update auth hooks
# Update your auth configuration to use plugin pattern

# 2. Run migrations for flashcard review events
pnpm db:migrate

# 3. Rebuild
pnpm build
```

### Added

- **Flashcard Review UI** (`packages/database/src/flashcard-review-events.ts`)
  - Adopted `react-quizlet-flashcard` library
  - Refactored review layout and styling
  - Progress state management
  - PATCH-based invalidation for real-time updates

- **Shared Resource Duplication and Sidebar Search** (`apps/web/src/components/files/`)
  - Duplicate files/folders across workspaces
  - Search within file sidebar

- **Retrieval Service Sharing** (`apps/web/src/lib/retrieval-cache.ts`, `packages/ingestion/src/retrieval/`)
  - Shared retrieval across chat, API, and warmups
  - Vector store integration

- **Better Auth `onUserCreate` Hooks**
  - Migrated from spaghetti hooks pattern
  - Cleaner auth lifecycle management

- **Misconception Logging and Theming**
  - Gaps in misconception tracking fixed
  - Theme system improvements

### Fixed

- **UI Inconsistencies**
  - Visual alignment across components
  - Responsive behavior corrections

- **Background Files Refresh Loops**
  - Stopped unnecessary background refreshes
  - Reduced traffic overhead

- **Chat Stream and Mermaid Sanitization**
  - XSS prevention in rendered content
  - Mermaid diagram security hardening

- **Ingestion Recovery and SSE Resume**
  - Resume interrupted ingestions
  - Server-sent events recovery

## [0.3.0] - 2026-04-07

### Breaking Changes

- **Video Processing**: Video files now require FFmpeg for optimization. Ensure FFmpeg is installed:

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
apt install ffmpeg

# Check installation
ffmpeg -version
```

### Migration Guide

```bash
# 1. Install FFmpeg
# 2. Build extension (if using web clipper)
cd apps/extension && pnpm build

# 3. Run migrations
pnpm db:migrate

# 4. Rebuild
pnpm build
```

### Added

- **Web Clipper Extension** (`apps/extension/`)
  - Chrome/Firefox browser extension
  - Content extraction from web pages
  - Destination presets for workspaces

- **Google Drive and Notion Import**
  - External platform integration
  - OAuth-based authentication

- **Chat and File Management UI Components** (`apps/web/src/components/chat/`, `apps/web/src/components/files/`)
  - Enhanced chat interface
  - File management sidebar improvements

- **Static Workspace Routes** (`apps/web/src/app/(app)/workspaces/`)
  - Static generation for workspace pages
  - Unified SSE for real-time updates
  - Suspense boundaries for dynamic content

- **Video Optimization** (`packages/ingestion/src/ingestion/video.ts`, `packages/ingestion/src/utils/ffmpeg.ts`)
  - Store optimized video variants
  - Multiple quality representations

- **Tests for Ingestion Pipeline** (`packages/ingestion/src/`)
  - Unit tests for core ingestion logic
  - Chunking, transcription, and OCR tests

### Fixed

- **Video Upload Flow**
  - File tree interactions during uploads
  - Upload progress indicators

- **Ingestion URL Safety**
  - URL validation and sanitization
  - Backend process hardening

- **Sidebar Tree Highlight**
  - Highlight persistence until target mounts

## [0.2.0] - 2026-03-20

### Breaking Changes

- **Vector Store**: Learning retrieval now requires PostgreSQL with `vector` extension enabled

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

- **Session Summaries**: New `session_summary` table required

### Migration Guide

```bash
# 1. Enable vector extension on PostgreSQL
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 2. Run migrations
pnpm db:migrate

# 3. Update AI provider config (if needed)

# 4. Rebuild
pnpm build
```

### Added

- **Learning Retrieval and Citation Foundations** (`packages/ingestion/src/retrieval/`, `packages/database/src/learning-data.ts`)
  - 2,158 lines of retrieval logic
  - Vector store and query expansion
  - Citation formatting for chat responses
  - Subject detection and taxonomy inference

- **Misconception Chat Integration** (`apps/web/src/lib/chat-tools/`)
  - Chat-based misconception tracking
  - Automated misconception detection

- **Misconception and Mastery Automation** (`packages/database/src/flashcard-learning-automation.ts`, `packages/database/src/flashcard-review-events.ts`)
  - 1,185 lines of automation logic
  - FSRS (Free Spaced Repetition Scheduler) integration
  - Review event tracking and testing

- **Session Summaries and Weakest Concepts APIs** (`apps/web/src/lib/session-summaries.ts`, `packages/database/src/session-summary-data.ts`)
  - 685 lines of session management
  - Phase 3-4 weakest concepts extraction
  - Automated summary generation

- **Railway Workspace Updates**
  - Railway deployment integration
  - Environment configuration

- **Mobile Dashboard Flow** (`apps/web/src/components/mobile/`)
  - Improved mobile UX
  - Touch-optimized interactions
  - File explorer haptics

- **Notes to Markdown-Backed Files** (`packages/ingestion/src/ingestion/markdown.ts`)
  - Markdown-native note storage
  - Virtual file support (`virtual:note:*`, `virtual:markdown:*`)

- **Task Workspace**
  - Task management interface
  - Better workspace organization

### Changed

- **Heavy Caching and SSR to CSR Migration**
  - Performance improvements
  - Client-side data fetching
  - Caching layer optimization

### Fixed

- **Chat Stream and Mermaid Sanitization**
  - Security hardening for user content
  - XSS prevention

- **Ingestion Recovery and SSE Resume**
  - Resumable ingestion jobs
  - SSE reconnection handling

## [0.1.0] - 2026-03-01

### Breaking Changes

- Initial release (no previous version to migrate from)

### Migration Guide

```bash
# 1. Clone the repository
git clone https://github.com/your-org/avenire.git
cd avenire

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your values

# 4. Generate database types
pnpm db:generate

# 5. Run initial migrations
pnpm db:migrate

# 6. Build the project
pnpm build

# 7. Start development
pnpm dev
```

### Added

- **Monorepo Bootstrap** (`turbo.json`, `pnpm-workspace.yaml`)
  - Turborepo configuration
  - pnpm workspace setup
  - Apps: web, backend, emails, extension
  - Packages: ai, auth, database, emailer, ingestion, linting, observability, payments, storage, ui

- **Core Chat and Workspace File System Foundation** (`packages/database/src/`, `apps/web/src/app/api/`)
  - Database schema with Drizzle
  - Chat API routes
  - Workspace file management

- **Dynamic OG Metadata and Contextual Page Titles** (`apps/web/src/app/`)
  - OpenGraph metadata generation
  - Per-page title customization

- **Payments, Observability, Settings, and Media Upgrades** (`packages/payments/`, `packages/observability/`)
  - Payment processing integration
  - Application observability
  - User settings management
  - Media upload and streaming

- **Ingestion Pipeline with Streaming** (`packages/ingestion/src/`, `apps/backend/`)
  - BullMQ-based job queue
  - Source-specific ingesters: PDF, image, video, audio, markdown, link
  - Video: transcription, keyframes, OCR, captions
  - Chunking and embedding generation
  - Postgres vector store integration

- **Workspace Collaboration, UX, and Performance Improvements**
  - Real-time collaboration features
  - UI/UX polish
  - Performance optimizations

- **Media Download/Streaming**
  - Video variant storage
  - Streaming playback
  - Download handlers

### Security

- **Hardened Chat Stream Flow**
  - File/folder invariants enforced
  - Authorization checks
  - Stream integrity validation

- **API and Type Regressions Fixed**
  - Type safety improvements
  - API route hardening

- **Authz Checks Hardened**
  - Permission validation
  - Sudo mode security

[unreleased]: https://github.com/your-org/avenire/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/your-org/avenire/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/your-org/avenire/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/your-org/avenire/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/your-org/avenire/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-org/avenire/releases/tag/v0.1.0

---

## Migration Guides

### Upgrading to v0.5.0

No migration required. Run `pnpm db:migrate` to apply any pending schema changes.

### Upgrading to v0.4.0

1. Update flashcard review events table:

```sql
-- The flashcard-review-events table was introduced in this version
-- No manual migration needed; Drizzle handles it
pnpm db:migrate
```

2. If using custom auth hooks, update to use Better Auth `onUserCreate` pattern:

```typescript
// Before (spaghetti hooks)
authOptions.callbacks.onCreateUser = async (user) => { ... }

// After (Better Auth)
authOptions.plugins.onUserCreate = async (user) => { ... }
```

### Upgrading to v0.3.0

1. Apply video optimization settings:

```bash
# Ensure FFmpeg is available for video ingestion
pnpm build
```

2. If using the web clipper extension:

```bash
# Build the extension
cd apps/extension && pnpm build
```

### Upgrading to v0.2.0

1. The learning retrieval system requires PostgreSQL with vector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

2. Run session summaries migration:

```bash
pnpm db:migrate
```

### Upgrading to v0.1.0

1. Initial setup:

```bash
# Clone and install
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your values

# Generate database types
pnpm db:generate

# Run migrations
pnpm db:migrate

# Build the project
pnpm build
```

2. Required environment variables:
   - `DATABASE_URL` - PostgreSQL connection
   - `REDIS_URL` - Redis connection
   - `BETTER_AUTH_SECRET` - Auth session secret
   - At least one AI provider key (`GEMINI_API_KEY`, `OPENAI_API_KEY`, etc.)
