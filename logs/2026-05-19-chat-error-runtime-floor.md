# Chat Error Runtime Floor

Tags: tests, reliability, chat, ux

## What changed

Strengthened the user-facing chat error path by:

- adding `apps/web/src/lib/chat-errors.test.ts`
- extending `apps/web/src/components/chat/use-chat-runtime-runtime.ts`
- extending `apps/web/src/components/chat/use-chat-runtime-runtime.test.ts`
- wiring `use-chat-runtime.ts` to the extracted error-reaction helper

Covered behavior:

- network/model/usage-limit/validation/unknown error categorization
- user-facing error message mapping
- chat runtime toast + pet-notification reaction on errors

## Why it mattered

These are directly user-visible failure paths in the core chat surface. Before
this pass the main categorization and reaction logic had essentially no direct
floor.

Now the error semantics and the runtime’s reaction to them are both verified
explicitly.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/chat-errors.test.ts apps/web/src/components/chat/use-chat-runtime-runtime.ts apps/web/src/components/chat/use-chat-runtime-runtime.test.ts apps/web/src/components/chat/use-chat-runtime.ts`
- `node_modules/.bin/vitest run src/lib/chat-errors.test.ts src/components/chat/use-chat-runtime-runtime.test.ts src/components/chat/use-chat-runtime-model.test.ts src/components/chat/chat-model.test.ts src/components/chat/chat.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The chat runtime error path is stronger now. The next chat follow-up is more
likely to be around the remaining hook lifecycle glue or higher-level browser
interaction verification rather than pure error classification.
