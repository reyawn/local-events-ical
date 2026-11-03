#!/usr/bin/env node
// Re-download the Beukenlaan 25 nl page and rewrite the HTML fixture.
// The Worker never fetches /en/. After this, re-run the feed check and
// replace the golden .ics files if the normalized calendars changed.
// node .cursor/skills/verify-local-events-ical/helpers/refresh-fixtures.mjs

import { writeFileSync } from "node:fs";
import { fixtureFile, houseNumber, nlFixtureName, postCode } from "./fixtures.mjs";

const url = `https://www.mijnafvalwijzer.nl/nl/${postCode}/${houseNumber}/`;
const tagPattern = /<(\/?)(div|p)\b([^>]*)>/gi;

const extractPickups = (html) => {
  const open = /<div[^>]*id="jaar-(\d{4})"[^>]*>/i.exec(html);
  if (!open) {
    throw new Error("page has no jaar block");
  }

  tagPattern.lastIndex = open.index + open[0].length;
  let depth = 1;
  const pickups = [];

  for (let match = tagPattern.exec(html); match; match = tagPattern.exec(html)) {
    const closing = match[1] === "/";
    const tag = match[2].toLowerCase();
    const attrs = match[3];

    if (tag === "div") {
      if (closing) {
        depth -= 1;
        if (depth === 0) {
          break;
        }
      } else if (!attrs.trim().endsWith("/")) {
        depth += 1;
      }
      continue;
    }

    if (closing || depth < 1) {
      continue;
    }

    const classMatch = /class="([^"]*)"/i.exec(attrs);
    const type = classMatch?.[1].split(/\s+/)[0] ?? "";
    const end = html.indexOf("</p>", tagPattern.lastIndex);
    if (end === -1) {
      throw new Error("unclosed pickup paragraph");
    }

    const inner = html.slice(tagPattern.lastIndex, end);
    const dateMatch = /class="span-line-break"[^>]*>([^<]*)</i.exec(inner);
    const descriptionMatch = /class="afvaldescr[^"]*"[^>]*>([^<]*)</i.exec(inner);
    if (!type || !dateMatch) {
      throw new Error("pickup paragraph is missing a type or date");
    }

    pickups.push({
      type,
      dateLine: dateMatch[1].trim(),
      description: descriptionMatch?.[1].trim() ?? "",
    });
    tagPattern.lastIndex = end + 4;
  }

  if (pickups.length === 0) {
    throw new Error("jaar block has no pickup paragraphs");
  }

  return { pageYear: open[1], pickups };
};

const response = await fetch(url, {
  headers: {
    "Accept": "text/html",
    "Accept-Language": "nl",
    "User-Agent": "local-events-ical",
  },
  redirect: "follow",
});

if (!response.ok) {
  throw new Error(`${url} returned ${response.status}`);
}

const { pageYear, pickups } = extractPickups(await response.text());
const capturedOn = new Date().toISOString().slice(0, 10);
const lines = [
  `<!-- Source: ${url} captured ${capturedOn}. Page year ${pageYear}. -->`,
  "<!-- Address: Stadsbedrijf, Beukenlaan 25, 1701 DA Heerhugowaard. -->",
  '<div id="jaar-YEAR" class="ophaaldagen">',
];

for (const pickup of pickups) {
  lines.push(
    `<p class="${pickup.type}">`,
    `<span class="span-line-break">${pickup.dateLine}</span>`,
    "<br>",
    `<span class="afvaldescr">${pickup.description}</span>`,
    "</p>",
  );
}

lines.push("</div>", "");
const file = fixtureFile(nlFixtureName);
writeFileSync(file, lines.join("\n"));
console.log(`${file} ${pickups.length} pickups`);
console.log(
  "Re-run the feed check. If the normalized calendars differ, replace test/fixtures/afvalwijzer-1701DA-25.nl.ics and afvalwijzer-1701DA-25.en.ics. Keep the emitted UIDs.",
);
