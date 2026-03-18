# Phase 4: Session Summaries

## Summary
- Persist structured summaries of chat sessions after they end.
- Reuse recent summaries as optional context in future chats.
- Build on existing chat thread/message persistence rather than adding a parallel session system.

## Implementation Changes
- Database schema
  - Add `session_summaries` table with:
    - `id`
    - `user_id`
    - `chat_id`
    - `started_at`
    - `ended_at`
    - `concepts_covered`
    - `misconceptions_detected`
    - `flashcards_created`
    - `summary_text`
    - `created_at`
  - Index by `user_id + ended_at` and `chat_id`.
- Session lifecycle
  - Use existing `chat_thread` and `chat_message` as the source of truth.
  - Define a chat session boundary rule for summary generation. Initial rule:
    - start at the first persisted user message after a period of inactivity or thread creation
    - end when the assistant response completes and the inactivity threshold is met or an explicit summarization job is triggered
  - Keep session segmentation in app logic; do not mutate historical chat messages.
- Summary generation
  - Build a summarizer that consumes:
    - persisted chat messages from the bounded session window
    - tool activity from message parts or persisted tool-call output
    - any misconception events recorded during the session
  - Ask the model for a structured summary containing:
    - main concepts covered
    - misconceptions detected
    - flashcards/quizzes created
    - concise narrative summary text
  - Persist one summary row per completed session.
- Retrieval and injection
  - Add `getRecentRelevantSessionSummary(userId, subject)` or equivalent helper.
  - In `/api/chat`, after subject detection and before prompt assembly, optionally include the most recent relevant summary as soft context.
  - Keep this optional and bounded to a single recent summary in v1.

## Public Interfaces / Types
- New DB APIs:
  - `createSessionSummary(...)`
  - `listSessionSummariesForUser(...)`
  - `getRecentRelevantSessionSummary(userId, subject)`
- New table:
  - `session_summaries`

## Test Plan
- Session generation
  - Completed chat session with messages and tool activity produces one persisted summary row.
  - Empty or trivial sessions do not generate low-value summaries.
- Content correctness
  - Generated summary includes detected misconceptions and created flashcard counts when present.
  - Summary generation reads only the intended session window.
- Chat reuse
  - Relevant recent summary is injected into chat context when subject detection succeeds.
  - Irrelevant or absent summaries are skipped cleanly.

## Assumptions
- Existing persisted chat messages are sufficient to reconstruct session windows.
- Session summaries are generated asynchronously where practical so chat latency does not regress.
- V1 stores only summary output, not full summary-generation intermediate artifacts.
