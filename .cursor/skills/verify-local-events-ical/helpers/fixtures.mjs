import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(here, "../../../..");
export const postCode = "1701DA";
export const houseNumber = "25";
export const feedPath = `/${postCode}/${houseNumber}`;
export const nlFixtureName = "afvalwijzer-1701DA-25.nl.html";
export const nlCalendarName = "afvalwijzer-1701DA-25.nl.ics";
export const enCalendarName = "afvalwijzer-1701DA-25.en.ics";

export const fixtureFile = (name) =>
  path.join(repoRoot, "test", "fixtures", name);

export const readFixtureHtml = (
  name,
  year = new Date().getFullYear(),
) => readFileSync(fixtureFile(name), "utf8").replaceAll("YEAR", String(year));

export const normalizeCalendar = (ics, year = new Date().getFullYear()) =>
  ics
    .replace(/\r\n/g, "\n")
    .replace(/^UID:.*$/gm, "UID:NORMALIZED")
    .replace(/^DTSTAMP:.*$/gm, "DTSTAMP:NORMALIZED")
    .replaceAll(String(year), "YEAR")
    .replace(/\s+$/, "") + "\n";
