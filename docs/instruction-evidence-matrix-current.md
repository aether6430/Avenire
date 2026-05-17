# Instruction Evidence Matrix Current

Tags: audit, checklist, instruction, verification

This matrix maps the recovered [instruction.md](/Users/johnmacartew/Developer.nosync/aveniri/instruction.md:1)
to concrete repo evidence in the active no-sync workspace.

Status legend:

- `met` = directly evidenced in current state
- `partial` = meaningfully improved, but not fully proven end to end
- `open` = still a material uncovered requirement

## Primary goal

| Requirement | Status | Evidence |
| --- | --- | --- |
| coherent, public-ready product foundation | `partial` | Public/product/auth/workspace evidence is tracked in [product-coherence-audit-current.md](/Users/johnmacartew/Developer.nosync/aveniri/docs/product-coherence-audit-current.md:1) and [visual-interaction-audit-current.md](/Users/johnmacartew/Developer.nosync/aveniri/docs/visual-interaction-audit-current.md:1). Public-facing and signed-in route families are now browser-proven, but longer-lived interactive durability is still not fully proven. |
| stable enough to trust | `partial` | Root production build, repo test budget, and repo coverage floor now pass; detached production survives multiple signed-in loops and richer-state loops. Remaining gap: sustained interactive durability under longer sessions. |
| organized enough to extend | `partial` | Real instruction recovered in [instruction.md](/Users/johnmacartew/Developer.nosync/aveniri/instruction.md:1); active audit docs and logs now exist in-repo. Remaining gap: older Desktop historical logs are still split from the active repo. |
| cohesive enough for future feature/design work | `partial` | Large authenticated shells were reduced, signed-in states are better stitched, and failure states are more explicit. Remaining gaps are richer successful method interaction and longer-lived session proof. |

## Workstream 1: Tests and reliability

| Requirement | Status | Evidence |
| --- | --- | --- |
| reach at least 10% test coverage | `met` | `pnpm test:coverage:repo` => repo lower-bound coverage `11.03%`, logged in [2026-05-17-instruction-recovery-and-coverage-audit.md](/Users/johnmacartew/Developer.nosync/aveniri/logs/2026-05-17-instruction-recovery-and-coverage-audit.md:1). |
| keep test LOC at or below 25% of total source LOC | `met` | `pnpm test:budget` => repo ratio `17.59%`, logged in [2026-05-17-instruction-recovery-and-coverage-audit.md](/Users/johnmacartew/Developer.nosync/aveniri/logs/2026-05-17-instruction-recovery-and-coverage-audit.md:1). |
| prioritize important routes and critical flows | `partial` | Coverage and runtime proof now include `/workspace`, files, tasks, chat/new-method, flashcards, persisted routes, task create/update, flashcard create/review, and chat failure recovery. A successful method-response path is still unproven locally because no provider key is configured. |
| add tests where instability blocks confidence | `met` | Recent targeted tests added or repaired around files route metadata/route behavior, auth coverage harness, database env boundaries, chat tab accessibility, chat provider-config messaging. |
| prefer meaningful coverage over vanity coverage | `met` | Repo coverage script uses conservative lower-bound accounting and counts untouched packages as `0%`; documented in [completion-audit-current.md](/Users/johnmacartew/Developer.nosync/aveniri/docs/completion-audit-current.md:1). |
| use failures in real usage as input for tests | `met` | Chat provider failure, files-route metadata drift, auth coverage breakage, and database env-boundary regressions all produced focused tests or test repairs. |
| app stops collapsing under normal use | `partial` | Detached signed-in loops now survive across empty-state, richer-state, short post-mutation routes, a `30`-request mixed-route soak with `/login` healthy after `120s`, and a `60`-request mixed-route soak with `/login` healthy after `180s`. Longer-lived interactive use is still open. |

## Workstream 2: User experience and product coherence

| Requirement | Status | Evidence |
| --- | --- | --- |
| improve clarity of flows, states, transitions, empty states, interaction logic | `partial` | Public, auth, workspace home/files/tasks/chat/flashcards, persisted entity routes, and post-mutation states are browser-proven. Method failure is explicit and reload-safe. Successful provider-backed method response is still open. |
| reduce chaos or cognitive overload | `partial` | Startup pressure and redundant background work on files routes were reduced; sidebar duplicate files surface removed on desktop; tab label duplication fixed. Remaining complexity still lives in longer signed-in loops and `explorer.tsx`. |
| clearer model of what user is doing and what matters next | `partial` | Home/tasks/files/chat/flashcards route proofs are stronger; richer persisted states and mutation results now visible. Still missing one successful method-response round-trip and longer-lived session continuity. |
| product-language quality | `partial` | Multiple copy and language passes landed; auth entry copy now matches the study/research language on the public product edge, but deeper successful method interaction is still not locally proven. |
| existing product vision legible throughout experience | `partial` | Far more legible than before, but not fully closed because deeper successful interactive method behavior is not yet proven locally. |

## Workstream 3: Organization and documentation

