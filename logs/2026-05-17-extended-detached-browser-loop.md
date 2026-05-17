# Extended Detached Browser Loop

Tags: verification, product, durability

## What changed

- Started a fresh detached production server on `:3056`.
- Reused the authenticated production cookie through the local session proxy on
  `:4056`.
- Ran repeated headless Chrome visits across the main signed-in route family
  instead of only HTTP route loops.

## Why it mattered

The existing durability evidence had become stronger on the HTTP side than on
the browser side. This pass improved the browser-level proof by showing that a
fresh detached build can survive repeated navigation across the same signed-in
route family without poisoning the server.

## Verification

- browser-level route loop:
  - `6` cycles
  - `30` total headless Chrome visits across:
    - `/workspace`
    - files detail
    - tasks
    - persisted chat detail
    - persisted flashcard-set detail
- detached server health:
  - `/login` => `200` immediately
  - `/login` => `200` after `60s`
  - `/login` => `200` after `180s`

## Remaining concerns

- This is the strongest detached browser-loop proof so far, but it still stops
  short of a truly longer-lived interactive browser session or a successful
  provider-backed method round-trip.
