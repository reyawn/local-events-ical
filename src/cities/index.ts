import { assertLessOrEqual } from "https://deno.land/std@0.223.0/assert/mod.ts";

import dijkEnWaardCityConfiguration from "./configurations/dijk-en-waard.ts";
import type { CityConfiguration } from "../types.ts";

const postCodePrefixToCityConfiguration = new Map<number, CityConfiguration>();

const cityConfigurations = [
  dijkEnWaardCityConfiguration,
];

for (const cityConfiguration of cityConfigurations) {
  for (const rangeOrNumber of cityConfiguration.postCodes) {
    if (typeof rangeOrNumber === "number") {
      postCodePrefixToCityConfiguration.set(rangeOrNumber, cityConfiguration);
    } else {
      const [from, to] = rangeOrNumber;

      assertLessOrEqual(
        from,
        to,
        `${cityConfiguration.name} post code range ${rangeOrNumber} is invalid.`,
      );

      for (let i = from; i <= to; i++) {
        postCodePrefixToCityConfiguration.set(i, cityConfiguration);
      }
    }
  }
}

export function lookupCityConfigurationForPostCode(
  postCode: string, // Example: "1000AB"
): CityConfiguration | undefined {
  const postCodePrefix = parseInt(postCode.slice(0, 4), 10);

  return postCodePrefixToCityConfiguration.get(postCodePrefix);
}
