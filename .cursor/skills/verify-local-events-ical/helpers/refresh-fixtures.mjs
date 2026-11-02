#!/usr/bin/env node
// Re-download the public Beukenlaan 25 pages and rewrite test/fixtures.
// Run from anywhere: node .cursor/skills/verify-local-events-ical/helpers/refresh-fixtures.mjs

import { writeFileSync } from "node:fs";
import {
  enFixtureName,
  fixtureFile,
  nlFixtureName,
  postCode,
  houseNumber,
} from "./fixtures.mjs";

const pages = [
  {
    name: nlFixtureName,
    locale: "nl",
    url: `https://www.mijnafvalwijzer.nl/nl/${postCode}/${houseNumber}/`,
  },
  {
    name: enFixtureName,
    locale: "en",
    url: `https://www.mijnafvalwijzer.nl/en/${postCode}/${houseNumber}/`,
  },
];

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

const render = ({ locale, url, pageYear, pickups, capturedOn, sameAsNl }) => {
  const lines = [
    `<!-- Source: ${url} captured ${capturedOn}. Page year ${pageYear}. -->`,
    "<!-- Address: Stadsbedrijf, Beukenlaan 25, 1701 DA Heerhugowaard. -->",
  ];

  if (locale === "en") {
    lines.push(
      sameAsNl
        ? "<!-- Pickup lines match the nl page. This /en/ page leaves collection dates in Dutch. -->"
        : "<!-- Pickup lines differ from the nl page captured in the same run. -->",
    );
  }

  lines.push('<div id="jaar-YEAR" class="ophaaldagen">');

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
  return lines.join("\n");
};

const fetchPage = async (url, locale) => {
  const response = await fetch(url, {
    headers: {
      "Accept": "text/html",
      "Accept-Language": locale,
      "User-Agent": "local-events-ical",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return await response.text();
};

const capturedOn = new Date().toISOString().slice(0, 10);
const captured = [];

for (const page of pages) {
  const html = await fetchPage(page.url, page.locale);
  const extracted = extractPickups(html);
  captured.push({ ...page, ...extracted });
}

const nlLines = captured[0].pickups.map((pickup) =>
  `${pickup.type}|${pickup.dateLine}`
);
const enLines = captured[1].pickups.map((pickup) =>
  `${pickup.type}|${pickup.dateLine}`
);
const sameAsNl = nlLines.join("\n") === enLines.join("\n");

for (const page of captured) {
  const file = fixtureFile(page.name);
  writeFileSync(
    file,
    render({ ...page, capturedOn, sameAsNl }),
  );
  console.log(`${file} ${page.pickups.length} pickups`);
}

if (!sameAsNl) {
  console.log("nl and en pickup lines differ");
}
