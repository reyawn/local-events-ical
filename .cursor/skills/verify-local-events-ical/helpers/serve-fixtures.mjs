#!/usr/bin/env node
// Serve the saved Afvalwijzer page on localhost for `wrangler dev`.
// node .cursor/skills/verify-local-events-ical/helpers/serve-fixtures.mjs

import { createServer } from "node:http";
import {
  feedPath,
  houseNumber,
  nlFixtureName,
  postCode,
  readFixtureHtml,
} from "./fixtures.mjs";

const port = Number(process.env.FIXTURE_PORT ?? 8791);
const year = Number(process.env.FIXTURE_YEAR ?? new Date().getFullYear());
const nlHtml = readFixtureHtml(nlFixtureName, year);
let hits = 0;

const routes = new Map([
  [`/nl/${postCode}/${houseNumber}`, nlHtml],
  [`/nl/${postCode}/${houseNumber}/`, nlHtml],
]);

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;

  if (pathname === "/health") {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("ok\n");
    return;
  }

  if (pathname === "/hits") {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(`${hits}\n`);
    return;
  }

  const body = routes.get(pathname);
  if (!body) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("unknown fixture\n");
    return;
  }

  hits += 1;
  console.log(`hit ${hits} ${pathname}`);
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(body);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`fixtures listening on http://127.0.0.1:${port}`);
  console.log(
    `nl ${feedPath} -> ${nlHtml.includes(`id="jaar-${year}"`) ? "ready" : "missing year"}`,
  );
});
