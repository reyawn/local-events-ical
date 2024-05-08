import acceptLanguageParser from "npm:accept-language-parser@1.5.0";

import {
  addLocalizedPickupEventsToCalendar,
  createCalendar,
} from "./calendar/index.ts";
import { lookupCityConfigurationForPostCode } from "./cities/index.ts";
import { DEFAULT_LANGUAGE } from "./config.ts";
import type { SupportedLocale } from "./types.ts";

// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const year = "2024";
  const pathRegex =
    /^\/(?<postCode>\d{4}[A-Z]{2})\/(?<houseNumber>\d{1,5})\/?$/;

  Deno.serve(async (request: Request): Promise<Response> => {
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

    console.log(
      "Request headers: ",
      JSON.stringify([...request.headers.entries()]),
    );

    const acceptLanguageHeaderValue = request.headers.get("Accept-Language") ??
      "";

    const locale = (acceptLanguageParser.pick(
      ["en", "nl"],
      acceptLanguageHeaderValue,
    ) ??
      DEFAULT_LANGUAGE) as SupportedLocale;

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

    const calendar = createCalendar(cityConfiguration, { locale });

    for (const localizedEvents of localizedEventsPerSource) {
      addLocalizedPickupEventsToCalendar(localizedEvents, calendar);
    }

    return new Response(calendar.toString(), {
      headers: new Headers({
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="calendar.ics"',
      }),
    });
  });
}
