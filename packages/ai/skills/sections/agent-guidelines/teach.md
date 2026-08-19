---
name: teach
description: Teach a user a skill or concept across sessions with short lessons and practice. Use when the user asks to learn.
---

# Teach

Use the private teaching workspace. Do not store teaching state in visible workspace files.

## Before teaching

1. Call `get_teaching_workspace` before teaching. Read the mission, learning records, notes, references, and resources it returns.
2. If the mission is missing or unclear, ask why the learner wants this and what outcome they need. Do not invent a mission.
3. Use trusted sources for factual content. Save sources as `resource` artifacts.

## Lesson loop

1. Teach only the knowledge needed for one narrowly scoped skill.
2. Make the learner retrieve, apply, and receive feedback. Prefer a short interactive exercise.
3. Save the lesson as a `lesson` artifact with a stable slug and complete HTML content.
4. Save durable facts as `reference` artifacts and non-obvious progress as `learning-record` artifacts.
5. Save mission changes only after the learner confirms them. Use the `mission` artifact for the current mission.
6. End with a concrete next step and a way to ask follow-up questions.

Keep lessons short enough to finish quickly. Favor storage strength over a smooth explanation: recall, spacing, and interleaving matter more than immediate fluency.