| Requirement | Status | Evidence |
| --- | --- | --- |
| move/rewrite docs into sensible places | `met` | Active repo now contains `instruction.md`, current audits, local environment docs, migrations docs, and logging receipts. |
| improve repository organization without meaningless churn | `partial` | Many large surfaces reduced and routes clarified; remaining structural pressure is now concentrated in a smaller distributed set instead of one giant shell. |
| keep docs useful and reorganized where presentation was poor | `met` | Current audit bundle plus recovered instruction and logs form a coherent working knowledge base. |
| logging protocol using `logs/` for meaningful passes | `met` | Active repo now has a growing bundle of meaningful log entries under `logs/`, covering instruction recovery, richer-state and richer-interaction soaks, chat failure/config proofs, and structural wrapper receipts. |
| evidence trail not split across two homes | `partial` | Active repo now mirrors the most important recent receipts and includes `docs/desktop-log-index-current.md` for the old Desktop log cluster, but older Desktop logs still remain outside the repo and many are dataless placeholders. |

## Workstream 4: Structural code health

| Requirement | Status | Evidence |
| --- | --- | --- |
| reduce god files and monolithic modules where they block development | `partial` | Former hotspots like `app-sidebar.tsx`, `command-palette.tsx`, `student-calendar.tsx`, `student-calendar-desktop.tsx`, `student-calendar-desktop-surface.tsx`, `onboarding-modal-steps.tsx`, `rolling-tool-activity-surface.tsx`, `rolling-reasoning.tsx`, `markdown.tsx`, `use-chat-runtime.ts`, `multimodal-input.tsx`, `data-imports-section.tsx`, and `sidebar-files-panel.tsx` were reduced dramatically. |
| keep abstractions honest and local | `met` | Recent reductions consistently wrapped existing local hooks/models rather than inventing compatibility shims. |
| make repo easier to change correctly after refactor | `partial` | Many shells are slimmer. Remaining pressure is now distributed across the particle-field/model cluster, the chat-runtime/reasoning cluster, and the remaining explorer/files runtime cluster, with more of the files runtime now moved into explicit local model owners instead of one giant explorer shell. |
| avoid over-advanced refactors that do not improve codability | `met` | Recent changes stayed surgical and aligned with existing boundaries. |

## Workstream 5: UI polish and consistency

| Requirement | Status | Evidence |
| --- | --- | --- |
| fix sloppy visual inconsistencies | `partial` | Selected workspace tab labels no longer duplicate; richer route families and failure states are visually coherent. |
| correct broken spacing, alignment, capitalization, copy formatting, rough details | `partial` | Many local polish passes landed, including auth-entry copy alignment; broader signed-in interactive polish remains open. |
| preserve current design direction unless inconsistency harms quality | `met` | Recent UI fixes improve consistency without redesigning the product. |

## Workstream 6: Relentless verification

| Requirement | Status | Evidence |
| --- | --- | --- |
| re-check each area after changes | `met` | Every major pass has paired lint/type/build/test or browser receipts and a log entry. |
| do not trust first pass | `met` | Multiple detached route loops, richer-state loops, post-mutation loops, and repeated browser proofs were run across fresh production ports. |
| continue until no more meaningful issues are easy to spot | `open` | There are still meaningful issues easy to spot: successful method-response proof under a configured provider, longer-lived interactive durability, and the current distributed structural hotspots. |

## Additional baseline standards

| Requirement | Status | Evidence |
| --- | --- | --- |
| improve error handling where failure feels silent/confusing | `partial` | Provider failure in persisted chat is now explicit and reload-safe, and the unconfigured session-summary close path now skips cleanly instead of logging a hard failure. A successful provider-backed round-trip is still not proven locally. |
| remove or reduce dead weight harming clarity | `partial` | Many giant surfaces and eager background behaviors were cut. |
| prefer stable, explicit behavior over hidden magic | `met` | Recent work favored fail-closed or explicit UI states over invisible background behavior. |
| watch for over-engineering that does not pay off | `partial` | Many overgrown shells were reduced, but the codebase is still structurally uneven around `explorer.tsx`. |
| keep future extensibility in mind | `partial` | Strongly improved from baseline, but final public-ready end-state is still not proven. |

## End-state checklist

| End-state claim | Status | Evidence |
| --- | --- | --- |
| can be used without constantly falling apart | `partial` | Short repeated signed-in loops, richer-state loops, post-mutation loops, a `30`-request detached route soak, and a `60`-request detached route soak now survive; longer-lived interactive use is still not fully proven. |
| feels coherent rather than stitched together | `partial` | Strong improvement across route families and error states; still not fully closed until successful method interaction and longer-lived sessions are proven. |
| has enough testing to support change | `met` | Explicit test budget and coverage floor from the instruction are now satisfied. |
| has a structure that future work can build on | `partial` | Major improvement, but `explorer.tsx` remains a meaningful hotspot. |
| communicates itself more clearly | `partial` | Public/product surfaces, auth entry, richer states, and failure states are much clearer; successful provider-backed method interaction is still not locally proven. |
| ready for public-facing iteration instead of internal survival mode | `partial` | Much closer, but not yet fully proven because the successful model-backed method path and longer-lived interactive durability remain open. |
