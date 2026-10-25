import i18n from "./i18n.ts";
import type {
  Address,
  EventSource as InternalEventSource,
  FetchPickupEventsOptions,
  LocalizedPickupEvent,
  PickupEvent,
} from "../../types.ts";
import { PickupEventType } from "./types.ts";

export type EventSource = InternalEventSource<PickupEventType>;

const NAME = "Afvalwijzer";
const USER_AGENT = "local-events-ical";

const PickupTypeReverseMap = new Map<string, PickupEventType>([
  ["restafval", PickupEventType.Restafval],
  ["gft", PickupEventType.Gft],
  ["pmd", PickupEventType.Pmd],
]);

const dutchMonthToMonthNumberText = new Map<string, string>([
  ["januari", "01"],
  ["februari", "02"],
  ["maart", "03"],
  ["april", "04"],
  ["mei", "05"],
  ["juni", "06"],
  ["juli", "07"],
  ["augustus", "08"],
  ["september", "09"],
  ["oktober", "10"],
  ["november", "11"],
  ["december", "12"],
]);

export interface PickupParagraph {
  pickupType: string;
  text: string;
}

const addressUrl = (address: Address): string =>
  `https://www.mijnafvalwijzer.nl/nl/${address.postCode}/${
    address.houseNumber.toString(10)
  }/`;

// The first class token is the waste type. Later tokens are layout classes.
const firstClassToken = (classAttribute: string | null): string =>
  classAttribute?.split(/\s+/)[0] ?? "";

export const collectPickupParagraphs = async (
  page: Response,
  year: string,
): Promise<PickupParagraph[]> => {
  const paragraphs: PickupParagraph[] = [];
  let current: PickupParagraph | null = null;

  await new HTMLRewriter()
    .on(`#jaar-${year} p`, {
      element(element) {
        current = {
          pickupType: firstClassToken(element.getAttribute("class")),
          text: "",
        };
        paragraphs.push(current);
      },
      text(chunk) {
        if (current) {
          current.text += chunk.text;
        }
      },
    })
    .transform(page)
    .arrayBuffer();

  return paragraphs;
};

// First line is "weekday day month", matching the previous textContent split.
export const pickupEventFromParagraph = (
  { pickupType, text }: PickupParagraph,
  year: string,
): PickupEvent<PickupEventType> => {
  const type = PickupTypeReverseMap.get(pickupType);
  if (!type) {
    throw new Error(`Unknown pickup type: ${pickupType}`);
  }

  const [
    ,
    monthDayFromOne,
    dutchMonth,
  ] = text.trim().split("\n")[0]?.split(" ") ?? [];

  if (typeof monthDayFromOne !== "string" || typeof dutchMonth !== "string") {
    throw new Error(`Invalid date: ${text}`);
  }

  const monthNumber = dutchMonthToMonthNumberText.get(dutchMonth);
  if (!monthNumber) {
    throw new Error(`Unknown month: ${dutchMonth}`);
  }

  const date = new Date(`${year}-${monthNumber}-${monthDayFromOne}`);
  return { type, date };
};

export const parsePickupEvents = async (
  page: Response,
  year: string,
): Promise<Array<PickupEvent<PickupEventType>>> => {
  const paragraphs = await collectPickupParagraphs(page, year);
  const pickupEvents = paragraphs.map((paragraph) =>
    pickupEventFromParagraph(paragraph, year)
  );

  if (pickupEvents.length === 0) {
    throw new Error("No pickup events found");
  }

  return pickupEvents;
};

const fetchAddressPage = async (address: Address): Promise<Response> => {
  return await fetch(addressUrl(address), {
    headers: {
      "Accept": "text/html",
      "User-Agent": USER_AGENT,
    },
  });
};

const fetchPickupEvents = async (
  address: Address,
  year: string,
): Promise<Array<PickupEvent<PickupEventType>>> => {
  const page = await fetchAddressPage(address);
  return await parsePickupEvents(page, year);
};

const fetchLocalizedPickupEvents = async (
  address: Address,
  year: string,
  { locale }: FetchPickupEventsOptions,
): Promise<Array<LocalizedPickupEvent<PickupEventType>>> => {
  const pickupEvents = await fetchPickupEvents(address, year);

  return pickupEvents.map(({ date, type }) => {
    const localized = {
      title: i18n[locale].pickupEventByType[type].title,
    };

    return { date, localized, type };
  });
};

const eventSource: EventSource = {
  fetchLocalizedPickupEvents,
  name: NAME,
};

export default eventSource;
