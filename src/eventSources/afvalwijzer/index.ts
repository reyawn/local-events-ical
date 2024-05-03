// @deno-types="npm:@types/jsdom@21.1.6"
import { JSDOM } from "npm:jsdom@24.0.0";

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

const fetchAddressHtml = async (address: Address): Promise<string> => {
  const url = `https://www.mijnafvalwijzer.nl/nl/${address.postCode}/${
    address.houseNumber.toString(10)
  }/`;
  const response = await fetch(url);
  return await response.text();
};

const loadAddressDom = async (address: Address): Promise<JSDOM> => {
  const html = await fetchAddressHtml(address);
  return new JSDOM(html);
};

const fetchPickupEvents = async (
  address: Address,
  year: string,
): Promise<Array<PickupEvent<PickupEventType>>> => {
  const dom = await loadAddressDom(address);

  const pickupDateParagraphElementNodeList = dom.window.document
    .querySelectorAll(
      `#jaar-${year} p`,
    ) as NodeListOf<HTMLParagraphElement>;

  const pickupEvents: PickupEvent<PickupEventType>[] = [
    ...pickupDateParagraphElementNodeList,
  ].map((
    { classList: [pickupType], textContent }: HTMLParagraphElement,
  ): PickupEvent<PickupEventType> => {
    const type = PickupTypeReverseMap.get(pickupType);
    if (!type) {
      throw new Error(`Unknown pickup type: ${pickupType}`);
    }

    const [
      ,
      monthDayFromOne,
      dutchMonth,
    ] = textContent?.trim().split("\n")[0].split(" ") ?? [];

    if (typeof monthDayFromOne !== "string" || typeof dutchMonth !== "string") {
      throw new Error(`Invalid date: ${textContent}`);
    }

    const monthNumber = dutchMonthToMonthNumberText.get(dutchMonth);
    if (!monthNumber) {
      throw new Error(`Unknown month: ${dutchMonth}`);
    }

    const date = new Date(`${year}-${monthNumber}-${monthDayFromOne}`);
    return { type, date };
  });

  if (pickupEvents.length === 0) {
    throw new Error("No pickup events found");
  }

  return pickupEvents;
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
