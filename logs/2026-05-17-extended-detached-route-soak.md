# Extended Detached Route Soak

Tags: verification, product, durability

## What changed

- Started a fresh detached production server on `:3056`.
- Reused the authenticated production cookie through the local session proxy on
  `:4056`.
- Reconfirmed current browser-level renders for:
  - `/workspace`
  - files detail
  - tasks
  - persisted chat detail
  - persisted flashcard-set detail
- Ran a longer detached mixed-route soak than the current audit previously
  carried.

## Why it mattered

The strongest remaining uncovered product requirement is still longer-lived
interactive durability. This pass does not close that gap completely, but it
meaningfully extends the detached trust window beyond the earlier `30`-request
soak and shows the same signed-in route family surviving a stronger repeat
load.

## Verification

- detached browser proof:
  - `/workspace`
  - `/workspace/files/a14719c1-c1c2-4e41-852b-234b1656f1fd/folder/0de9c432-603a-4c2b-aac7-0264d4a8af56`
  - `/workspace/tasks`
  - `/workspace/chats/ca4a56e3-6482-47f6-822f-56f4d66d69ad`
  - `/workspace/flashcards/654bbf5c-4d98-4a26-acbf-55bc9482bd3f`
- detached route soak:
  - `12` cycles
  - `60` authenticated route GETs
  - max observed route response time: `0.044416s`
- detached server health:
  - `/login` => `200` immediately
  - `/login` => `200` after `60s`
  - `/login` => `200` after `180s`

## Remaining concerns

- This is the strongest detached route-soak proof so far, but it still stops
  short of a truly longer-lived interactive browser session or a successful
  provider-backed method round-trip.
