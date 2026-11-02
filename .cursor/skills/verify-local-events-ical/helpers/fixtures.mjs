import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(here, "../../../..");
export const postCode = "1701DA";
export const houseNumber = "25";
export const feedPath = `/${postCode}/${houseNumber}`;
export const nlFixtureName = "afvalwijzer-1701DA-25.nl.html";
export const enFixtureName = "afvalwijzer-1701DA-25.en.html";

export const titles = {
  nl: {
    gft: "Groente, Fruit en Tuinafval",
    pmd: "Plastic, Metalen en Drankkartons",
    restafval: "Restafval",
    calendar: "Dijk en Waard afvalkalender",
  },
  en: {
    gft: "Compostable waste",
    pmd: "Plastic, Metal and Drink cartons",
    restafval: "Garbage",
    calendar: "Dijk en Waard Garbage Calendar",
  },
};

const months = {
  januari: "01",
  februari: "02",
  maart: "03",
  april: "04",
  mei: "05",
  juni: "06",
  juli: "07",
  augustus: "08",
  september: "09",
  oktober: "10",
  november: "11",
  december: "12",
};

export const fixtureFile = (name) =>
  path.join(repoRoot, "test", "fixtures", name);

export const readFixtureHtml = (
  name,
  year = new Date().getFullYear(),
) => readFileSync(fixtureFile(name), "utf8").replaceAll("YEAR", String(year));

export const pickupsFromFixture = (html) => {
  const pickups = [];
  const pattern =
    /<p class="([^"\s]+)"[\s\S]*?<span class="span-line-break">([^<]+)<\/span>/g;

  for (const match of html.matchAll(pattern)) {
    pickups.push({
      type: match[1],
      dateLine: match[2].trim(),
    });
  }

  if (pickups.length === 0) {
    throw new Error("fixture has no pickup paragraphs");
  }

  return pickups;
};

export const expectedEvents = (pickups, locale, year) =>
  pickups.map(({ type, dateLine }) => {
    const [, dayText, monthName] = dateLine.split(/\s+/);
    const month = months[monthName];
    const title = titles[locale][type];

    if (!month || !title || !dayText) {
      throw new Error(`bad fixture line: ${type} ${dateLine}`);
    }

    return {
      date: `${year}${month}${dayText.padStart(2, "0")}`,
      summary: title,
    };
  });
