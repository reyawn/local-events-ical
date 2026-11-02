# Invalid address

A path that is not an uppercase postcode plus a numeric house number is rejected before any upstream fetch.

## Sub-features

- `invalid-path` rejects a non-address path.
- `invalid-case` rejects a lowercase postcode.

## How to get to it (user POV)

- Request `GET /nope`.
- Request `GET /1701da/25`.

## Driving it with curl

Preconditions:

- Doctor succeeded for this run's Worker.

- **Bad path.** Run `curl -sS -D - http://127.0.0.1:$WORKER_PORT/nope`. Status `400` and body `Invalid address`. `check-feed.mjs` records the same response in `$RUN/invalid.body`.
- **Lowercase postcode.** Run `curl -sS -D - http://127.0.0.1:$WORKER_PORT/1701da/25`. Status `400` and body `Invalid address`. `check-feed.mjs` records it in `$RUN/lowercase.body`.

## Gotchas

- The route does not uppercase the postcode. `1701da` is a 400, not a feed.
- A house-number suffix such as `1A` is also a 400. The library at Parelhof 1A cannot be requested on this route.
- `400` does not call Afvalwijzer. A fixture-server failure must not be blamed on this path.
