// Optional override, in seconds. It is not a Wrangler var: when it is absent
// the Worker uses the one-day default inside calendarTtl. Add it to
// wrangler.jsonc and regenerate types before setting a deployed value.
interface Env {
  CALENDAR_TTL?: string;
  // Local verification points this at a fixture server. Unset uses the public site.
  AFVALWIJZER_ORIGIN?: string;
}

declare module "*.html?raw" {
  const value: string;
  export default value;
}
