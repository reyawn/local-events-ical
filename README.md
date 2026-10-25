# Local Events - ICal

Cloudflare Worker that exposes iCalendar feeds of local events, starting with
garbage and recycling pick-ups.

Request `/{postcode}/{houseNumber}`, for example `/1706AC/20`. The postcode
uses uppercase letters. `Accept-Language` selects `nl` or `en` (default `en`).

Node.js 24.14.1 is selected by `.tool-versions` for asdf.

```sh
npm install
npm test
npm run dev
```

`npm run dev` serves the Worker locally. Deploy with `npm run deploy` after
`npx wrangler login`. Pushes to `main` also deploy from GitHub Actions once
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are repository secrets.

`CALENDAR_TTL` is an optional Worker variable, in seconds. Values are clamped
from one hour to one week. When it is unset, feeds ask clients to refresh daily.
