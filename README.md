# Local Events - ICal

Cloudflare Worker that exposes iCalendar feeds of local events, starting with
garbage and recycling pick-ups.

Request `/{postcode}/{houseNumber}`, for example `/1706AC/20`. The postcode
uses uppercase letters. `Accept-Language` selects `nl` or `en` (default `en`).

Node.js 24.22.1 is selected by `.tool-versions` for asdf.

```sh
npm install
npm test
npm run dev
```

`npm run dev` serves the Worker locally. Deploy with `npm run deploy` after
`npx wrangler login`. Pushes to `main` also deploy from GitHub Actions once
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are repository secrets.

`CALENDAR_TTL` is an optional Worker variable, in seconds. Values are clamped
from one hour to one week. When it is unset, feeds ask clients to refresh daily
via `REFRESH-INTERVAL` / `X-PUBLISHED-TTL` and `Cache-Control: public, max-age=86400`.
A successful feed is stored for that same lifetime, keyed by address, year, and
resolved locale (`en` or `nl`). A repeat request does not fetch Afvalwijzer.
404 and 5xx responses are not stored.

`AFVALWIJZER_ORIGIN`, when set, is the Afvalwijzer site the Worker fetches.
Local verification points it at a fixture server. When it is unset, the Worker
uses `https://www.mijnafvalwijzer.nl`.

The saved page for Stadsbedrijf, Beukenlaan 25, 1701 DA Heerhugowaard is
`test/fixtures/afvalwijzer-1701DA-25.nl.html`. The Worker always requests the
`/nl/` page and translates summaries itself. Golden calendars, with `DTSTAMP`
normalized and stable UIDs kept, are `test/fixtures/afvalwijzer-1701DA-25.nl.ics`
and `test/fixtures/afvalwijzer-1701DA-25.en.ics`. Refresh them with
`.cursor/skills/verify-local-events-ical`.
