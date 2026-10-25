import acceptLanguageParser from "accept-language-parser";

import {
  addLocalizedPickupEventsToCalendar,
  createCalendar,
} from "./calendar/index.ts";
import { lookupCityConfigurationForPostCode } from "./cities/index.ts";
import { calendarTtl, DEFAULT_LANGUAGE } from "./config.ts";
import type { SupportedLocale } from "./types.ts";

const pathRegex =
  /^\/(?<postCode>\d{4}[A-Z]{2})\/(?<houseNumber>\d{1,5})\/?$/;

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await calendarResponse(request, env);
    } catch (error) {
      console.error(JSON.stringify({
        message: "request failed",
        error: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    }
  },
} satisfies ExportedHandler<Env>;

const calendarResponse = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  const url = new URL(request.url);
  const pathParts = url.pathname.match(pathRegex);
  const { postCode, houseNumber } = pathParts?.groups ?? {};

  if (!postCode || !houseNumber) {
    return new Response("Invalid address", { status: 400 });
  }

  const cityConfiguration = lookupCityConfigurationForPostCode(postCode);

  if (!cityConfiguration) {
    return new Response("Unknown or unsupported postcode", { status: 404 });
  }

  const acceptLanguageHeaderValue = request.headers.get("Accept-Language") ??
    "";

  const locale = (acceptLanguageParser.pick(
    ["en", "nl"],
    acceptLanguageHeaderValue,
  ) ??
    DEFAULT_LANGUAGE) as SupportedLocale;

  const year = new Date().getFullYear().toString(10);
  const localizedEventsPerSource = await Promise.all(
    cityConfiguration.eventSources.map((eventSource) =>
      eventSource.fetchLocalizedPickupEvents(
        {
          houseNumber: parseInt(houseNumber, 10),
          postCode,
        },
        year,
        { locale },
      )
    ),
  );

  const calendar = createCalendar(cityConfiguration, {
    locale,
    ttl: calendarTtl(env.CALENDAR_TTL),
  });

  for (const localizedEvents of localizedEventsPerSource) {
    addLocalizedPickupEventsToCalendar(localizedEvents, calendar);
  }

  return new Response(calendar.toString(), {
    headers: new Headers({
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="calendar.ics"',
    }),
  });
};

export default worker;
