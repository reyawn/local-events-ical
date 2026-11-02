#!/usr/bin/env node
// Curl a running Worker and compare the feed to the saved Afvalwijzer pages.
// node .cursor/skills/verify-local-events-ical/helpers/check-feed.mjs --base http://127.0.0.1:8787 --out /tmp/local-events-ical-verify/run

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  enFixtureName,
  expectedEvents,
  feedPath,
  houseNumber,
  nlFixtureName,
  pickupsFromFixture,
  postCode,
  readFixtureHtml,
  titles,
} from "./fixtures.mjs";

const { values } = parseArgs({
  options: {
    base: { type: "string", default: "http://127.0.0.1:8787" },
    out: { type: "string", default: "" },
  },
});

const base = values.base.replace(/\/$/, "");
const year = new Date().getFullYear();
const outDir = values.out || path.join(
  "/tmp/local-events-ical-verify",
  `${year}-${Date.now()}`,
);

mkdirSync(outDir, { recursive: true });

const failures = [];

const fail = (message) => {
  failures.push(message);
};

const unfold = (ics) => ics.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");

const unescapeText = (value) =>
  value.replace(/\\([\\;,nN])/g, (_, char) =>
    char === "n" || char === "N" ? "\n" : char
  );

const property = (block, name) => {
  for (const line of block.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator);
    if (key === name || key.startsWith(`${name};`)) {
      return unescapeText(line.slice(separator + 1).trim());
    }
  }
  return undefined;
};

const parseEvents = (ics) => {
  const text = unfold(ics);
  return [...text.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)].map((match) =>
    match[1]
  );
};

const request = async (urlPath, headers, fileStem) => {
  const response = await fetch(`${base}${urlPath}`, { headers });
  const body = await response.text();
  const headerText = [
    `HTTP ${response.status}`,
    ...[...response.headers].map(([key, value]) => `${key}: ${value}`),
    "",
  ].join("\n");

  writeFileSync(path.join(outDir, `${fileStem}.headers`), headerText);
  writeFileSync(path.join(outDir, `${fileStem}.body`), body);
  return { status: response.status, headers: response.headers, body };
};

const nlHtml = readFixtureHtml(nlFixtureName, year);
const enHtml = readFixtureHtml(enFixtureName, year);
const nlPickups = pickupsFromFixture(nlHtml);
const enPickups = pickupsFromFixture(enHtml);
const nlLines = nlPickups.map((pickup) => `${pickup.type}|${pickup.dateLine}`);
const enLines = enPickups.map((pickup) => `${pickup.type}|${pickup.dateLine}`);

if (nlLines.join("\n") !== enLines.join("\n")) {
  fail("nl and en fixtures list different pickup lines");
}

const checkFeed = async (locale) => {
  const response = await request(feedPath, { "Accept-Language": locale }, locale);

  if (response.status !== 200) {
    fail(`${locale} status ${response.status}`);
    return;
  }

  const contentType = response.headers.get("content-type");
  if (contentType !== "text/calendar; charset=utf-8") {
    fail(`${locale} content-type ${contentType}`);
  }

  const text = unfold(response.body);
  const begins = text.match(/^BEGIN:/gm)?.length ?? 0;
  const ends = text.match(/^END:/gm)?.length ?? 0;
  if (begins !== ends) {
    fail(`${locale} BEGIN/END counts ${begins}/${ends}`);
  }
  if (!text.includes("BEGIN:VCALENDAR") || !text.includes("END:VCALENDAR")) {
    fail(`${locale} missing VCALENDAR`);
  }
  if (!/^PRODID:/m.test(text)) {
    fail(`${locale} missing PRODID`);
  }
  if (!/^VERSION:2\.0$/m.test(text)) {
    fail(`${locale} VERSION is not 2.0`);
  }
  if (!/^TIMEZONE-ID:Europe\/Amsterdam$/m.test(text)) {
    fail(`${locale} timezone is not Europe/Amsterdam`);
  }
  if (!text.includes(`NAME:${titles[locale].calendar}`)) {
    fail(`${locale} calendar name missing`);
  }

  const events = parseEvents(text);
  const expected = expectedEvents(nlPickups, locale, year);
  if (events.length !== expected.length) {
    fail(`${locale} event count ${events.length}, fixture ${expected.length}`);
  }

  const uids = [];
  const actual = [];

  for (const event of events) {
    const uid = property(event, "UID");
    const stamp = property(event, "DTSTAMP");
    const start = property(event, "DTSTART");
    const summary = property(event, "SUMMARY");

    if (!uid) {
      fail(`${locale} event missing UID`);
    } else {
      uids.push(uid);
    }
    if (!stamp || !/^\d{8}T\d{6}Z?$/.test(stamp)) {
      fail(`${locale} bad DTSTAMP ${stamp}`);
    }
    if (!start || !/^\d{8}$/.test(start)) {
      fail(`${locale} DTSTART is not an all-day date: ${start}`);
    }
    if (!summary) {
      fail(`${locale} empty SUMMARY`);
    }
    actual.push({ date: start, summary });
  }

  if (new Set(uids).size !== uids.length) {
    fail(`${locale} duplicate UIDs`);
  }

  const key = (event) => `${event.date}|${event.summary}`;
  const actualKeys = actual.map(key);
  const expectedKeys = expected.map(key);
  if (actualKeys.join("\n") !== expectedKeys.join("\n")) {
    fail(`${locale} events do not match the nl fixture`);
    writeFileSync(
      path.join(outDir, `${locale}.expected`),
      expectedKeys.join("\n") + "\n",
    );
  }
};

const checkStatus = async (urlPath, status, bodyText, stem) => {
  const response = await request(urlPath, {}, stem);
  if (response.status !== status || response.body !== bodyText) {
    fail(`${urlPath} -> ${response.status} ${JSON.stringify(response.body)}`);
  }
};

await checkFeed("nl");
await checkFeed("en");
await checkStatus("/nope", 400, "Invalid address", "invalid");
await checkStatus(`/${postCode.toLowerCase()}/${houseNumber}`, 400, "Invalid address", "lowercase");
await checkStatus("/1000AA/1", 404, "Unknown or unsupported postcode", "unsupported");

const summary = failures.length === 0
  ? `ok ${nlPickups.length} events nl+en from ${feedPath}`
  : failures.map((failure) => `FAIL ${failure}`).join("\n");

writeFileSync(path.join(outDir, "result.txt"), summary + "\n");
console.log(summary);
console.log(`evidence ${outDir}`);

if (failures.length > 0) {
  process.exit(1);
}
