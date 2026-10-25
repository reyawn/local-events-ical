import { SupportedLocale } from "./types.ts";

const ONE_HOUR = 60 * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;

const stringToNumber = (string?: string): number | undefined =>
  string === undefined ? undefined : parseInt(string, 10);

const numberWithinBounds = (
  number: number,
  { max, min }: { min: number; max: number },
): number => {
  if (number < min) {
    return min;
  }

  if (number > max) {
    return max;
  }

  return number;
};

// Workers pass bindings on the request. An absent value keeps the one-day default.
export const calendarTtl = (raw?: string): number =>
  numberWithinBounds(stringToNumber(raw) ?? ONE_DAY, {
    min: ONE_HOUR,
    max: ONE_WEEK,
  });

export const DEFAULT_LANGUAGE = SupportedLocale.en;
