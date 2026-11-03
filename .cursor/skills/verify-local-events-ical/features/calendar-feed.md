# Calendar feed

A known address returns an iCal feed of that year's pickups. `Accept-Language` switches the calendar name and event summaries between Dutch and English. Dates stay on the Afvalwijzer collection days.

## Sub-features

- `feed-nl` returns the Dutch calendar for `/1701DA/25`.
- `feed-en` returns the English calendar for the same path.
- `feed-dates` matches the golden nl and en calendars for that address.
- `feed-cache` serves a second request for the same address and resolved locale without fetching Afvalwijzer again.
- `feed-cache-locale` stores Dutch and English separately. Header variants that resolve to the same locale share one entry.

## How to get to it (user POV)

- Request `GET /1701DA/25` with `Accept-Language: nl`.
- Request `GET /1701DA/25` with `Accept-Language: en`.
- Request `GET /1701DA/25/` (trailing slash) with either header.
- Repeat a request. The second response is the stored feed.

## Driving it with curl

Preconditions:

- Doctor succeeded for this run's fixture server and Worker.
- `AFVALWIJZER_ORIGIN` is the fixture server, so the Worker reads `test/fixtures/afvalwijzer-1701DA-25.nl.html`.

- **Dutch feed.** Run `node .cursor/skills/verify-local-events-ical/helpers/check-feed.mjs --base http://127.0.0.1:$WORKER_PORT --out $RUN`. Exit 0. `$RUN/nl.body` is `text/calendar`, `NAME:Dijk en Waard afvalkalender`, and the summaries are `Restafval`, `Groente, Fruit en Tuinafval`, and `Plastic, Metalen en Drankkartons`.
- **English feed.** The same command writes `$RUN/en.body`. `NAME:Dijk en Waard Garbage Calendar`. Summaries are `Garbage`, `Compostable waste`, and `Plastic, Metal and Drink cartons`.
- **Dates.** `result.txt` reports `ok 64 events nl+en from /1701DA/25`. Each body, with `DTSTAMP` normalized, matches `test/fixtures/afvalwijzer-1701DA-25.nl.ics` or `test/fixtures/afvalwijzer-1701DA-25.en.ics`, including the UIDs. Those files include 13 January, 20 January, 22 January, and 29 December.
- **Cache.** After a cold Worker, run:

  ```sh
  curl -sS -D - -o /dev/null -H 'Accept-Language: nl' "http://127.0.0.1:$WORKER_PORT/1701DA/25"
  curl -sS -D - -o /dev/null -H 'Accept-Language: nl' "http://127.0.0.1:$WORKER_PORT/1701DA/25"
  curl -sS -D - -o /dev/null -H 'Accept-Language: en' "http://127.0.0.1:$WORKER_PORT/1701DA/25"
  curl -sS -D - -o /dev/null -H 'Accept-Language: en' "http://127.0.0.1:$WORKER_PORT/1701DA/25"
  curl -fsS "http://127.0.0.1:$FIXTURE_PORT/hits"
  ```

  Both locales answer `200` with `content-type: text/calendar; charset=utf-8` and `cache-control: public, max-age=86400` (or the clamped `CALENDAR_TTL` when that variable is set). `/hits` is `2`: one Dutch scrape and one English scrape. A second `nl` or `en` request does not increase it. `etag` is present. Sending that value back as `If-None-Match` answers `304`.

## Gotchas

- `DTSTAMP` is the time the feed was generated. A cache hit repeats that value until the entry expires. The golden files and the checker replace that line before the diff. UIDs stay.
- The Worker requests `/nl/1701DA/25/` for both languages, once per locale per cache lifetime. English wording comes from the resolved locale, which the en golden calendar records. The cache key is that locale, `en` or `nl`, not the raw `Accept-Language` header. `nl` and `nl-NL,nl;q=0.9,en;q=0.8` share an entry. `en` is the default when the header is missing or names neither language.
- `GET /hits` on the fixture server counts Afvalwijzer pages served. `/health` does not.
- A 404 or a scrape that finds no pickups is not stored. The next request fetches again.
- A postcode inside 1700–1706 that Afvalwijzer does not publish is not this feature. Those requests currently throw, which is not a successful feed.
