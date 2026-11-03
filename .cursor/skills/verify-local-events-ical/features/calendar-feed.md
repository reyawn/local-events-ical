# Calendar feed

A known address returns an iCal feed of that year's pickups. `Accept-Language` switches the calendar name and event summaries between Dutch and English. Dates stay on the Afvalwijzer collection days.

## Sub-features

- `feed-nl` returns the Dutch calendar for `/1701DA/25`.
- `feed-en` returns the English calendar for the same path.
- `feed-dates` matches the golden nl and en calendars for that address.

## How to get to it (user POV)

- Request `GET /1701DA/25` with `Accept-Language: nl`.
- Request `GET /1701DA/25` with `Accept-Language: en`.
- Request `GET /1701DA/25/` (trailing slash) with either header.

## Driving it with curl

Preconditions:

- Doctor succeeded for this run's fixture server and Worker.
- `AFVALWIJZER_ORIGIN` is the fixture server, so the Worker reads `test/fixtures/afvalwijzer-1701DA-25.nl.html`.

- **Dutch feed.** Run `node .cursor/skills/verify-local-events-ical/helpers/check-feed.mjs --base http://127.0.0.1:$WORKER_PORT --out $RUN`. Exit 0. `$RUN/nl.body` is `text/calendar`, `NAME:Dijk en Waard afvalkalender`, and the summaries are `Restafval`, `Groente, Fruit en Tuinafval`, and `Plastic, Metalen en Drankkartons`.
- **English feed.** The same command writes `$RUN/en.body`. `NAME:Dijk en Waard Garbage Calendar`. Summaries are `Garbage`, `Compostable waste`, and `Plastic, Metal and Drink cartons`.
- **Dates.** `result.txt` reports `ok 64 events nl+en from /1701DA/25`. Each body, with `DTSTAMP` normalized, matches `test/fixtures/afvalwijzer-1701DA-25.nl.ics` or `test/fixtures/afvalwijzer-1701DA-25.en.ics`, including the UIDs. Those files include 13 January, 20 January, 22 January, and 29 December.

## Gotchas

- `DTSTAMP` changes on every response. The golden files and the checker replace that line before the diff. UIDs stay.
- The Worker requests `/nl/1701DA/25/` for both languages. English wording comes from `Accept-Language`, which the en golden calendar records.
- A postcode inside 1700–1706 that Afvalwijzer does not publish is not this feature. Those requests currently throw, which is not a successful feed.
