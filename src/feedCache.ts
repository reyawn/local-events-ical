import type { SupportedLocale } from "./types.ts";

const opaqueTag = (value: string): string => value.trim().replace(/^W\//i, "");

const ifNoneMatchSatisfied = (header: string, etag: string): boolean => {
  const expected = opaqueTag(etag);
  return header.split(",").some((candidate) => {
    const tag = opaqueTag(candidate);
    return tag === "*" || tag === expected;
  });
};

const entityTag = async (body: ArrayBuffer): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", body);
  const hex = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `"${hex}"`;
};

export const feedCacheUrl = (
  requestUrl: string,
  locale: SupportedLocale,
  year: string,
): string => {
  const url = new URL(requestUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${year}/${locale}`;
  url.search = "";
  url.hash = "";
  return url.toString();
};

const feedCacheRequest = (
  request: Request,
  locale: SupportedLocale,
  year: string,
): Request =>
  new Request(feedCacheUrl(request.url, locale, year), { method: "GET" });

const notModified = (
  request: Request,
  response: Response,
): Response | undefined => {
  const etag = response.headers.get("ETag");
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (!etag || !ifNoneMatch || !ifNoneMatchSatisfied(ifNoneMatch, etag)) {
    return undefined;
  }

  const headers = new Headers();
  headers.set("ETag", etag);
  const cacheControl = response.headers.get("Cache-Control");
  if (cacheControl) {
    headers.set("Cache-Control", cacheControl);
  }
  return new Response(null, { status: 304, headers });
};

export const cachedFeed = async (
  request: Request,
  locale: SupportedLocale,
  year: string,
  ttl: number,
  load: () => Promise<Response>,
): Promise<Response> => {
  if (request.method !== "GET") {
    return load();
  }

  const cacheKey = feedCacheRequest(request, locale, year);
  const cached = await caches.default.match(cacheKey);
  if (cached) {
    return notModified(request, cached) ?? cached;
  }

  const response = await load();
  if (response.status !== 200) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${ttl}`);
  const body = await response.arrayBuffer();
  headers.set("ETag", await entityTag(body));
  const stored = new Response(body, { status: 200, headers });
  await caches.default.put(cacheKey, stored.clone());
  return notModified(request, stored) ?? stored;
};
