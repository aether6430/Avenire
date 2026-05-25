# Avenire Product Recovery Instruction

## Primary goal

Turn the current repository into a coherent, public-ready product foundation. The target is not to add flashy new features first. The target is to make the existing system behave like a real product: stable enough to trust, organized enough to extend, and cohesive enough that future feature work and design work can happen on top of it without fighting the codebase.

The current problem is not a lack of engineering effort. The current problem is that the project feels overbuilt internally while the actual application experience is under-stitched. This work is about fastening the belt: packaging the internals into something that closes properly as a product.

## Core framing

- Treat product coherence as a first-class engineering concern.
- Favor substance over theater. Fix what makes the app fragile, incoherent, or hard to grow.
- Do not optimize for beauty alone. Optimize for trust, clarity, and extendability.
- Do not turn the work into random cleanup. Every change should support product readiness.
- Keep the existing ambition of the project, but remove the chaos around it.

## Workstreams

### 1. Tests and reliability

The project needs a basic floor of confidence before deeper product work can hold.

- Reach at least 10% test coverage.
- Keep test LOC at or below 25% of total source LOC. Test volume should stay
  disciplined, not become a parallel codebase.
- Prioritize important routes, critical flows, and break-prone behavior over low-value internals.
- Add tests where current instability blocks confidence in the app.
- Prefer meaningful coverage over vanity coverage.
- Replace low-value or brittle tests with higher-priority coverage when the
  test budget is better spent elsewhere.
- Use failures in real usage as input for what must be tested first.

This is not about chasing a number alone. The number is only a floor. The real aim is to create enough trust that the application stops collapsing under normal use.

### 2. User experience and product coherence

The app should feel like one product, not a pile of ideas or surfaces that accumulated over time.

- Improve the clarity of flows, states, transitions, empty states, and interaction logic.
- Reduce the feeling of chaos or cognitive overload.
- Shape a clearer model of what the user is doing, where they are, and what matters next.
- Tighten rough edges so the product feels intentional, even when it remains complex.
- Treat product thinking as part of implementation decisions, not as a separate layer.

This includes product-language quality:

- Remove documentation or in-app copy that is bloated, sloppy, redundant, or unclear.
- Rewrite wording that damages product understanding.
- Fill in missing explanation where the product intent is under-communicated.
- Preserve the core meaning while making the whole thing feel more unified and credible.

The goal is not to invent major new features. The goal is to make the existing product vision legible and felt throughout the experience.

### 3. Organization and documentation

The repository should become easier to navigate, reason about, and maintain.

- Move or rewrite documentation where needed so it lives in sensible places.
- Improve repository organization without meaningless churn.
- Make structure reflect real ownership and real usage.
- Clean up folder and documentation sprawl where it hurts understanding.
- Keep the essence of existing docs, but reorganize and rewrite them when the presentation is poor.

This work matters as much as tests because a product this large cannot be improved sustainably inside disorder.

### 4. Structural code health

The codebase is large enough that structure is a product concern.

- Reduce god files and monolithic modules where they actively block development.
- Extract code for clarity, ownership, and future maintenance, not for aesthetic purity.
- Keep abstractions honest and local.
- Avoid refactors that only make the code look advanced without making it easier to work in.
- Make the repository more codable for future feature work.

The standard is pragmatic structure: the code should be easier to change correctly after the refactor than before it.

### 5. UI polish and consistency

Do not redesign the product from scratch in this phase. Improve what is already there.

- Fix sloppy visual inconsistencies.
- Correct broken spacing, alignment, capitalization, copy formatting, and rough layout details.
- Clean up details that make the interface feel accidental or unfinished.
- Preserve the design direction unless a local inconsistency clearly harms product quality.

These changes should create the feeling of a better-built product without turning the work into a design detour.

### 6. Relentless verification

This work should continue iteratively until the obvious problems stop surfacing.

- Re-check each area after making changes.
- Do not trust the first pass.
- Keep testing, validating, and re-reading until the current slice feels genuinely tightened.
- Continue until no more meaningful issues are easy to spot within the current workstream.

This rule applies across tests, UX, docs, structure, and UI polish.

## Additional baseline standards

These are not separate vanity tracks. They support the same product goal.

- Improve error handling where failure currently feels silent, confusing, or chaotic.
- Remove or reduce dead weight that actively harms clarity.
- Prefer stable, explicit behavior over hidden magic.
- Watch for over-engineering that does not pay off in the product.
- Keep future extensibility in mind so new features can be added on a clean base later.

## Logging protocol

Use the `logs/` folder as a concise working knowledge base.

- Create Markdown log files for meaningful passes only.
- Do not log every tiny edit.
- Log concrete chunks of work: what was changed, why it mattered, what was verified, and what remains risky.
- Add tags near the top of each log so later review is easy.
- Keep logs useful, not ceremonial.

Suggested structure for each log entry:

```md
# Pass Title

Tags: tests, ux, docs, structure, ui, verification

## What changed

Short summary of the actual work.

## Why it mattered

Why this pass improved product readiness.

## Verification

What was checked, tested, or manually confirmed.

## Remaining concerns

Only real follow-up risk, if any.
```

## Decision rule

When choosing what to do next, prefer the task that most increases product integrity, not the task that feels most sophisticated technically.

## End state

The desired result is a product that:

- can be used without constantly falling apart,
- feels coherent rather than stitched together,
- has enough testing to support change,
- has a structure that future work can build on,
- communicates itself more clearly,
- and is ready for public-facing iteration instead of internal survival mode.
