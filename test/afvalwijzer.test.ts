import { describe, expect, it } from "vitest";
import fixtureTemplate from "./fixtures/address.html?raw";
import {
  parsePickupEvents,
  pickupEventFromParagraph,
} from "../src/eventSources/afvalwijzer/index.ts";
import { PickupEventType } from "../src/eventSources/afvalwijzer/types.ts";

const year = new Date().getUTCFullYear().toString(10);

const fixtureHtml = (): string => fixtureTemplate.replaceAll("YEAR", year);

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

describe("Afvalwijzer parser", () => {
  it("reads pickup dates from the year section", async () => {
    const events = await parsePickupEvents(new Response(fixtureHtml()), year);

    expect(events.map(({ type, date }) => [type, isoDate(date)])).toEqual([
      [PickupEventType.Pmd, `${year}-01-09`],
      [PickupEventType.Restafval, `${year}-01-12`],
      [PickupEventType.Gft, `${year}-01-16`],
    ]);
  });

  it("maps a paragraph from its first class token and first line", () => {
    const event = pickupEventFromParagraph(
      {
        pickupType: "gft",
        text: "vrijdag 16 januari\nGroente-, fruit- en tuinafval",
      },
      year,
    );

    expect(event.type).toBe(PickupEventType.Gft);
    expect(isoDate(event.date)).toBe(`${year}-01-16`);
  });

  it("throws when the year section has no pickup paragraphs", async () => {
    const html = `<div id="jaar-${year}"></div>`;

    await expect(parsePickupEvents(new Response(html), year)).rejects.toThrow(
      "No pickup events found",
    );
  });

  it("throws when the first class token is an unknown waste type", () => {
    expect(() =>
      pickupEventFromParagraph(
        { pickupType: "papier", text: "vrijdag 09 januari" },
        year,
      )
    ).toThrow("Unknown pickup type: papier");
  });
});
