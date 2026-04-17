# Phase 7 Audit

## Confusion detection audit

There is already a rough stage-1 signal in the repo:

- `apps/web/src/lib/session-summaries.ts` uses transcript regexes to detect likely confusion or a learning gap.
- The session-summary prompt also asks the model to infer misconception candidates from the completed exchange.
- That said, the current implementation still runs as one summarization job rather than a standalone confusion-detection stage with its own interface and metrics.

## Misconception verification audit

The current verification step is implicit rather than explicit:

- `summaryOutputSchema` includes `misconceptionCandidates` with `concept`, `subject`, `topic`, `reason`, and `confidence`.
- `persistAutomaticMisconceptions()` keeps candidates only above a numeric confidence threshold and only de-duplicates by subject/topic/concept.
- `packages/database/src/flashcard-review-events.ts` emits a separate FSRS-based signal, but it still lands in the same misconception table.
- There is no evidence span, source-class, or provenance-root field to support an actual verification stage.

## Evaluation audit

I did not find a held-out evaluation loop for this pipeline:

- No precision/recall harness exists for confusion detection versus verified misconception classification.
- Runtime logging covers candidate creation, rejection, promotion, and decay, but not stage-1/2 accuracy.
- The current logs are enough to inspect outcomes manually, but not enough to validate that verification is doing distinct work.

Downstream assumption:

- A real two-stage classifier will need a separate confusion artifact, a verification artifact, and labeled eval data, otherwise it will just repackage the current heuristic thresholding.
