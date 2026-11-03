import { describe, expect, it } from "vitest";
import { calendarTtl } from "../src/config.ts";

const ONE_HOUR = 60 * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;

describe("calendarTtl", () => {
  it("defaults to one day when unset", () => {
    expect(calendarTtl(undefined)).toBe(ONE_DAY);
  });

  it("clamps values below one hour", () => {
    expect(calendarTtl("60")).toBe(ONE_HOUR);
  });

  it("clamps values above one week", () => {
    expect(calendarTtl(String(ONE_WEEK + 1))).toBe(ONE_WEEK);
  });

  it("keeps a value inside the bounds", () => {
    expect(calendarTtl("7200")).toBe(7200);
  });
});
