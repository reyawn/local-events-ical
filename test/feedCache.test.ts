import { describe, expect, it } from "vitest";
import { cachedFeed } from "../src/feedCache.ts";
import { SupportedLocale } from "../src/types.ts";

const year = new Date().getUTCFullYear().toString(10);

describe("cachedFeed", () => {
  it("does not store a 404 or a 500", async () => {
    const request = new Request("https://example.com/cache-probe/9");
    let loads = 0;
    const load = (status: number, body: string) => async () => {
      loads += 1;
      return new Response(body, { status });
    };

    const missing = await cachedFeed(
      request,
      SupportedLocale.nl,
      year,
      3600,
      load(404, "missing"),
    );
    const missingAgain = await cachedFeed(
      request,
      SupportedLocale.nl,
      year,
      3600,
      load(404, "still missing"),
    );
    const failed = await cachedFeed(
      request,
      SupportedLocale.en,
      year,
      3600,
      load(500, "failed"),
    );
    const failedAgain = await cachedFeed(
      request,
      SupportedLocale.en,
      year,
      3600,
      load(500, "still failed"),
    );

    expect(loads).toBe(4);
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe("missing");
    expect(missingAgain.status).toBe(404);
    expect(await missingAgain.text()).toBe("still missing");
    expect(failed.status).toBe(500);
    expect(await failed.text()).toBe("failed");
    expect(failedAgain.status).toBe(500);
    expect(await failedAgain.text()).toBe("still failed");
    expect(missing.headers.get("Cache-Control")).toBeNull();
    expect(failed.headers.get("Cache-Control")).toBeNull();
  });
});
