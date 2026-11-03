---
name: verify-local-events-ical
description: Drive the local-events-ical Worker with wrangler and curl, and prove the iCal feed for Beukenlaan 25 against saved Afvalwijzer pages. Use when changing the calendar route, pickup parsing, or nl/en wording.
---

# Verify local-events-ical

The user-facing surface is `GET /{postcode}/{houseNumber}`. It returns a `text/calendar` feed of garbage and recycling pickups. `Accept-Language` selects `nl` or `en` (default `en`). This skill checks that feed on a local Worker. The upstream pages are the fixtures, not the live Afvalwijzer site.

The address under test is the municipal depot Stadsbedrijf, Beukenlaan 25, 1701 DA Heerhugowaard (`/1701DA/25`). It sits in the Dijk en Waard postcode list. Do not substitute a home address.

Node is the version in `.tool-versions`. Install with `npm ci` from the repo root before the first launch.

## Launch

Two processes, both bound to `127.0.0.1`. Pick a free pair if the defaults are taken. Do not point `AFVALWIJZER_ORIGIN` at the public site during this check.

```sh
RUN=/tmp/local-events-ical-verify/$(date +%Y%m%dT%H%M%S)
mkdir -p "$RUN"
FIXTURE_PORT=8791
WORKER_PORT=8787

node .cursor/skills/verify-local-events-ical/helpers/serve-fixtures.mjs \
  > "$RUN/fixture.log" 2>&1 &
echo $! >> "$RUN/pids.txt"

npx wrangler dev --local --ip 127.0.0.1 --port "$WORKER_PORT" \
  --inspector-port 9229 \
  --var "AFVALWIJZER_ORIGIN:http://127.0.0.1:$FIXTURE_PORT" \
  --show-interactive-dev-session=false \
  > "$RUN/wrangler.log" 2>&1 &
echo $! >> "$RUN/pids.txt"
```

`serve-fixtures.mjs` replaces the `jaar-YEAR` id with the current calendar year. Ready when `fixture.log` contains `fixtures listening on http://127.0.0.1:8791` and `wrangler.log` contains `Ready on http://127.0.0.1:8787`.

A second run needs its own `FIXTURE_PORT`, `WORKER_PORT`, and `--inspector-port`. Do not share a Worker or fixture server between runs.

## Doctor

Run this before the first request, and again after a failed drive.

```sh
curl -fsS "http://127.0.0.1:$FIXTURE_PORT/health"
curl -sS -D - -o /dev/null "http://127.0.0.1:$WORKER_PORT/nope"
```

The fixture server answers `ok`. The Worker answers `400` with `Invalid address`. Confirm both PIDs in `$RUN/pids.txt` are the processes you started. Stop if `/nope` is not that 400.

## Drive

`check-feed.mjs` curls the feed in `nl` and `en`, then the 400 and 404 paths. It diffs each calendar, after replacing `DTSTAMP`, with `test/fixtures/afvalwijzer-1701DA-25.nl.ics` and `test/fixtures/afvalwijzer-1701DA-25.en.ics`. UIDs stay in the diff. The Worker only fetches the `/nl/` HTML fixture. English summaries come from `Accept-Language`. `/1703EZ/1` is the address Afvalwijzer does not publish: the fixture server answers that path with a redirect to `/error`, and the checker expects `404` `Address not found`.

```sh
node .cursor/skills/verify-local-events-ical/helpers/check-feed.mjs \
  --base "http://127.0.0.1:$WORKER_PORT" \
  --out "$RUN"
```

Feature recipes are under `features/`. Drive the file that matches the change. One feature is enough for a passing proof; a change that touches several features needs each of those files.

## Evidence

`check-feed.mjs` writes the response headers and bodies into `--out` (`$RUN` above): `nl.body`, `en.body`, `invalid.body`, `lowercase.body`, `unsupported.body`, `missing.body`, and `result.txt`. A passing run prints `ok 64 events nl+en from /1701DA/25` and exits 0. Keep that directory. The pass means the normalized bodies match the golden `.ics` files, and `/1703EZ/1` is `404` with body `Address not found`.

## Cleanup

Kill only the PIDs recorded in `$RUN/pids.txt`. Leave `$RUN` in place, including `result.txt` and the `.body` files.

```sh
while read -r pid; do kill "$pid" 2>/dev/null || true; done < "$RUN/pids.txt"
```

Do not delete `$RUN`.

## Helpers

- `node .cursor/skills/verify-local-events-ical/helpers/serve-fixtures.mjs` serves the fixtures. `FIXTURE_PORT` defaults to `8791`. `GET /hits` is how many Afvalwijzer address requests it has served, including the `/1703EZ/1` redirect. `/health` and `/error` do not count.
- `node .cursor/skills/verify-local-events-ical/helpers/check-feed.mjs --base http://127.0.0.1:8787 --out <dir>` asserts the feed and writes evidence.
- `node .cursor/skills/verify-local-events-ical/helpers/refresh-fixtures.mjs` re-downloads the nl Afvalwijzer page and rewrites `test/fixtures/afvalwijzer-1701DA-25.nl.html`. It also stores the raw `/error` document for `/1703EZ/1` at `test/fixtures/afvalwijzer-1703EZ-1.error.html`. The Worker does not fetch `/en/`. Run it when the municipal calendar changes, then rerun this skill. The schedule page is Stadsbedrijf, Beukenlaan 25. The script keeps the `jaar` pickup paragraphs and writes `jaar-YEAR` so the year id can be substituted. If the normalized calendars differ, replace `test/fixtures/afvalwijzer-1701DA-25.nl.ics` and `test/fixtures/afvalwijzer-1701DA-25.en.ics` with the checker output (`DTSTAMP` normalized, `DTSTART` year written as `YEAR`, UIDs left as emitted). Update the count named in `features/calendar-feed.md` when the pickup count changes.

`/maintain-verification-skill` is the upkeep loop when routes or fixture shape change.
