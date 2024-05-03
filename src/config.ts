import { I18nSupportedLocale } from "./types.ts";

const ONE_HOUR = 60 * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;

const stringToNumber = (string?: string): number | undefined =>
  string === undefined ? undefined : parseInt(string, 10);

const numberWithinBounds = (
  number: number,
  { max, min }: { min: number; max: number },
): number | undefined => {
  if (number < min) {
    return min;
  }

  if (number > max) {
    return max;
  }

  return number;
};

export const CALENDAR_TTL = numberWithinBounds(
  stringToNumber(Deno.env.get("CALENDAR_TTL")) ?? ONE_DAY,
  { min: ONE_HOUR, max: ONE_WEEK },
);

export const DEFAULT_LANGUAGE: I18nSupportedLocale = "en";
