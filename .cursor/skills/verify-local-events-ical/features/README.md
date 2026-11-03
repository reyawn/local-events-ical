# local-events-ical verification map

This directory is the maintained source for verifying the calendar feed. Read the index, then use the feature file as the recipe.

## Baseline preconditions

- Repo root, dependencies installed with `npm ci`, Node from `.tool-versions`.
- Fixture server and `wrangler dev` started as in the skill Launch section, with `AFVALWIJZER_ORIGIN` aimed at that fixture server.
- Evidence directory `$RUN` created for this run. Doctor reports fixture `ok` and Worker `400` on `/nope`.
- Never drive a Worker or fixture server this run did not start.

## Driving conventions

- Start every recipe from that baseline.
- Requests are `curl` or `check-feed.mjs`. Paths and headers in the recipe are literal.
- The feed address is `/1701DA/25` (Stadsbedrijf, Beukenlaan 25, 1701 DA Heerhugowaard).
- Dutch and English are `Accept-Language: nl` and `Accept-Language: en` on that same path.
- Leave `$RUN` in place during cleanup. Kill only PIDs in `$RUN/pids.txt`.

## Proof and skip reporting

- Save the request and the response body, not only the status code.
- Feed proof is the `.body` file plus `result.txt` from `check-feed.mjs`.
- Error proof is the status and the response text.
- Record the feature id and the path used.
- An unreachable path is a failure with the command and the missing precondition. Do not mark it verified through another path.

## Feature entry contract

Each feature file starts with an H1 and one paragraph, then exactly four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with curl`, `Gotchas`.

## Features

- [Calendar feed](./calendar-feed.md) covers the Dutch and English iCal bodies for `/1701DA/25`, including the per-locale cache.
- [Invalid address](./invalid-address.md) covers malformed paths, including a lowercase postcode.
- [Unsupported postcode](./unsupported-postcode.md) covers a postcode outside Dijk en Waard.
