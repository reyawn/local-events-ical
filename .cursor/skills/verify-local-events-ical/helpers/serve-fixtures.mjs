#!/usr/bin/env node
// Serve the saved Afvalwijzer pages on localhost for `wrangler dev`.
// node .cursor/skills/verify-local-events-ical/helpers/serve-fixtures.mjs

import { createServer } from "node:http";
import {
  enFixtureName,
  feedPath,
  houseNumber,
  postCode,
  readFixtureHtml,
} from "./fixtures.mjs";

const port = Number(process.env.FIXTURE_PORT ?? 8791);
const year = Number(process.env.FIXTURE_YEAR ?? new Date().getFullYear());
const nlHtml = readFixtureHtml("afvalwijzer-1701DA-25.nl.html", year);
const enHtml = readFixtureHtml(enFixtureName, year);

const routes = new Map([
  [`/nl/${postCode}/${houseNumber}`, nlHtml],
  [`/nl/${postCode}/${houseNumber}/`, nlHtml],
  [`/en/${postCode}/${houseNumber}`, enHtml],
  [`/en/${postCode}/${houseNumber}/`, enHtml],
]);

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;

  if (pathname === "/health") {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("ok\n");
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
  console.log(`nl ${feedPath} -> ${nlHtml.includes(`id="jaar-${year}"`) ? "ready" : "missing year"}`);
});
