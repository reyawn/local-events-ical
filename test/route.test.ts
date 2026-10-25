import {
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import worker from "../src/main.ts";
import fixtureTemplate from "./fixtures/address.html?raw";
import { network } from "./network.ts";

const year = new Date().getUTCFullYear().toString(10);
const fixtureHtml = fixtureTemplate.replaceAll("YEAR", year);

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
    const response = await fetchWorker("/1706ac/20");

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid address");
  });

  it("rejects an unsupported postcode", async () => {
    const response = await fetchWorker("/1000AA/1");

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Unknown or unsupported postcode");
  });

  it("returns a Dutch calendar for a known address", async () => {
    const response = await fetchWorker("/1706AC/20", {
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
    expect(body).toContain("METHOD:REQUEST");
    expect(body).toContain("Dijk en Waard afvalkalender");
    expect(body).toContain("SUMMARY:Restafval");
    expect(body).toContain("SUMMARY:Groente\\, Fruit en Tuinafval");
    expect(body).toContain("SUMMARY:Plastic\\, Metalen en Drankkartons");
    expect(body).toContain(`DTSTART;VALUE=DATE:${year}0109`);
    expect(body).toContain(`DTSTART;VALUE=DATE:${year}0112`);
    expect(body).toContain(`DTSTART;VALUE=DATE:${year}0116`);
    expect(body).toContain("X-PUBLISHED-TTL:P1D");
  });

  it("returns an English calendar and honors a trailing slash", async () => {
    const response = await fetchWorker("/1706AC/20/", {
      headers: { "Accept-Language": "en" },
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("Dijk en Waard Garbage Calendar");
    expect(body).toContain("SUMMARY:Garbage");
    expect(body).toContain("SUMMARY:Compostable waste");
    expect(body).toContain("SUMMARY:Plastic\\, Metal and Drink cartons");
  });

  it("embeds a clamped calendar ttl from the worker binding", async () => {
    const response = await fetchWorker("/1706AC/20", undefined, {
      ...env,
      CALENDAR_TTL: "7200",
    });

    expect(await response.text()).toContain("X-PUBLISHED-TTL:PT2H");
  });
});
