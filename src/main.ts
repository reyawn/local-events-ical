import acceptLanguageParser from "accept-language-parser";

import {
  addLocalizedPickupEventsToCalendar,
  createCalendar,
} from "./calendar/index.ts";
import { lookupCityConfigurationForPostCode } from "./cities/index.ts";
import { calendarTtl, DEFAULT_LANGUAGE } from "./config.ts";
import { cachedFeed } from "./feedCache.ts";
import { AddressNotFound, type SupportedLocale } from "./types.ts";

const pathRegex =
  /^\/(?<postCode>\d{4}[A-Z]{2})\/(?<houseNumber>\d{1,5})\/?$/;

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await calendarResponse(request, env);
    } catch (error) {
      if (error instanceof AddressNotFound) {
        return new Response(error.message, { status: 404 });
      }
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
  const ttl = calendarTtl(env.CALENDAR_TTL);

  return cachedFeed(request, locale, year, ttl, async () => {
    const address = {
      houseNumber: parseInt(houseNumber, 10),
      postCode,
    };
    const localizedEventsPerSource = await Promise.all(
      cityConfiguration.eventSources.map(async (eventSource) => ({
        sourceName: eventSource.name,
        events: await eventSource.fetchLocalizedPickupEvents(
          address,
          year,
          { locale, origin: env.AFVALWIJZER_ORIGIN },
        ),
      })),
    );

    const calendar = createCalendar(cityConfiguration, { locale, ttl });

    for (const { sourceName, events } of localizedEventsPerSource) {
      await addLocalizedPickupEventsToCalendar(
        events,
        calendar,
        sourceName,
        address,
      );
    }

    return new Response(calendar.toString(), {
      headers: new Headers({
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="calendar.ics"',
      }),
    });
  });
};

export default worker;
