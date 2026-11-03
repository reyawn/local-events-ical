import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(here, "../../../..");
export const postCode = "1701DA";
export const houseNumber = "25";
export const feedPath = `/${postCode}/${houseNumber}`;
export const missingPostCode = "1703EZ";
export const missingHouseNumber = "1";
export const missingFeedPath = `/${missingPostCode}/${missingHouseNumber}`;
export const nlFixtureName = "afvalwijzer-1701DA-25.nl.html";
export const errorFixtureName = "afvalwijzer-1703EZ-1.error.html";
export const nlCalendarName = "afvalwijzer-1701DA-25.nl.ics";
export const enCalendarName = "afvalwijzer-1701DA-25.en.ics";

export const fixtureFile = (name) =>
  path.join(repoRoot, "test", "fixtures", name);

export const readFixtureHtml = (
  name,
  year = new Date().getFullYear(),
) => readFileSync(fixtureFile(name), "utf8").replaceAll("YEAR", String(year));

export const normalizeCalendar = (ics) =>
  ics
    .replace(/\r\n/g, "\n")
    .replace(/^DTSTAMP:.*$/gm, "DTSTAMP:NORMALIZED")
    .replace(
      /^DTSTART(;[^:]*)?:\d{4}/gm,
      (_match, params = "") => `DTSTART${params}:YEAR`,
    )
    .replace(/\s+$/, "") + "\n";
