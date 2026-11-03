#!/usr/bin/env node
// Curl a running Worker and diff nl/en calendars against the golden files.
// node .cursor/skills/verify-local-events-ical/helpers/check-feed.mjs --base http://127.0.0.1:8787 --out /tmp/local-events-ical-verify/run

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  enCalendarName,
  feedPath,
  fixtureFile,
  houseNumber,
  nlCalendarName,
  normalizeCalendar,
  postCode,
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

const checkFeed = async (locale, goldenName) => {
  const response = await request(
    feedPath,
    { "Accept-Language": locale },
    locale,
  );

  if (response.status !== 200) {
    fail(`${locale} status ${response.status}`);
    return;
  }

  const contentType = response.headers.get("content-type");
  if (contentType !== "text/calendar; charset=utf-8") {
    fail(`${locale} content-type ${contentType}`);
  }

  const uids = [...response.body.matchAll(/^UID:(.*)$/gm)].map((match) =>
    match[1]
  );
  const stamps = [...response.body.matchAll(/^DTSTAMP:(.*)$/gm)].map((match) =>
    match[1].trim()
  );

  if (uids.length === 0 || new Set(uids).size !== uids.length) {
    fail(`${locale} UIDs are missing or repeated`);
  }
  if (stamps.length !== uids.length || stamps.some((stamp) =>
    !/^\d{8}T\d{6}Z?$/.test(stamp)
  )) {
    fail(`${locale} DTSTAMP missing or malformed`);
  }

  const actual = normalizeCalendar(response.body, year);
  const golden = readFileSync(fixtureFile(goldenName), "utf8");
  if (actual !== golden) {
    fail(`${locale} calendar does not match ${goldenName}`);
    writeFileSync(path.join(outDir, `${locale}.normalized`), actual);
  }
};

const checkStatus = async (urlPath, status, bodyText, stem) => {
  const response = await request(urlPath, {}, stem);
  if (response.status !== status || response.body !== bodyText) {
    fail(`${urlPath} -> ${response.status} ${JSON.stringify(response.body)}`);
  }
};

await checkFeed("nl", nlCalendarName);
await checkFeed("en", enCalendarName);
await checkStatus("/nope", 400, "Invalid address", "invalid");
await checkStatus(
  `/${postCode.toLowerCase()}/${houseNumber}`,
  400,
  "Invalid address",
  "lowercase",
);
await checkStatus("/1000AA/1", 404, "Unknown or unsupported postcode", "unsupported");

const events = (readFileSync(fixtureFile(nlCalendarName), "utf8").match(
  /^BEGIN:VEVENT$/gm,
) ?? []).length;
const summary = failures.length === 0
  ? `ok ${events} events nl+en from ${feedPath}`
  : failures.map((failure) => `FAIL ${failure}`).join("\n");

writeFileSync(path.join(outDir, "result.txt"), summary + "\n");
console.log(summary);
console.log(`evidence ${outDir}`);

if (failures.length > 0) {
  process.exit(1);
}
