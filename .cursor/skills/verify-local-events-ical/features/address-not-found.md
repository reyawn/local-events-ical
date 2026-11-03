# Address not found

A supported postcode whose house number Afvalwijzer does not publish returns 404. The Worker follows Afvalwijzer and treats a redirect to `/error`, or a page with no pickup paragraphs, as a missing address.

## Sub-features

- `missing-address` returns 404 for `/1703EZ/1`.

## How to get to it (user POV)

- Request `GET /1703EZ/1`.

## Driving it with curl

Preconditions:

- Doctor succeeded for this run's fixture server and Worker.
- `AFVALWIJZER_ORIGIN` is the fixture server. `GET /nl/1703EZ/1/` responds `302` to `/error`, and `/error` responds `404` with `test/fixtures/afvalwijzer-1703EZ-1.error.html`.

- **Missing address.** Run `curl -sS -D - http://127.0.0.1:$WORKER_PORT/1703EZ/1`. Status `404` and body `Address not found`. No `Cache-Control` or `ETag`. `check-feed.mjs` records the same response in `$RUN/missing.body`.
- **Not cached.** Run that request twice. Both are `404` `Address not found`. Fixture `/hits` increases by 2, one redirect per request.

## Gotchas

- `1703EZ` is inside Dijk en Waard (`1700`–`1706`). This body is `Address not found`, not `Unknown or unsupported postcode`.
- An Afvalwijzer `5xx`, a network failure, or a page that is not the error page and has pickup paragraphs the Worker cannot read stays a `5xx`.
- The stored error page is the raw `/error` document. The fixture server reproduces the redirect; it does not rewrite that HTML. The Worker does not follow the redirect, so `/error` itself is not a hit.
- The 404 is not stored. A second request for `/1703EZ/1` fetches Afvalwijzer again.
