#!/usr/bin/env node
// Serve the saved Afvalwijzer page on localhost for `wrangler dev`.
// node .cursor/skills/verify-local-events-ical/helpers/serve-fixtures.mjs

import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import {
  errorFixtureName,
  feedPath,
  fixtureFile,
  houseNumber,
  missingHouseNumber,
  missingPostCode,
  nlFixtureName,
  postCode,
  readFixtureHtml,
} from "./fixtures.mjs";

const port = Number(process.env.FIXTURE_PORT ?? 8791);
const year = Number(process.env.FIXTURE_YEAR ?? new Date().getFullYear());
const nlHtml = readFixtureHtml(nlFixtureName, year);
const errorHtml = readFileSync(fixtureFile(errorFixtureName));

const routes = new Map([
  [`/nl/${postCode}/${houseNumber}`, nlHtml],
  [`/nl/${postCode}/${houseNumber}/`, nlHtml],
]);

const missingPaths = new Set([
  `/nl/${missingPostCode}/${missingHouseNumber}`,
  `/nl/${missingPostCode}/${missingHouseNumber}/`,
]);

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;

  if (pathname === "/health") {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("ok\n");
    return;
  }

  if (missingPaths.has(pathname)) {
    response.writeHead(302, { Location: "/error" });
    response.end();
    return;
  }

  if (pathname === "/error") {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(errorHtml);
    return;
  }

  const body = routes.get(pathname);
  if (!body) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("unknown fixture\n");
    return;
  }

  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(body);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`fixtures listening on http://127.0.0.1:${port}`);
  console.log(
    `nl ${feedPath} -> ${nlHtml.includes(`id="jaar-${year}"`) ? "ready" : "missing year"}`,
  );
  console.log(
    `missing /${missingPostCode}/${missingHouseNumber} -> /error (${errorHtml.length} bytes)`,
  );
});
