# Unsupported postcode

A well-formed postcode outside the configured cities returns 404 and does not fetch a calendar.

## Sub-features

- `unknown-prefix` rejects a postcode prefix that no city claims.

## How to get to it (user POV)

- Request `GET /1000AA/1`.

## Driving it with curl

Preconditions:

- Doctor succeeded for this run's Worker.

- **Outside the city list.** Run `curl -sS -D - http://127.0.0.1:$WORKER_PORT/1000AA/1`. Status `404` and body `Unknown or unsupported postcode`. `check-feed.mjs` records it in `$RUN/unsupported.body`.

## Gotchas

- `1000AA` is outside Dijk en Waard (`1700`–`1706`, `1720`–`1724`, `1830`–`1834`). `1707AA` is also 404.
- A prefix inside that list whose house number Afvalwijzer does not publish, such as `/1703EZ/1`, is not this feature. The Worker fetches it and currently responds 500 when the page has no pickup paragraphs. Do not record that 500 as a passing 404 check.
