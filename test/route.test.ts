import {
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import worker from "../src/main.ts";
import enCalendar from "./fixtures/afvalwijzer-1701DA-25.en.ics?raw";
import nlCalendar from "./fixtures/afvalwijzer-1701DA-25.nl.ics?raw";
import nlFixtureTemplate from "./fixtures/afvalwijzer-1701DA-25.nl.html?raw";
import errorPageHtml from "./fixtures/afvalwijzer-1703EZ-1.error.html?raw";
import { network } from "./network.ts";

const year = new Date().getUTCFullYear().toString(10);
const fixtureHtml = nlFixtureTemplate.replaceAll("YEAR", year);

const normalizeCalendar = (ics: string): string =>
  ics
    .replace(/\r\n/g, "\n")
    .replace(/^DTSTAMP:.*$/gm, "DTSTAMP:NORMALIZED")
    .replace(
      /^DTSTART(;[^:]*)?:(\d{4})/gm,
      (_match, params = "") => `DTSTART${params}:YEAR`,
    )
    .replace(/\s+$/, "") + "\n";

const eventUids = (ics: string): string[] => {
  const unfolded = ics.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  return [...unfolded.matchAll(/^UID:(.*)$/gm)].map((match) => match[1].trim());
};

const fetchWorker = async (
  path: string,
  init?: RequestInit,
  bindings: Env = env,
): Promise<Response> => {
  const ctx = createExecutionContext();
  const response = await worker.fetch(
    new Request(`https://example.com${path}`, init),
    bindings,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
};

describe("calendar route", () => {
  beforeEach(() => {
    network.use(
      http.get(
        "https://www.mijnafvalwijzer.nl/nl/:postCode/:houseNumber/",
        ({ request }) => {
          expect(request.headers.get("User-Agent")).toBe("local-events-ical");
          return HttpResponse.html(fixtureHtml);
        },
      ),
    );
  });

  it("rejects a path that is not an address", async () => {
    const response = await fetchWorker("/nope");

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid address");
  });

  it("rejects a lowercase postcode", async () => {
    const response = await fetchWorker("/1701da/25");

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid address");
  });

  it("returns 404 when Afvalwijzer redirects the address to its error page", async () => {
    network.use(
      http.get(
        "https://www.mijnafvalwijzer.nl/nl/1703EZ/1/",
        () =>
          new HttpResponse(null, {
            status: 302,
            headers: { Location: "https://www.mijnafvalwijzer.nl/error" },
          }),
      ),
    );

    const response = await fetchWorker("/1703EZ/1");

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Address not found");
  });

  it("returns 404 when the address page has no pickup schedule", async () => {
    network.use(
      http.get(
        "https://www.mijnafvalwijzer.nl/nl/:postCode/:houseNumber/",
        () => HttpResponse.html(errorPageHtml),
      ),
    );

    const response = await fetchWorker("/1703EZ/1");

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Address not found");
  });

  it("does not treat an unrelated redirect as a missing address", async () => {
    network.use(
      http.get(
        "https://www.mijnafvalwijzer.nl/nl/:postCode/:houseNumber/",
        () =>
          new HttpResponse(null, {
            status: 302,
            headers: {
              Location: "https://www.mijnafvalwijzer.nl/somewhere-else",
            },
          }),
      ),
    );

    await expect(fetchWorker("/1703EZ/1")).rejects.toThrow(
      "Afvalwijzer redirected to https://www.mijnafvalwijzer.nl/somewhere-else",
    );
  });

  it("does not report an Afvalwijzer server error as a missing address", async () => {
    network.use(
      http.get(
        "https://www.mijnafvalwijzer.nl/nl/:postCode/:houseNumber/",
        () => new HttpResponse("unavailable", { status: 503 }),
      ),
    );

    await expect(fetchWorker("/1701DA/25")).rejects.toThrow(
      "Afvalwijzer returned 503",
    );
  });

  it("does not report a network failure as a missing address", async () => {
    network.use(
      http.get(
        "https://www.mijnafvalwijzer.nl/nl/:postCode/:houseNumber/",
        () => HttpResponse.error(),
      ),
    );

    await expect(fetchWorker("/1701DA/25")).rejects.toThrow();
  });

  it("does not report an unparseable pickup page as a missing address", async () => {
    const html =
      `<div id="jaar-${year}"><p class="papier">vrijdag 09 januari</p></div>`;
    network.use(
      http.get(
        "https://www.mijnafvalwijzer.nl/nl/:postCode/:houseNumber/",
        () => HttpResponse.html(html),
      ),
    );

    await expect(fetchWorker("/1701DA/25")).rejects.toThrow(
      "Unknown pickup type: papier",
    );
  });

  it("rejects an unsupported postcode", async () => {
    const response = await fetchWorker("/1000AA/1");

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Unknown or unsupported postcode");
  });

  it("returns a Dutch calendar for a known address", async () => {
    const response = await fetchWorker("/1701DA/25", {
      headers: { "Accept-Language": "nl" },
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/calendar; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="calendar.ics"',
    );
    expect(normalizeCalendar(body)).toBe(nlCalendar);
  });

  it("returns an English calendar and honors a trailing slash", async () => {
    const response = await fetchWorker("/1701DA/25/", {
      headers: { "Accept-Language": "en" },
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(normalizeCalendar(body)).toBe(enCalendar);
  });

  it("reuses one uid per pickup across fetches and languages", async () => {
    const first = await fetchWorker("/1701DA/25", {
      headers: { "Accept-Language": "nl" },
    });
    const second = await fetchWorker("/1701DA/25", {
      headers: { "Accept-Language": "nl" },
    });
    const english = await fetchWorker("/1701DA/25", {
      headers: { "Accept-Language": "en" },
    });
    const firstBody = await first.text();
    const secondBody = await second.text();
    const englishBody = await english.text();
    const dutchUids = eventUids(firstBody);
    const englishUids = eventUids(englishBody);

    expect(normalizeCalendar(firstBody)).toBe(normalizeCalendar(secondBody));
    expect(englishUids).toEqual(dutchUids);
    expect(new Set(dutchUids).size).toBe(dutchUids.length);
    expect(dutchUids[0]).toMatch(/^[0-9a-f]{64}@local-events-ical$/);
  });

  it("embeds a clamped calendar ttl from the worker binding", async () => {
    const response = await fetchWorker("/1701DA/25", undefined, {
      ...env,
      CALENDAR_TTL: "7200",
    });

    expect(await response.text()).toContain("X-PUBLISHED-TTL:PT2H");
  });
});
