import afvalwijzerEventSource from "../../eventSources/afvalwijzer/index.ts";
import type { CityConfiguration } from "../../types.ts";

const config: CityConfiguration = {
  eventSources: [afvalwijzerEventSource],
  name: "Dijk en Waard",
  postCodes: [
    [1700, 1706],
    [1720, 1724],
    [1830, 1834],
  ],
};

export default config;
